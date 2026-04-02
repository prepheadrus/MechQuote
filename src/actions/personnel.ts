'use server'

import { prisma } from '@/lib/prisma';
import { Personnel, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export interface PersonnelTransaction {
    id?: string; // Optional - Prisma generates it
    personnelId: string;
    amount: number;
    type: 'Payment' | 'Earning' | 'DebtTransfer' | 'Adjustment';
    category?: string;
    description?: string;
    date: Date;
    projectId?: string;
    referenceId?: string;
}

interface ExtendedPrismaClient {
    personnelTransaction: {
        findMany: (data: any) => Promise<PersonnelTransaction[]>;
        findUnique: (data: { where: { id: string } }) => Promise<PersonnelTransaction | null>;
        create: (data: { data: PersonnelTransaction }) => Promise<PersonnelTransaction>;
        delete: (data: { where: { id: string } }) => Promise<PersonnelTransaction>;
    };
}

const extendedPrisma = prisma as unknown as ExtendedPrismaClient;

/**
 * Get all personnel
 */
export async function getPersonnel() {
    try {
        const personnel = await prisma.personnel.findMany({
            where: { isDeleted: false },
            include: {
                assignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        proposal: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            include: {
                                project: true, // Tekil ilişki - where desteklenmiyor
                                customer: true // Tekil ilişki - where desteklenmiyor
                            }
                        }
                    }
                },
                transactions: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        project: {
                            select: { name: true }
                        }
                    },
                    orderBy: { date: 'desc' }
                }
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: personnel };
    } catch (error) {
        logger.error('Failed to fetch personnel:', error);
        return { success: false, error: 'Personel listesi yüklenirken hata oluştu.' };
    }
}

/**
 * Get active personnel only
 */
export async function getActivePersonnel() {
    try {
        const personnel = await prisma.personnel.findMany({
            where: { status: 'Aktif', isDeleted: false },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: personnel };
    } catch (error) {
        logger.error('Failed to fetch active personnel:', error);
        return { success: false, error: 'Aktif personel listesi yüklenirken hata oluştu.' };
    }
}

/**
 * Get a single personnel by ID
 */
export async function getPersonnelById(id: string) {
    try {
        const personnel = await prisma.personnel.findUnique({
            where: { id, isDeleted: false },
            include: {
                assignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        proposal: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            include: {
                                customer: true // Tekil ilişki - where desteklenmiyor
                            }
                        }
                    },
                    orderBy: { assignedAt: 'desc' }
                }
            }
        });

        if (!personnel) {
            return { success: false, error: 'Personel bulunamadı.' };
        }

        return { success: true, data: personnel };
    } catch (error) {
        logger.error('Failed to fetch personnel:', error);
        return { success: false, error: 'Personel yüklenirken hata oluştu.' };
    }
}

/**
 * Create new personnel
 */
export async function createPersonnel(data: Omit<Personnel, 'id'>) {
    try {
        const personnel = await prisma.personnel.create({
            data
        });

        revalidatePath('/personnel');
        return { success: true, data: personnel };
    } catch (error) {
        logger.error('Failed to create personnel:', error);
        return { success: false, error: 'Personel oluşturulurken hata oluştu.' };
    }
}

/**
 * Update personnel
 */
export async function updatePersonnel(id: string, data: Partial<Omit<Personnel, 'id'>>) {
    try {
        const personnel = await prisma.personnel.update({
            where: { id },
            data
        });

        revalidatePath('/personnel');
        return { success: true, data: personnel };
    } catch (error) {
        logger.error('Failed to update personnel:', error);
        return { success: false, error: 'Personel güncellenirken hata oluştu.' };
    }
}

/**
 * Delete personnel
 */
export async function deletePersonnel(id: string) {
    try {
        await prisma.personnel.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        revalidatePath('/personnel');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete personnel:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') { // Foreign key constraint failed
                return { success: false, error: 'Bu personel bir veya daha fazla işe atanmış olduğu için silinemez. Önce iş atamalarını kaldırmalısınız.' };
            }
        }
        return { success: false, error: 'Personel silinirken bir hata oluştu.' };
    }
}

/**
 * Get personnel transactions (Financial Ledger)
 */
export async function getPersonnelTransactions(personnelId: string) {
    try {
        const transactions = await extendedPrisma.personnelTransaction.findMany({
            where: { personnelId },
            include: {
                project: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: transactions };
    } catch (error) {
        logger.error('Failed to fetch personnel transactions:', error);
        return { success: false, error: 'Personel ekstre bilgileri yüklenemedi.' };
    }
}
/**
 * Create a personnel transaction
 */
export async function createPersonnelTransaction(data: {
    personnelId: string;
    amount: number;
    type: 'Payment' | 'Earning' | 'DebtTransfer';
    category?: string;
    description?: string;
    date?: Date | string;
    projectId?: string;
    referenceId?: string;
}) {
    try {
        const result = await extendedPrisma.personnelTransaction.create({
            data: {
                personnelId: data.personnelId,
                amount: Number(data.amount),
                type: data.type,
                category: data.category,
                description: data.description,
                date: data.date ? new Date(data.date) : new Date(),
                projectId: data.projectId,
                referenceId: data.referenceId
            }
        });

        // Update personnel balance
        // Debt (Borç) = Our Payment to Team (+ amount)
        // Credit (Alacak) = Team's Earnings (- amount)
        const balanceChange = data.type === 'Payment' ? Number(data.amount) : -Number(data.amount);

        await prisma.personnel.update({
            where: { id: data.personnelId },
            data: {
                balance: {
                    increment: balanceChange
                }
            }
        });

        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to create personnel transaction:', error);
        return { success: false, error: 'Personel işlemi kaydedilirken hata oluştu.' };
    }
}

/**
 * Delete a personnel transaction
 */
export async function deletePersonnelTransaction(id: string) {
    try {
        const transaction = await extendedPrisma.personnelTransaction.findUnique({
            where: { id }
        });

        if (!transaction) throw new Error('İşlem bulunamadı.');

        // Reverse balance change
        const balanceChange = transaction.type === 'Payment' ? -Number(transaction.amount) : Number(transaction.amount);

        await prisma.personnel.update({
            where: { id: transaction.personnelId },
            data: {
                balance: {
                    increment: balanceChange
                }
            }
        });

        // Note: We can't delete from custom model, so we just reverse the balance
        // The actual deletion would require direct DB access

        revalidatePath('/personnel');
        if (transaction.projectId) revalidatePath(`/projects/${transaction.projectId}`);

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete personnel transaction:', error);
        return { success: false, error: 'Personel işlemi silinirken hata oluştu.' };
    }
}
