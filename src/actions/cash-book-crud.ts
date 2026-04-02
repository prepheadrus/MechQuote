'use server';

/**
 * Kasa Defteri - CRUD İşlemleri
 * 
 * Güncelleme ve Silme fonksiyonları
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logger } from '@/lib/logger';

/**
 * ✅ YENİ: Update Cash Book Entry
 */
export async function updateCashEntry(
    entryId: string,
    data: {
        description?: string;
        amount?: number;
        date?: Date | string;
        category?: string;
    }
) {
    try {
        const { description, amount, date, category } = data;
        
        // Determine entry type from ID prefix
        if (entryId.startsWith('pxp-')) {
            // Project Expense (pxp = Project ExPense)
            const expenseId = entryId.replace('pxp-', '');
            await prisma.projectExpense.update({
                where: { id: expenseId },
                data: {
                    description: description || undefined,
                    amount: amount !== undefined ? amount : undefined,
                    date: date ? new Date(date) : undefined,
                    category: category || undefined
                }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı güncellendi.' };
        }

        if (entryId.startsWith('ptx-')) {
            // Personnel Transaction (ptx = Personnel Transaction)
            const transactionId = entryId.replace('ptx-', '');
            await prisma.personnelTransaction.update({
                where: { id: transactionId },
                data: {
                    description: description || undefined,
                    amount: amount !== undefined ? amount : undefined,
                    date: date ? new Date(date) : undefined,
                    category: category || undefined
                }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı güncellendi.' };
        }

        if (entryId.startsWith('ctx-')) {
            // Customer Transaction (ctx = Customer Transaction)
            const transactionId = entryId.replace('ctx-', '');
            await prisma.customerTransaction.update({
                where: { id: transactionId },
                data: {
                    description: description || undefined,
                    amount: amount !== undefined ? amount : undefined,
                    date: date ? new Date(date) : undefined,
                    category: category || undefined
                }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı güncellendi.' };
        }

        if (entryId.startsWith('stx-')) {
            // Supplier Transaction (stx = Supplier Transaction)
            const transactionId = entryId.replace('stx-', '');
            await prisma.supplierTransaction.update({
                where: { id: transactionId },
                data: {
                    description: description || undefined,
                    amount: amount !== undefined ? amount : undefined,
                    date: date ? new Date(date) : undefined,
                    category: category || undefined
                }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı güncellendi.' };
        }

        return { success: false, error: 'Geçersiz kayıt tipi.' };
    } catch (error: any) {
        logger.error('Failed to update cash entry:', error);
        return { success: false, error: error.message || 'Kasa kaydı güncellenirken hata oluştu.' };
    }
}

/**
 * ✅ YENİ: Delete Cash Book Entry
 */
export async function deleteCashEntry(entryId: string) {
    try {
        // Determine entry type from ID prefix
        if (entryId.startsWith('pxp-')) {
            // Project Expense (pxp = Project ExPense)
            const expenseId = entryId.replace('pxp-', '');
            await prisma.projectExpense.update({
                where: { id: expenseId },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı silindi.' };
        }

        if (entryId.startsWith('ptx-')) {
            // Personnel Transaction (ptx = Personnel Transaction)
            const transactionId = entryId.replace('ptx-', '');
            await prisma.personnelTransaction.update({
                where: { id: transactionId },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı silindi.' };
        }

        if (entryId.startsWith('ctx-')) {
            // Customer Transaction (ctx = Customer Transaction)
            const transactionId = entryId.replace('ctx-', '');
            await prisma.customerTransaction.update({
                where: { id: transactionId },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı silindi.' };
        }

        if (entryId.startsWith('stx-')) {
            // Supplier Transaction (stx = Supplier Transaction)
            const transactionId = entryId.replace('stx-', '');
            await prisma.supplierTransaction.update({
                where: { id: transactionId },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            revalidatePath('/cash-book');
            return { success: true, message: 'Kasa kaydı silindi.' };
        }

        return { success: false, error: 'Geçersiz kayıt tipi.' };
    } catch (error: any) {
        logger.error('Failed to delete cash entry:', error);
        return { success: false, error: error.message || 'Kasa kaydı silinirken hata oluştu.' };
    }
}
