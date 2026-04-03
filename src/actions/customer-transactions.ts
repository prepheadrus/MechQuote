'use server';

import { prisma as db } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export type TransactionType = 'Debt' | 'Payment' | 'Credit' | 'Opening';

interface CreateTransactionInput {
    customerId: string;
    amount: number;
    type: TransactionType;
    description?: string;
    referenceId?: string;
    referenceType?: 'Proposal' | 'Invoice' | 'Manual';
    category?: string;
    date?: Date;
    projectId?: string;
}

export async function createTransaction(input: CreateTransactionInput) {
    try {
        const { customerId, amount, type, description, referenceId, referenceType, category, date } = input;

        // Calculate balance impact
        // Debt (Borç - Satış) increases balance (Customer owes us)
        // Payment (Tahsilat) decreases balance (Customer pays us)
        // Credit (Alacak - İade) decreases balance
        // Opening (Açılış): Positive = Debt, Negative = Credit

        let signedAmount = amount;

        // If it's a payment or credit, it reduces the debt, so we treat it as negative for balance calculation
        // However, we might store the absolute amount in the transaction record and use the type to determine sign
        // But to make aggregation easier, let's store signed amount in the Transaction record?
        // Or store absolute amount and let the type valid?
        // Let's store signed amount to make sum() easy.

        if (type === 'Payment' || type === 'Credit') {
            signedAmount = -Math.abs(amount);
        } else {
            signedAmount = Math.abs(amount);
        }

        // Transaction
        const result = await db.$transaction(async (tx: any) => {
            const transaction = await tx.customerTransaction.create({
                data: {
                    customerId,
                    amount: signedAmount,
                    type,
                    description,
                    referenceId,
                    referenceType,
                    category,
                    date: date || new Date(),
                }
            });

            const customer = await tx.customer.update({
                where: { id: customerId },
                data: {
                    balance: {
                        increment: signedAmount
                    }
                }
            });

            return { transaction, customer };
        });

        revalidatePath('/customers');
        revalidatePath(`/customers/${customerId}`);

        return { success: true, data: result };

    } catch (error) {
        logger.error('Error creating transaction:', error);
        return { success: false, error: 'Failed to create transaction' };
    }
}

export async function getCustomerTransactions(customerId: string) {
    try {
        const transactions = await db.customerTransaction.findMany({
            where: { customerId },
            orderBy: { date: 'desc' },
        });
        return transactions;
    } catch (error) {
        logger.error('Error fetching transactions:', error);
        return [];
    }
}

export async function deleteTransaction(transactionId: string) {
    try {
        await db.$transaction(async (tx) => {
            const transaction = await tx.customerTransaction.findFirst({
                where: { isDeleted: false,  id: transactionId }
            });

            if (!transaction) throw new Error('Transaction not found');

            // Reverse the balance effect
            await tx.customer.update({
                where: { id: transaction.customerId },
                data: {
                    balance: {
                        decrement: transaction.amount
                    }
                }
            });

            await tx.customerTransaction.update({ where: { id: transactionId }, data: { isDeleted: true, deletedAt: new Date() } });
        });

        revalidatePath('/customers');
        return { success: true };
    } catch (error) {
        logger.error('Error deleting transaction:', error);
        return { success: false, error: 'Failed to delete transaction' };
    }
}

export async function deleteTransactionByReference(referenceId: string) {
    try {
        const transactions = await db.customerTransaction.findMany({
            where: { referenceId, isDeleted: false }
        });

        if (transactions.length === 0) return { success: true }; // Nothing to delete

        // Map aggregation to combine decrements per customer
        const customerBalanceDecrements = new Map<string, number>();
        for (const transaction of transactions) {
            const currentDecrement = customerBalanceDecrements.get(transaction.customerId) || 0;
            customerBalanceDecrements.set(transaction.customerId, currentDecrement + transaction.amount);
        }

        const transactionIds = transactions.map(t => t.id);

        await db.$transaction(async (tx) => {
            // Update customer balances with aggregated amounts
            for (const [customerId, totalDecrement] of customerBalanceDecrements.entries()) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: {
                        balance: {
                            decrement: totalDecrement
                        }
                    }
                });
            }

            // Bulk soft-delete transactions
            await tx.customerTransaction.updateMany({
                where: { id: { in: transactionIds } },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        });

        revalidatePath('/customers');
        return { success: true };
    } catch (error) {
        logger.error('Error deleting transaction by reference:', error);
        return { success: false, error: 'Failed to delete transaction by reference' };
    }
}

/**
 * Get ALL transactions for backup purposes
 */
export async function getAllCustomerTransactions() {
    try {
        const transactions = await db.customerTransaction.findMany({
            orderBy: { date: 'desc' },
        });
        return { success: true, data: transactions };
    } catch (error) {
        logger.error('Error fetching all transactions:', error);
        return { success: false, error: 'Tüm işlemler yüklenirken hata oluştu.' };
    }
}
