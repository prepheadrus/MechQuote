'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/services/audit-service';
import { logger } from '@/lib/logger';
import { deleteCashEntry } from './cash-book-crud'; // ✅ YENİ: Kasa defterinden silme

export interface PaymentHistoryItem {
    id?: string; // Optional - may come from Payment model
    amount: number;
    date: string | Date;
    note?: string;
}

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
        create: (data: { data: PersonnelTransaction }) => Promise<PersonnelTransaction>;
        findUnique: (data: { where: { id: string } }) => Promise<PersonnelTransaction | null>;
        delete: (data: { where: { id: string } }) => Promise<PersonnelTransaction>;
    };
}

const extendedPrisma = prisma as unknown as ExtendedPrismaClient;

export async function updateJobAssignmentPayment(assignmentId: string, data: {
    paymentHistory: PaymentHistoryItem[];
    paymentStatus: string;
}) {
    try {
        // 1. Fetch the existing assignment to get projectId and current history
        const oldAssignment = await prisma.jobAssignment.findUnique({
            where: { id: assignmentId, isDeleted: false },
            include: {
                personnel: true,
                proposal: {
                    select: { projectId: true }
                }
            }
        });

        if (!oldAssignment) throw new Error("Atama bulunamadı.");
        const projectId = oldAssignment.proposal?.projectId;
        if (!projectId) throw new Error("Bu atama bir projeye bağlı değil.");

        const oldHistory = oldAssignment.paymentHistory ? (Array.isArray(oldAssignment.paymentHistory) ? oldAssignment.paymentHistory : (typeof oldAssignment.paymentHistory === 'string' ? JSON.parse(oldAssignment.paymentHistory) : [])) : [];
        const newHistory = Array.isArray(data.paymentHistory) ? data.paymentHistory : (typeof data.paymentHistory === 'string' ? JSON.parse(data.paymentHistory) : []);

        // 2. Identify new payments (items in newHistory but not in oldHistory, by id)
        const newPayments = newHistory.filter((n: any) => n.id && !oldHistory.some((o: any) => o.id === n.id));

        // 3. Identify removed payments
        const removedPayments = oldHistory.filter((o: any) => o.id && !newHistory.some((n: any) => n.id === o.id));
        
        // 4. ✅ YENİ: Identify UPDATED payments (same id, different amount)
        const updatedPayments = newHistory.filter((n: any) => {
            const oldPayment = oldHistory.find((o: any) => o.id === n.id);
            return oldPayment && oldPayment.amount !== n.amount;
        });

        // 4. Update the assignment
        const assignment = await prisma.jobAssignment.update({
            where: { id: assignmentId },
            data: {
                paymentHistory: JSON.stringify(newHistory),
                paymentStatus: data.paymentStatus
            }
        });

        // 5. Create ProjectExpense records for new payments
        for (const payment of newPayments) {
            // ✅ DUPlikasyon KONTROLÜ: Aynı expense zaten var mı?
            const existingExpense = await prisma.projectExpense.findUnique({
                where: { id: payment.id }
            });

            if (!existingExpense) {
                // Sadece yoksa oluştur
                await prisma.projectExpense.create({
                    data: {
                        id: payment.id, // Use the same ID for linking
                        description: `Ekip Ödemesi: ${oldAssignment.personnel.name}${payment.note ? ` (${payment.note})` : ''}`,
                        amount: payment.amount,
                        date: new Date(payment.date),
                        category: 'Personel Ödemesi',
                        type: 'Expense',
                        projectId: projectId
                    }
                });
            } else {
                logger.warn(`ProjectExpense ${payment.id} zaten var, atlanıyor.`);
            }
        }
        
        // 6. ✅ YENİ: Handle UPDATED ProjectExpenses
        for (const payment of updatedPayments) {
            const existingExpense = await prisma.projectExpense.findUnique({
                where: { id: payment.id }
            });
            
            if (existingExpense) {
                // Update the expense
                await prisma.projectExpense.update({
                    where: { id: payment.id },
                    data: {
                        amount: payment.amount,
                        description: `Ekip Ödemesi: ${oldAssignment.personnel.name}${payment.note ? ` (${payment.note})` : ''}`,
                        date: new Date(payment.date)
                    }
                });
                
                logger.info(`ProjectExpense ${payment.id} güncellendi: ₺${existingExpense.amount} → ₺${payment.amount}`);
            }
        }

        // 7. Update Personnel Transaction for each new payment
        for (const payment of newPayments) {
            // ✅ DUPlikasyon KONTROLÜ: Aynı transaction zaten var mı?
            const existingTx = await extendedPrisma.personnelTransaction.findUnique({
                where: { id: payment.id }
            });

            if (!existingTx) {
                // Sadece yoksa oluştur
                await extendedPrisma.personnelTransaction.create({
                    data: {
                        id: payment.id,
                        personnelId: oldAssignment.personnelId,
                        amount: payment.amount,
                        type: 'Payment',
                        category: 'Avans',
                        description: `${oldAssignment.personnel.name} - ${oldAssignment.proposal?.projectId ? 'Proje' : 'Teklif'} Ödemesi: ${payment.note || ''}`,
                        date: new Date(payment.date),
                        projectId: projectId,
                        referenceId: assignmentId
                    }
                });

                // Update Personnel Balance (Positive means they owe us)
                await prisma.personnel.update({
                    where: { id: oldAssignment.personnelId },
                    data: { balance: { increment: payment.amount } }
                });
            } else {
                logger.warn(`PersonnelTransaction ${payment.id} zaten var, atlanıyor.`);
            }
        }
        
        // 8. ✅ YENİ: Handle UPDATED payments (same ID, different amount)
        for (const payment of updatedPayments) {
            const existingTx = await prisma.personnelTransaction.findUnique({
                where: { id: payment.id }
            });
            
            if (existingTx) {
                const oldAmount = existingTx.amount;
                const newAmount = payment.amount;
                const balanceDiff = newAmount - oldAmount;
                
                // Update the transaction
                await prisma.personnelTransaction.update({
                    where: { id: payment.id },
                    data: {
                        amount: newAmount,
                        description: `${oldAssignment.personnel.name} - ${oldAssignment.proposal?.projectId ? 'Proje' : 'Teklif'} Ödemesi: ${payment.note || ''}`,
                        date: new Date(payment.date)
                    }
                });
                
                // Adjust balance: remove old amount, add new amount
                await prisma.personnel.update({
                    where: { id: oldAssignment.personnelId },
                    data: { balance: { increment: balanceDiff } }
                });
                
                logger.info(`PersonnelTransaction ${payment.id} güncellendi: ₺${oldAmount} → ₺${newAmount} (Fark: ₺${balanceDiff})`);
            }
        }

        // 9. Handle removed payments in Personnel Transactions
        for (const payment of removedPayments) {
            try {
                const tx = await prisma.personnelTransaction.findUnique({ where: { id: payment.id } });
                if (tx) {
                    await prisma.personnel.update({
                        where: { id: tx.personnelId },
                        data: { balance: { decrement: tx.amount } }
                    });
                    await prisma.personnelTransaction.delete({ where: { id: payment.id } });
                }
            } catch (err) {
                logger.warn(`Could not delete PersonnelTransaction for payment ${payment.id}`);
            }
        }

        // 10. Audit Log
        await createAuditLog(
            'UPDATE_PAYMENTS',
            'JobAssignment',
            assignmentId,
            `Ödeme geçmişi güncellendi. Yeni ödemeler: ${newPayments.length}, Güncellenen: ${updatedPayments.length}, Silinen: ${removedPayments.length}`,
            null,
            'System'
        );

        // Revalidate relevant paths
        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/teams');
        revalidatePath('/projects');

        return { success: true, data: assignment };
    } catch (error: any) {
        logger.error('Failed to update job assignment payment:', error);
        return { success: false, error: error.message || 'Ödeme güncellenirken bir hata oluştu.' };
    }
}

export async function getJobAssignment(id: string) {
    try {
        const assignment = await prisma.jobAssignment.findUnique({
            where: { id, isDeleted: false },
            include: {
                personnel: true,
                proposal: {
                    include: {
                        project: true
                    }
                }
            }
        });
        return { success: true, data: assignment };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getJobAssignments() {
    try {
        const assignments = await prisma.jobAssignment.findMany({
            where: { isDeleted: false },
            include: {
                personnel: true,
                proposal: {
                    include: {
                        project: true
                    }
                }
            },
            orderBy: { assignedAt: 'desc' }
        });

        // Parse paymentHistory JSON for each assignment
        const parsedAssignments = assignments.map(a => ({
            ...a,
            paymentHistory: a.paymentHistory ? (Array.isArray(a.paymentHistory) ? a.paymentHistory : (typeof a.paymentHistory === 'string' ? JSON.parse(a.paymentHistory) : [])) : []
        }));

        return { success: true, data: parsedAssignments };
    } catch (error: any) {
        logger.error('Failed to get job assignments:', error);
        return { success: false, error: error.message };
    }
}

export async function createJobAssignment(data: {
    proposalId?: string | null;
    projectId?: string | null;
    personnelId: string;
    assignedAmount: number;
    notes?: string;
}) {
    try {
        // ✅ Empty string'i null'e çevir
        const cleanedData = {
            ...data,
            proposalId: data.proposalId && data.proposalId.trim() ? data.proposalId : null,
            projectId: data.projectId && data.projectId.trim() ? data.projectId : null,
        };
        
        // ✅ VALIDATION: En az biri gerekli (proposalId veya projectId)
        if (!cleanedData.proposalId && !cleanedData.projectId) {
            throw new Error('ProposalId veya projectId zorunludur.');
        }
        
        // ✅ VALIDATION: Personnel var mı kontrol et
        const personnel = await prisma.personnel.findUnique({
            where: { id: cleanedData.personnelId }
        });
        
        if (!personnel) {
            throw new Error(`Personnel bulunamadı: ${cleanedData.personnelId}`);
        }
        
        // ✅ VALIDATION: Proposal ID varsa var mı kontrol et
        if (cleanedData.proposalId) {
            const proposal = await prisma.proposal.findUnique({
                where: { id: cleanedData.proposalId }
            });
            
            if (!proposal) {
                throw new Error(`Proposal bulunamadı: ${cleanedData.proposalId}`);
            }
        }
        
        // ✅ VALIDATION: Project ID varsa var mı kontrol et
        if (cleanedData.projectId) {
            const project = await prisma.project.findUnique({
                where: { id: cleanedData.projectId }
            });
            
            if (!project) {
                throw new Error(`Project bulunamadı: ${cleanedData.projectId}`);
            }
        }
        
        // ✅ DEBUG: Create öncesi log
        console.log('🔍 Creating JobAssignment:', {
            proposalId: cleanedData.proposalId,
            projectId: cleanedData.projectId,
            personnelId: cleanedData.personnelId,
            assignedAmount: cleanedData.assignedAmount
        });
        
        const assignment = await prisma.jobAssignment.create({
            data: {
                // ✅ Empty string'i null'e çevir (foreign key için)
                proposalId: cleanedData.proposalId,
                projectId: cleanedData.projectId,
                personnelId: cleanedData.personnelId,
                assignedAmount: Number(cleanedData.assignedAmount),
                notes: cleanedData.notes,
                paymentStatus: 'Ödenmedi'
            }
        });

        // Record Hakediş (Earning) as a negative transaction (we owe them)
        await extendedPrisma.personnelTransaction.create({
            data: {
                personnelId: data.personnelId,
                amount: -Number(data.assignedAmount),
                type: 'Earning',
                category: 'Hakediş',
                description: `İş Ataması Hakedişi`,
                projectId: data.projectId || undefined,
                referenceId: assignment.id,
                date: new Date()
            }
        });

        await prisma.personnel.update({
            where: { id: data.personnelId },
            data: { balance: { decrement: Number(data.assignedAmount) } }
        });

        // Audit Log
        await createAuditLog(
            'CREATE_ASSIGNMENT',
            'JobAssignment',
            assignment.id,
            `Ekip üyesi atandı: ${data.personnelId}. Hakediş: ${data.assignedAmount} TL`,
            null,
            'System'
        );

        revalidatePath('/teams');
        revalidatePath('/assignments');
        return { success: true, data: assignment };
    } catch (error: any) {
        logger.error('Failed to create job assignment:', error);
        return { success: false, error: error.message };
    }
}

export async function updateJobAssignment(id: string, data: {
    assignedAmount?: number;
    notes?: string;
    paymentStatus?: string;
}) {
    try {
        const assignment = await prisma.jobAssignment.update({
            where: { id },
            data: {
                ...data,
                assignedAmount: data.assignedAmount !== undefined ? Number(data.assignedAmount) : undefined
            }
        });
        revalidatePath('/assignments');
        revalidatePath('/projects');
        return { success: true, data: assignment };
    } catch (error: any) {
        logger.error('Failed to update job assignment:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteJobAssignment(id: string) {
    try {
        // ✅ isDeleted filtresi kaldırıldı - zaten silinmiş assignment'ları da bulabilmeli
        const assignment = await prisma.jobAssignment.findUnique({
            where: { id },
            include: { personnel: true }
        });

        if (!assignment) return { success: false, error: "Atama bulunamadı." };
        
        // ✅ Zaten silinmiş mi kontrol et
        if (assignment.isDeleted) {
            return { success: false, error: "Bu atama zaten silinmiş." };
        }

        const history = assignment.paymentHistory ? (Array.isArray(assignment.paymentHistory) ? assignment.paymentHistory : (typeof assignment.paymentHistory === 'string' ? JSON.parse(assignment.paymentHistory) : [])) : [];
        const totalPaid = history.reduce((sum: number, p: PaymentHistoryItem) => sum + (p.amount || 0), 0);

        // If team was paid but is being removed, we must decide what happens to that money.
        // The user wants them to "owe" us.
        // In our ledger, a positive balance means তারা (They) owe us.
        // We already recorded the Payments as positive PersonnelTransactions (Debt).
        // If we delete the assignment, we should probably record a "Work Cancellation" credit
        // if they did SOME work, but if we just want them to owe the full amount,
        // we just leave the Payment transactions as they are and they will sum up to a positive balance.

        // HOWEVER, we should probably record an explicit "Removal from Project" note in their transactions
        // if we want to be very clear.

        if (totalPaid > 0) {
            // ✅ YENİ: Personnel Transaction'ları bul ve soft delete et (kasa defterinden sil)
            const personnelTransactions = await prisma.personnelTransaction.findMany({
                where: {
                    personnelId: assignment.personnelId,
                    referenceId: id, // Bu assignment'a bağlı transaction'lar
                    isDeleted: false
                }
            });
            
            // Her transaction'ı soft delete et
            for (const pt of personnelTransactions) {
                await prisma.personnelTransaction.update({
                    where: { id: pt.id },
                    data: { isDeleted: true, deletedAt: new Date() }
                });
                
                // Kasa defterinden de sil (ID formatı: ptx-{id})
                await deleteCashEntry(`ptx-${pt.id}`);
            }
            
            // Adjustment kaydı oluşturma (artık gerek yok, transaction'lar silindi)
            // await extendedPrisma.personnelTransaction.create({...})
        }

        await prisma.jobAssignment.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        // Audit Log
        await createAuditLog(
            'DELETE_ASSIGNMENT',
            'JobAssignment',
            id,
            `Ekip üyesi ataması silindi. Ekip: ${assignment.personnel.name}. Toplam ödenen: ${totalPaid} TL`,
            null,
            'System'
        );

        revalidatePath('/assignments');
        revalidatePath('/projects');
        return { success: true };
    } catch (error: any) {
        logger.error('Failed to delete job assignment:', error);
        return { success: false, error: error.message };
    }
}
