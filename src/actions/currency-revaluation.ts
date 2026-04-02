/**
 * Currency Revaluation Actions
 *
 * Otomatik kur farkı tahakkuku ve dönem sonu değerleme
 */

'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CurrencyRevaluation');

export interface CurrencyRevaluationResult {
    customerId: string;
    customerName: string;
    currency: string;
    difference: number;
}

/**
 * Calculate currency revaluation for a customer
 * 
 * @param customerId - Customer ID
 * @param newRate - New exchange rate (e.g., 34.50 for USD)
 * @param oldRate - Old exchange rate (e.g., 32.50 for USD)
 * @param currency - Currency code (USD, EUR, etc.)
 */
export async function calculateCurrencyRevaluation(
  customerId: string,
  newRate: number,
  oldRate: number,
  currency: string = 'USD'
) {
  try {
    // Get all transactions for this customer (we'll filter by description)
    const transactions = await prisma.customerTransaction.findMany({
      where: { isDeleted: false,
        customerId,
        category: 'Dövizli İşlem' // Transactions with this category are foreign currency
      }
    });

    if (transactions.length === 0) {
      return { 
        success: true, 
        message: `${currency} cinsinde işlem bulunamadı`,
        difference: 0
      };
    }

    let totalDifference = 0;

    // Calculate difference for each transaction
    for (const tx of transactions) {
      const tlValueOld = tx.amount * oldRate;
      const tlValueNew = tx.amount * newRate;
      const difference = tlValueNew - tlValueOld;
      totalDifference += difference;
    }

    // Create revaluation transaction if there's a difference
    if (Math.abs(totalDifference) > 0.01) { // Avoid floating point issues
      const customer = await prisma.customer.findFirst({
        where: { isDeleted: false,  id: customerId }
      });

      await prisma.customerTransaction.create({
        data: {
          customerId,
          amount: Math.abs(totalDifference),
          type: totalDifference > 0 ? 'Debt' : 'Credit',
          category: 'Kur Farkı',
          description: `${currency} kur farkı tahakkuku (${oldRate.toFixed(4)} → ${newRate.toFixed(4)})`,
          date: new Date(),
          referenceType: 'CurrencyRevaluation'
        }
      });

      // Update customer balance
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          balance: { 
            increment: totalDifference > 0 ? totalDifference : 0,
            decrement: totalDifference < 0 ? Math.abs(totalDifference) : 0
          }
        }
      });

      logger.info(`Kur farkı oluşturuldu: ${customer?.name} - ${totalDifference.toFixed(2)} TL`);
    }

    revalidatePath('/customers');
    revalidatePath('/cash-book');

    return { 
      success: true, 
      message: `Kur farkı hesaplandı: ${totalDifference.toFixed(2)} TL`,
      difference: totalDifference
    };
  } catch (error: any) {
    logger.error('Kur farkı hesaplama hatası:', error);
    return { 
      success: false, 
      error: error.message || 'Kur farkı hesaplanırken hata oluştu'
    };
  }
}

/**
 * Calculate currency revaluation for ALL customers with foreign currency
 * 
 * @param rates - Object with currency rates { USD: 34.50, EUR: 37.80 }
 * @param oldRates - Object with old rates { USD: 32.50, EUR: 35.00 }
 */
export async function calculateBulkCurrencyRevaluation(
  rates: { [key: string]: number },
  oldRates: { [key: string]: number }
) {
  try {
    const results: CurrencyRevaluationResult[] = [];
    const currencies = Object.keys(rates);

    // Get all customers with foreign currency transactions
    const customers = await prisma.customer.findMany({
      where: { isDeleted: false,
        transactions: {
          some: {
            category: 'Dövizli İşlem'
          }
        }
      },
      distinct: ['id']
    });

    logger.info(`Toplam ${customers.length} müşteri için kur farkı hesaplanıyor...`);

    // Calculate for each customer
    for (const customer of customers) {
      for (const currency of currencies) {
        const result = await calculateCurrencyRevaluation(
          customer.id,
          rates[currency],
          oldRates[currency],
          currency
        );

        if (result.success && result.difference !== 0) {
          results.push({
            customerId: customer.id,
            customerName: customer.name,
            currency,
            difference: result.difference ?? 0
          });
        }
      }
    }

    revalidatePath('/customers');
    revalidatePath('/cash-book');

    logger.info(`Kur farkı tamamlandı: ${results.length} müşteri etkilendi`);

    return { 
      success: true, 
      message: `Toplam ${results.length} müşteri için kur farkı hesaplandı`,
      results
    };
  } catch (error: any) {
    logger.error('Toplu kur farkı hatası:', error);
    return { 
      success: false, 
      error: error.message || 'Toplu kur farkı hesaplanırken hata oluştu'
    };
  }
}

/**
 * Get current foreign currency exposure for a customer
 */
export async function getCurrencyExposure(customerId: string) {
  try {
    const transactions = await prisma.customerTransaction.findMany({
      where: { isDeleted: false,
        customerId,
        category: 'Dövizli İşlem'
      }
    });

    const exposure: { [key: string]: number } = {};

    transactions.forEach(tx => {
      // Extract currency from description (format: "USD 1000")
      const match = tx.description?.match(/([A-Z]{3})\s+(\d+)/);
      if (match) {
        const currency = match[1];
        if (!exposure[currency]) {
          exposure[currency] = 0;
        }
        exposure[currency] += tx.type === 'Debt' ? tx.amount : -tx.amount;
      }
    });

    return {
      success: true,
      data: exposure
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}
