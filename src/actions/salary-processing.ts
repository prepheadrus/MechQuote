/**
 * Automatic Salary Processing Actions
 *
 * Otomatik maaş tahakkuku ve ödeme işlemleri
 */

'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SalaryProcessing');

export interface SalaryProcessingResult {
    personnelId: string;
    personnelName: string;
    amount?: number;
    status: 'success' | 'skipped' | 'error';
    reason?: string;
    error?: string;
}

/**
 * Calculate and create salary transactions for all active personnel
 * 
 * @param month - Month (1-12)
 * @param year - Year (e.g., 2026)
 * @param salaryAmount - Optional: Override default salary amount
 */
export async function processMonthlySalaries(
  month: number,
  year: number,
  salaryAmount?: number
) {
  try {
    const results: SalaryProcessingResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Get all active personnel
    const personnel = await prisma.personnel.findMany({
      where: { isDeleted: false,  status: 'Aktif' }
    });

    logger.info(`Toplam ${personnel.length} personel için maaş işleniyor...`);

    // Process each personnel
    for (const p of personnel) {
      try {
        const salary = salaryAmount || p.dailyRate || 0;

        if (salary <= 0) {
          results.push({
            personnelId: p.id,
            personnelName: p.name,
            status: 'skipped',
            reason: 'Maaş tutarı 0'
          });
          continue;
        }

        // Check if salary already processed for this month
        const existingTransaction = await prisma.personnelTransaction.findFirst({
          where: { isDeleted: false,
            personnelId: p.id,
            category: 'Maaş',
            date: {
              gte: new Date(year, month - 1, 1),
              lt: new Date(year, month, 0)
            }
          }
        });

        if (existingTransaction) {
          results.push({
            personnelId: p.id,
            personnelName: p.name,
            status: 'skipped',
            reason: 'Maaş zaten işlenmiş'
          });
          continue;
        }

        // Create salary transaction
        await prisma.personnelTransaction.create({
          data: {
            personnelId: p.id,
            amount: salary,
            type: 'Payment',
            category: 'Maaş',
            description: `${p.name} - Maaş ${month}/${year}`,
            date: new Date(year, month - 1, 1) // First day of month
          }
        });

        // Update personnel balance (positive = they owe us work)
        await prisma.personnel.update({
          where: { id: p.id },
          data: {
            balance: {
              increment: salary
            }
          }
        });

        successCount++;
        results.push({
          personnelId: p.id,
          personnelName: p.name,
          amount: salary,
          status: 'success'
        });

        logger.info(`Maaş işlendi: ${p.name} - ${salary} TL`);
      } catch (error: any) {
        errorCount++;
        results.push({
          personnelId: p.id,
          personnelName: p.name,
          status: 'error',
          error: error.message
        });
        logger.error(`Maaş işleme hatası (${p.name}):`, error);
      }
    }

    revalidatePath('/personnel');
    revalidatePath('/cash-book');

    logger.info(`Maaş işlemi tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);

    return {
      success: errorCount === 0,
      message: `${successCount} personel için maaş işlendi, ${errorCount} hata`,
      results,
      summary: {
        total: personnel.length,
        success: successCount,
        skipped: personnel.length - successCount - errorCount,
        error: errorCount,
        totalAmount: results
          .filter((r) => r.status === 'success')
          .reduce((sum, r) => sum + (r.amount || 0), 0)
      }
    };
  } catch (error: any) {
    logger.error('Toplu maaş hatası:', error);
    return {
      success: false,
      error: error.message || 'Maaş işlenirken hata oluştu'
    };
  }
}

/**
 * Get salary processing status for a specific month
 */
export async function getSalaryProcessingStatus(month: number, year: number) {
  try {
    const transactions = await prisma.personnelTransaction.findMany({
      where: { isDeleted: false,
        category: 'Maaş',
        date: {
          gte: new Date(year, month - 1, 1),
          lt: new Date(year, month, 0)
        }
      },
      include: {
        personnel: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    const activePersonnel = await prisma.personnel.count({
      where: { isDeleted: false,  status: 'Aktif' }
    });

    const processedCount = transactions.length;
    const remainingCount = activePersonnel - processedCount;
    const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      success: true,
      data: {
        month,
        year,
        activePersonnel,
        processedCount,
        remainingCount,
        totalAmount,
        transactions: transactions.map(t => ({
          personnelId: t.personnelId,
          personnelName: t.personnel.name,
          amount: Math.abs(t.amount),
          date: t.date,
          processed: true
        }))
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pending salaries (active personnel without salary for current month)
 */
export async function getPendingSalaries(
  month?: number,
  year?: number,
  defaultSalary?: number // Default salary amount if not set per personnel
) {
  try {
    const now = new Date();
    const targetMonth = month || (now.getMonth() + 1);
    const targetYear = year || now.getFullYear();

    const activePersonnel = await prisma.personnel.findMany({
      where: { isDeleted: false,  status: 'Aktif' },
      select: {
        id: true,
        name: true,
        balance: true
      }
    });

    const processedPersonnelIds = await prisma.personnelTransaction.findMany({
      where: { isDeleted: false,
        category: 'Maaş',
        date: {
          gte: new Date(targetYear, targetMonth - 1, 1),
          lt: new Date(targetYear, targetMonth, 0)
        }
      },
      select: {
        personnelId: true
      }
    });

    const processedIds = new Set(processedPersonnelIds.map(p => p.personnelId));
    const pendingPersonnel = activePersonnel.filter(p => !processedIds.has(p.id));

    const salaryAmount = defaultSalary || 0;
    const totalPendingAmount = pendingPersonnel.length * salaryAmount;

    return {
      success: true,
      data: {
        month: targetMonth,
        year: targetYear,
        totalPending: pendingPersonnel.length,
        totalAmount: totalPendingAmount,
        personnel: pendingPersonnel.map(p => ({
          personnelId: p.id,
          personnelName: p.name,
          salary: salaryAmount,
          currentBalance: p.balance,
          pending: true
        }))
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
