'use server';

import { prisma as db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { SupplierTransaction } from '@prisma/client';
import { logger } from '@/lib/logger';

interface ExtendedPrismaClient {
    supplierTransaction: {
        findMany: (data: { where: { supplierId: string }; orderBy: { date: 'desc' } }) => Promise<SupplierTransaction[]>;
    };
}

const extendedDb = db as unknown as ExtendedPrismaClient;

export async function createSupplierTransaction(input: {
    supplierId: string;
    amount: number;
    type: 'Debt' | 'Payment' | 'Credit' | 'Opening';
    category?: string;
    description?: string;
    referenceId?: string;
    referenceType?: 'ProjectExpense' | 'Invoice' | 'Manual';
    date?: Date;
    projectId?: string;
}) {
    try {
        const { supplierId, amount, type, category, description, referenceId, referenceType, date } = input;

        // Balance impact:
        // Debt (Borç - We bought stuff) increases balance (We owe supplier more)
        // Payment (Ödeme) decreases balance (We owe supplier less)

        let signedAmount = amount;
        if (type === 'Payment' || type === 'Credit') {
            signedAmount = -Math.abs(amount);
        } else {
            signedAmount = Math.abs(amount);
        }

        const result = await db.$transaction(async (tx: any) => {
            const transaction = await tx.supplierTransaction.create({
                data: {
                    supplierId,
                    amount: signedAmount,
                    type,
                    category,
                    description,
                    referenceId,
                    referenceType,
                    date: date || new Date(),
                }
            });

            const supplier = await tx.supplier.update({
                where: { id: supplierId },
                data: {
                    balance: {
                        increment: signedAmount
                    }
                }
            });

            // Create Cash Book Entry for Payment transactions
            if (type === 'Payment' && referenceId) {
                const supplierData = await tx.supplier.findFirst({
                    where: { isDeleted: false,  id: supplierId }
                });

                await tx.cashBookEntry.create({
                    data: {
                        date: date || new Date(),
                        description: `Tedarikçi Ödemesi: ${supplierData?.name || 'Bilinmeyen'}${description ? ` - ${description}` : ''}`,
                        amount: Math.abs(amount),
                        type: 'OUT', // Payment = cash out
                        category: category || 'Tedarikçi Ödemesi',
                        source: 'supplier-transaction',
                        entityName: supplierData?.name,
                        relatedId: referenceId,
                        relatedType: 'Invoice'
                    }
                });
            }

            return { transaction, supplier };
        });

        revalidatePath('/products'); // Revalidate products/suppliers if needed
        revalidatePath('/cash-book');
        return { success: true, data: result };

    } catch (error) {
        logger.error('Error creating supplier transaction:', error);
        return { success: false, error: 'Tedarikçi işlemi kaydedilemedi.' };
    }
}

export async function getSupplierTransactions(supplierId: string) {
    try {
        const transactions = await extendedDb.supplierTransaction.findMany({
            where: { supplierId },
            orderBy: { date: 'desc' },
        });
        return { success: true, data: transactions };
    } catch (error) {
        logger.error('Error fetching supplier transactions:', error);
        return { success: false, error: 'İşlemler yüklenemedi.' };
    }
}
