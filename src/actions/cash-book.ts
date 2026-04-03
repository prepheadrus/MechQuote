'use server';

import { prisma } from "@/lib/prisma";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createTransaction as createProjectTransaction } from "./transactions";
import { createTransaction as createCustomerTransaction } from "./customer-transactions";
import { createPersonnelTransaction } from "./personnel";
import { createSupplierTransaction } from "./supplier-transactions";
import { getSuppliers } from "./suppliers";

export interface CashEntry {
    id: string;
    date: Date;
    description: string;
    amount: number;
    type: 'IN' | 'OUT';
    category: string;
    source: string;
    entityName?: string;
    relatedId?: string;
    relatedType?: 'Project' | 'Customer' | 'Personnel' | 'Invoice' | 'Supplier';
}

/**
 * Get data for the Add Entry form
 */
export async function getCashBookFormData() {
    try {
        const [customers, projects, personnel, suppliersRes] = await Promise.all([
            prisma.customer.findMany({ where: { isDeleted: false },  select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            prisma.project.findMany({
                where: { isDeleted: false,  status: { notIn: ['PROJE_TAMAMLANDI', 'IPTAL_EDILDI', 'FATURALANDIRILDI_VE_KAPANDI'] } },
                select: { id: true, name: true, customerId: true },
                orderBy: { name: 'asc' }
            }),
            prisma.personnel.findMany({ where: { isDeleted: false,  status: 'Aktif' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
            getSuppliers()
        ]);

        return {
            success: true,
            customers,
            projects,
            personnel,
            suppliers: suppliersRes.success ? suppliersRes.data : []
        };
    } catch (error) {
        return { success: false, error: "Form verileri yüklenemedi." };
    }
}

/**
 * Unified action to add an entry from Cash Book
 */
export async function addCashEntry(data: {
    type: 'IN' | 'OUT';
    amount: number;
    date: Date | string;
    description: string;
    category: string;
    linkType: 'None' | 'Project' | 'Customer' | 'Personnel' | 'Supplier';
    entityId?: string;
    supplierId?: string;
    projectId?: string; // ✅ YENİ: Hangi proje için?
    metadata?: string; // ✅ YENİ: Ek bağlam (JSON)
}) {
    try {
        const { type, amount, date, description, category, linkType, entityId, supplierId, projectId, metadata } = data;

        if (linkType === 'Project' && entityId) {
            const result = await createProjectTransaction({
                description,
                amount,
                date,
                category,
                projectId: entityId,
                type: type === 'IN' ? 'Income' : 'Expense',
                supplierId: supplierId
            } as any);
            if (result.success) revalidatePath('/cash-book');
            return result;
        }

        if (linkType === 'Personnel' && entityId) {
            const result = await createPersonnelTransaction({
                personnelId: entityId,
                amount,
                type: 'Payment',
                category,
                description,
                date
            });
            
            // ✅ YENİ: Eğer proje seçildiyse, ProjectExpense olarak DA kaydet
            if (projectId) {
                await prisma.projectExpense.create({
                    data: {
                        projectId,
                        personnelId: entityId,
                        description: `Personel Ödemesi: ${description}`,
                        amount,
                        category: category || 'Personel Ödemesi',
                        type: 'Expense'
                    }
                });
            }
            
            if (result.success) revalidatePath('/cash-book');
            return result;
        }

        if (linkType === 'Customer' && entityId) {
            const result = await createCustomerTransaction({
                customerId: entityId,
                amount,
                type: type === 'IN' ? 'Payment' : 'Debt',
                description,
                category,
                date: new Date(date),
                referenceType: 'Manual',
                projectId // ✅ YENİ: Proje ID kaydet
            });
            if (result.success) revalidatePath('/cash-book');
            return result;
        }

        if (linkType === 'Supplier' && entityId) {
            const result = await createSupplierTransaction({
                supplierId: entityId,
                amount,
                type: type === 'OUT' ? 'Payment' : 'Debt',
                description,
                category,
                date: new Date(date),
                referenceType: 'Manual',
                projectId // ✅ YENİ: Proje ID kaydet
            });
            if (result.success) revalidatePath('/cash-book');
            return result;
        }

        return { success: false, error: "Lütfen işlemi bir müşteri, proje, personel veya tedarikçi ile ilişkilendirin." };

    } catch (error) {
        console.error("Add cash entry error:", error);
        return { success: false, error: "İşlem kaydedilemedi." };
    }
}

export const getCashBookEntries = cache(async function getCashBookEntries() {
    try {
        const [
            payments,
            projectExpenses,
            personnelTransactions,
            customerTransactions,
            supplierTransactions
        ] = await Promise.all([
            // 1. Invoice Payments (Exclude soft-deleted invoices)
            prisma.payment.findMany({
                where: { 
                    isDeleted: false,
                    invoice: {
                        isDeleted: false // ✅ Soft delete filtresi
                    }
                },
                include: {
                    invoice: {
                        include: {
                            customer: { select: { name: true } },
                            project: { select: { name: true } }
                        }
                    }
                }
            }),
            // 2. Project Manual Entries (Incomes and Expenses)
            prisma.projectExpense.findMany({
                where: { isDeleted: false }, // ✅ Soft delete filtresi
                include: {
                    project: {
                        include: { customer: { select: { name: true } } }
                    },
                    supplier: { select: { name: true } }
                } as any
            }),
            // 3. Personnel Payments from JobAssignments (Read paymentHistory field)
            (prisma as any).jobAssignment.findMany({
                where: { isDeleted: false },
                include: {
                    personnel: { select: { name: true } },
                    project: { select: { name: true } },
                    proposal: { select: { quoteNumber: { where: { isDeleted: false } } } }
                }
            }),
            // 4. Manual Customer Transactions (Payment/Collection)
            prisma.customerTransaction.findMany({
                where: {
                    // ✅ Show ALL customer transactions (not just Manual)
                    // Include: Payment (Tahsilat), Debt (Borç), Credit (Alacak), Opening (Açılış)
                    isDeleted: false
                },
                include: {
                    customer: { select: { name: true } }
                }
            }),
            // 5. Manual Supplier Transactions (Payment/Debt)
            (prisma as any).supplierTransaction.findMany({
                where: {
                    // ✅ Show ALL supplier transactions (not just Manual)
                    isDeleted: false
                },
                include: {
                    supplier: { select: { name: true } }
                }
            })
        ]) as [any[], any[], any[], any[], any[]];

        const entries: CashEntry[] = [];

        // Map Invoice Payments
        payments.forEach((p: any) => {
            const isIncome = p.invoice.type === 'Outgoing';
            entries.push({
                id: `pay-${p.id}`,
                date: p.date,
                description: p.note || `Fatura Ödemesi (${p.invoice.invoiceNumber})`,
                amount: p.amount,
                type: isIncome ? 'IN' : 'OUT',
                category: isIncome ? 'Tahsilat' : 'Tedarikçi Ödemesi',
                source: isIncome ? 'Müşteri' : 'Tedarikçi',
                entityName: p.invoice.customer?.name || p.invoice.senderName || p.invoice.receiverName || 'Bilinmiyor',
                relatedId: p.invoiceId,
                relatedType: 'Invoice'
            });
        });

        // Create a set of IDs that are already represented in other categories to avoid double counting
        const personnelTxIds = new Set(personnelTransactions.map((pt: any) => pt.id));

        // Map Project Expenses/Incomes
        projectExpenses.forEach((pe: any) => {
            // SYNC DEDUPLICATION: 
            // If this project expense is a mirror of a personnel payment (shared ID from JobAssignments),
            // we skip it here and show it in the Personnel mapping instead for better entity context.
            if (personnelTxIds.has(pe.id)) return;

            const isIncome = pe.type === 'Income';
            entries.push({
                id: `pxp-${pe.id}`,
                date: pe.date,
                description: pe.description,
                amount: pe.amount,
                type: isIncome ? 'IN' : 'OUT',
                category: pe.category,
                source: 'Proje',
                entityName: pe.project.name,
                relatedId: pe.projectId,
                relatedType: 'Project'
            });
        });

        // Map Personnel Payments from JobAssignments (paymentHistory field)
        personnelTransactions.forEach((ja: any) => {
            if (!ja.paymentHistory) return;
            
            try {
                const history = typeof ja.paymentHistory === 'string' 
                    ? JSON.parse(ja.paymentHistory) 
                    : ja.paymentHistory;
                
                if (!Array.isArray(history)) return;
                
                const entityName = ja.project?.name
                    ? `${ja.personnel.name} (${ja.project.name})`
                    : ja.personnel.name;

                history.forEach((payment: any, index: number) => {
                    entries.push({
                        id: `ptx-${ja.id}-${index}`,
                        date: new Date(payment.date) || ja.assignedAt,
                        description: payment.note || `${index + 1}. Hakediş Ödemesi`,
                        amount: payment.amount || 0,
                        type: 'OUT',
                        category: 'Personel Ödemesi',
                        source: 'Personel',
                        entityName: entityName,
                        relatedId: ja.personnelId,
                        relatedType: 'Personnel'
                    });
                });
            } catch (e) {
                // Skip if parsing fails
            }
        });

        // Map Customer Transactions
        // ONLY include actual cash movements (Payment/Collection)
        // DO NOT include Debt (invoice creation) - that's accounts receivable, not cash
        const validCustomerTransactions: any[] = [];
        for (const ct of customerTransactions) {
            // Skip cancelled invoice transactions
            if (ct.description && (
                ct.description.includes('Fatura iptal edildi') ||
                ct.description.includes('Invoice_Cancelled')
            )) {
                continue;
            }
            
            // ONLY include Payment type (actual cash received)
            // Skip Debt (invoice creation), Credit, Opening
            if (ct.type !== 'Payment') {
                continue;
            }
            
            // Check if this transaction is linked to a soft-deleted invoice
            if (ct.referenceType === 'Invoice' && ct.referenceId) {
                const invoice = await prisma.invoice.findFirst({
                    where: { isDeleted: false,  id: ct.referenceId },
                    select: { isDeleted: true }
                });
                if (invoice?.isDeleted) {
                    continue; // Skip soft-deleted invoice transactions
                }
            }
            
            validCustomerTransactions.push(ct);
        }
        
        validCustomerTransactions.forEach((ct: any) => {
            // Payment = IN (Giriş - actual cash received)
            entries.push({
                id: `ctx-${ct.id}`,
                date: ct.date,
                description: ct.description || 'Tahsilat',
                amount: Math.abs(ct.amount),
                type: 'IN',
                category: ct.category || 'Tahsilat',
                source: 'Müşteri',
                entityName: ct.customer.name,
                relatedId: ct.customerId,
                relatedType: 'Customer'
            });
        });

        // Map Supplier Transactions
        // ONLY include actual cash payments (money paid to suppliers)
        // DO NOT include Debt (invoice received) - that's accounts payable, not cash
        const validSupplierTransactions: any[] = [];
        for (const st of supplierTransactions) {
            // ONLY include Payment type (actual cash paid)
            // Skip Debt (invoice received), Credit, Opening
            if (st.type !== 'Payment') {
                continue;
            }
            
            // Check if this transaction is linked to a soft-deleted invoice
            if (st.referenceType === 'Invoice' && st.referenceId) {
                const invoice = await prisma.invoice.findFirst({
                    where: { isDeleted: false,  id: st.referenceId },
                    select: { isDeleted: true }
                });
                if (invoice?.isDeleted) {
                    continue; // Skip soft-deleted invoice transactions
                }
            }
            
            validSupplierTransactions.push(st);
        }
        
        validSupplierTransactions.forEach((st: any) => {
            // Payment = OUT (Çıkış - actual cash paid to supplier)
            entries.push({
                id: `stx-${st.id}`,
                date: st.date,
                description: st.description || 'Tedarikçi Ödemesi',
                amount: Math.abs(st.amount),
                type: 'OUT',
                category: st.category || 'Tedarikçi Ödemesi',
                source: 'Tedarikçi',
                entityName: st.supplier.name,
                relatedId: st.supplierId,
                relatedType: 'Supplier'
            });
        });

        // Sort by date descending
        const sortedEntries = entries.sort((a, b) => b.date.getTime() - a.date.getTime());

        return { success: true, data: sortedEntries };
    } catch (error) {
        console.error("Cash book error:", error);
        return { success: false, error: "Kasa dökümü hazırlanırken bir hata oluştu." };
    }
});
