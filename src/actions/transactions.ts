'use server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createTransaction as createCustomerTx, deleteTransactionByReference } from './customer-transactions';
import { createSupplierTransaction } from './supplier-transactions';
import { ProjectExpense } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Get all transactions for a project
 */
export async function getProjectTransactions(projectId: string) {
    try {
        const transactions = await prisma.projectExpense.findMany({
            where: { isDeleted: false,  projectId },
            include: { supplier: { where: { isDeleted: false },  select: { name: { where: { isDeleted: false } } } } },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: transactions };
    } catch (error) {
        logger.error('Failed to fetch transactions:', error);
        return { success: false, error: 'İşlemler yüklenirken hata oluştu.' };
    }
}

/**
 * Get all project expenses (for backup)
 */
export async function getAllProjectExpenses() {
    try {
        const transactions = await prisma.projectExpense.findMany({ where: { isDeleted: false },
            include: { project: { where: { isDeleted: false },  select: { name: { where: { isDeleted: false } } } }, supplier: { where: { isDeleted: false },  select: { name: { where: { isDeleted: false } } } } },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: transactions };
    } catch (error) {
        logger.error('Failed to fetch all transactions:', error);
        return { success: false, error: 'Tüm işlemler yüklenirken hata oluştu.' };
    }
}

/**
 * Create a new transaction (Income or Expense)
 */
export async function createTransaction(data: {
    description: string;
    amount: number;
    date: Date | string;
    category: string;
    projectId: string;
    type: 'Income' | 'Expense';
    supplierId?: string;
}) {
    try {
        logger.info(`[CreateTransaction] Starting transaction creation for Project: ${data.projectId}, Type: ${data.type}, Amount: ${data.amount}`);

        const project = await prisma.project.findFirst({
            where: { isDeleted: false,  id: data.projectId },
            select: { customerId: { where: { isDeleted: false } }, name: { where: { isDeleted: false } } }
        });

        if (!project) {
            logger.error(`[CreateTransaction] Project not found: ${data.projectId}`);
            return { success: false, error: 'Proje bulunamadı.' };
        }

        const transaction = await prisma.projectExpense.create({
            data: {
                description: data.description,
                amount: Number(data.amount),
                date: new Date(data.date),
                category: data.category,
                projectId: data.projectId,
                type: data.type,
                supplierId: data.supplierId || null,
                customerId: null, // ✅ Manuel girişlerde açıkça null
                personnelId: null // ✅ Manuel girişlerde açıkça null
            }
        });

        // 1. End-to-End Sync for CUSTOMER
        if (data.type === 'Income' && project.customerId) {
            logger.info(`[CreateTransaction] Syncing Income to Customer: ${project.customerId}`);
            await createCustomerTx({
                customerId: project.customerId,
                amount: Number(data.amount),
                type: 'Payment', // Income for Project = Payment from Customer
                description: `${project.name} - ${data.description || 'Proje Tahsilatı'} (Manuel)`,
                referenceId: transaction.id,
                referenceType: 'Manual',
                category: 'Collection',
                date: new Date(data.date)
            });
        }

        // 2. End-to-End Sync for SUPPLIER
        if (data.type === 'Expense' && data.supplierId) {
            logger.info(`[CreateTransaction] Syncing Expense to Supplier: ${data.supplierId}`);
            await createSupplierTransaction({
                supplierId: data.supplierId,
                amount: Number(data.amount),
                type: 'Debt', // Expense for Project = Debt to Supplier
                description: `${project.name} - ${data.description || 'Proje Harcaması'}`,
                referenceId: transaction.id,
                referenceType: 'ProjectExpense',
                date: new Date(data.date)
            });
        }

        revalidatePath(`/projects/${data.projectId}`);
        revalidatePath('/customers');
        revalidatePath('/cash-book');
        if (project.customerId) revalidatePath(`/customers/${project.customerId}`);

        return { success: true, data: transaction };
    } catch (error) {
        logger.error('Failed to create transaction:', error);
        return { success: false, error: 'İşlem eklenirken hata oluştu.' };
    }
}

/**
 * Update a transaction
 */
export async function updateTransaction(id: string, data: {
    description: string;
    amount: number;
    date: Date | string;
    category: string;
    type: 'Income' | 'Expense';
    projectId: string;
}) {
    try {
        const oldTransaction = await prisma.projectExpense.findFirst({ where: { isDeleted: false,  id } });

        const transaction = await prisma.projectExpense.update({
            where: { id },
            data: {
                description: data.description,
                amount: Number(data.amount),
                date: new Date(data.date),
                category: data.category,
                type: data.type
            }
        });

        // Sync Customer Transaction
        // Delete old one and create new one if it's Income
        await deleteTransactionByReference(id);

        if (data.type === 'Income') {
            const project = await prisma.project.findFirst({
                where: { isDeleted: false,  id: data.projectId },
                select: { customerId: { where: { isDeleted: false } }, name: { where: { isDeleted: false } } }
            });

            if (project?.customerId) {
                await createCustomerTx({
                    customerId: project.customerId,
                    amount: Number(data.amount),
                    type: 'Payment',
                    description: `${project.name} - ${data.description || 'Tahsilat'}`,
                    referenceId: transaction.id,
                    referenceType: 'Manual',
                    category: 'Collection',
                    date: new Date(data.date)
                });
            }
        }

        revalidatePath(`/projects/${data.projectId}`);
        revalidatePath('/customers');
        return { success: true, data: transaction };
    } catch (error) {
        logger.error('Failed to update transaction:', error);
        return { success: false, error: 'İşlem güncellenirken hata oluştu.' };
    }
}

/**
 * Delete a transaction
 */
export async function deleteTransaction(id: string, projectId: string) {
    try {
        await deleteTransactionByReference(id);

        // SYNC: Remove from JobAssignment paymentHistory if it exists there
        // This handles the case where a "Team Payment" is deleted from the generic list
        // 1. Find assignments for this project
        const assignments = await prisma.jobAssignment.findMany({
            where: { isDeleted: false,
                proposal: { projectId: projectId }
            }
        });

        // 2. Iterate and check/update (Optimized to prevent N+1)
        const updates: any[] = [];
        for (const assignment of assignments) {
            if (assignment.paymentHistory) {
                try {
                    const history = Array.isArray(assignment.paymentHistory) ? assignment.paymentHistory : (typeof assignment.paymentHistory === 'string' ? JSON.parse(assignment.paymentHistory) : []);
                    const filtered = history.filter((p: any) => p.id !== id);

                    if (filtered.length !== history.length) {
                        updates.push(prisma.jobAssignment.update({
                            where: { id: assignment.id },
                            data: { paymentHistory: filtered }
                        }));
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            }
        }

        if (updates.length > 0) {
            await prisma.$transaction(updates);
        }

        await prisma.projectExpense.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/customers');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete transaction:', error);
        return { success: false, error: 'İşlem silinirken hata oluştu.' };
    }
}
