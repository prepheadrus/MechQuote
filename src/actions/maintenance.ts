'use server';

import { prisma } from '@/lib/prisma';
import { createTransaction } from './customer-transactions';
import { revalidatePath } from 'next/cache';
import { Product } from '@prisma/client';
import { logger } from '@/lib/logger';

// --- Re-added types for Duplicate Management ---
export interface DuplicateGroup {
    name: string;
    products: Array<{
        id: string;
        name: string;
        brand: string | null;
        category: string | null;
        listPrice: number;
        currency: string;
        _count: {
            invoiceItems: number;
            proposalItems: number;
            purchaseHistory: number;
        };
    }>;
}

/**
 * Find duplicate products by normalized name
 */
export async function findDuplicateProducts(): Promise<{ success: boolean; data?: DuplicateGroup[]; error?: string }> {
    try {
        const products = await prisma.product.findMany({ where: { isDeleted: false },
            include: {
                _count: {
                    select: {
                        invoiceItems: { where: { isDeleted: false } },
                        proposalItems: { where: { isDeleted: false } },
                        purchaseHistory: { where: { isDeleted: false } }
                    }
                }
            }
        });

        // Group by normalized name
        const groups: Record<string, Array<{
            id: string;
            name: string;
            brand: string | null;
            category: string | null;
            listPrice: number;
            currency: string;
            _count: {
                invoiceItems: number;
                proposalItems: number;
                purchaseHistory: number;
            };
        }>> = {};

        for (const p of products) {
            const normalized = p.name.trim().toLowerCase()
                .replace(/\s+/g, ' ')
                .replace(/[.,-]/g, ''); // Simple normalization

            if (!groups[normalized]) {
                groups[normalized] = [];
            }
            groups[normalized].push(p);
        }

        const duplicates: DuplicateGroup[] = [];
        for (const [key, group] of Object.entries(groups)) {
            if (group.length > 1) {
                // Use the name of the first product as the group display name
                duplicates.push({
                    name: group[0].name,
                    products: group
                });
            }
        }

        return { success: true, data: duplicates };

    } catch (error) {
        logger.error('Failed to find duplicates:', error);
        return { success: false, error: 'Çift kayıtlar taranırken hata oluştu.' };
    }
}

/**
 * Merge duplicate products into a master product
 */
export async function mergeProducts(masterId: string, duplicateIds: string[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Move Invoice Items
            await tx.invoiceItem.updateMany({
                where: { linkedProductId: { in: duplicateIds } },
                data: { linkedProductId: masterId }
            });

            // 2. Move Proposal Items
            await tx.proposalItem.updateMany({
                where: { productId: { in: duplicateIds } },
                data: { productId: masterId }
            });

            // 3. Move Purchase History
            await tx.purchaseHistory.updateMany({
                where: { productId: { in: duplicateIds } },
                data: { productId: masterId }
            });

            // 4. Move Recipe (if exists) - Complex because 1-to-1
            // If master has no recipe, but duplicate has one, move it?
            // If both have recipes, we might lose one. Let's assume Master wins or we skip.
            // For now, let's just delete duplicate recipes to clean up.

            // 5. Delete Duplicates
            await tx.product.updateMany({
    where: { id: { in: duplicateIds } },
    data: { isDeleted: true, deletedAt: new Date() }
});
        });

        revalidatePath('/products');
        return { success: true };
    } catch (error) {
        logger.error('Failed to merge products:', error);
        return { success: false, error: 'Ürünler birleştirilirken hata oluştu.' };
    }
}


/**
 * Scans all customers, invoices, and proposals to ensure
 * the transaction ledger and customer balances are correct.
 *
 * CORRECTED (2026-02-21):
 * - Outgoing invoices: Debt (customer owes us)
 * - Incoming invoices: Credit (we owe supplier)
 * - Proposals: Debt (customer owes us)
 */
export async function reconcileCustomerBalances() {
    try {
        logger.info('Starting reconciliation...');
        const logs: string[] = [];
        logs.push('Reconciliation started.');

        // 1. Get all existing Transaction Reference IDs to avoid duplicates
        const existingTransactions = await prisma.customerTransaction.findMany({ where: { isDeleted: false },
            select: { referenceId: true }
        });
        const existingRefs = new Set(existingTransactions.map(t => t.referenceId).filter(Boolean));
        logs.push(`Found ${existingRefs.size} existing transactions.`);

        // 2. Scan Invoices - CORRECTED: Different types for different invoice types
        const invoices = await prisma.invoice.findMany({
            where: { isDeleted: false,
                // status: { not: 'Draft' } // REMOVED FILTER to include Drafts
            }
        });

        let newInvoiceTxCount = 0;
        for (const invoice of invoices) {
            if (invoice.customerId && !existingRefs.has(invoice.id)) {
                // CORRECTED: Outgoing = Debt, Incoming = Credit
                const type = invoice.type === 'Outgoing' ? 'Debt' : 'Credit';

                await createTransaction({
                    customerId: invoice.customerId,
                    amount: invoice.totalAmount,
                    type: type,
                    description: `Fatura: ${invoice.invoiceNumber} (${invoice.type === 'Outgoing' ? 'Satış' : 'Alış'})`,
                    referenceId: invoice.id,
                    referenceType: 'Invoice',
                    category: invoice.type === 'Outgoing' ? 'Sales' : 'Purchase',
                    date: invoice.invoiceDate
                });
                newInvoiceTxCount++;
            }
        }
        logs.push(`Created ${newInvoiceTxCount} missing transactions from Invoices.`);

        // 3. Scan Proposals (Approved = Debt)
        const proposals = await prisma.proposal.findMany({
            where: { isDeleted: false,  status: 'Approved' }
        });

        let newProposalTxCount = 0;
        for (const proposal of proposals) {
            if (!existingRefs.has(proposal.id)) {
                await createTransaction({
                    customerId: proposal.customerId,
                    amount: proposal.totalAmount,
                    type: 'Debt',
                    description: `Teklif Onayı: ${proposal.quoteNumber} - ${proposal.projectName}`,
                    referenceId: proposal.id,
                    referenceType: 'Proposal',
                    category: 'Sales',
                    date: proposal.createdAt // Or updated at?
                });
                newProposalTxCount++;
            }
        }
        logs.push(`Created ${newProposalTxCount} missing transactions from Proposals.`);

        // 4. Recalculate Totals for ALL Customers
        const customers = await prisma.customer.findMany({ where: { isDeleted: false },
            include: {
                transactions: { where: { isDeleted: false } }
            }
        });

        for (const customer of customers) {
            // Calculate strictly from transactions
            const balance = customer.transactions.reduce((sum, t) => sum + t.amount, 0);

            if (Math.abs(customer.balance - balance) > 0.01) {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { balance }
                });
                logs.push(`Updated balance for ${customer.name}: ${customer.balance} -> ${balance}`);
            }
        }

        logs.push('Reconciliation completed successfully.');
        revalidatePath('/');
        return { success: true, logs };

    } catch (error: any) {
        logger.error('Reconciliation failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * FULL RESET: Recalculates customer balances from scratch based on transactions.
 * This deletes ALL existing customer transactions and recreates them from invoices and proposals.
 * USE WITH CAUTION - Only for fixing severely corrupted data.
 *
 * CORRECTED (2026-02-21):
 * - Outgoing invoices: Debt (positive balance)
 * - Incoming invoices: Credit (negative balance)
 */
export async function fullReconcileCustomerBalances() {
    try {
        logger.info('Starting FULL reconciliation (RESET)...');
        const logs: string[] = [];
        logs.push('Full reconciliation started.');

        await prisma.$transaction(async (tx) => {
            // 1. Reset all customer balances to zero
            await tx.customer.updateMany({
                data: { balance: 0 }
            });
            logs.push('All customer balances reset to 0.');

            // 2. Delete all existing transactions
            const deletedTxs = await tx.customerTransaction.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });
            logs.push(`Deleted ${deletedTxs.count} existing transactions.`);

            // Aggregated customer balances map
            const customerBalances = new Map<string, number>();

            // 3. Recreate transactions from ALL invoices (CORRECTED: Different types)
            const invoices = await tx.invoice.findMany({ where: { isDeleted: false },
                include: { customer: true }
            });

            let invoiceTxCount = 0;
            const invoiceTransactions = [];
            for (const invoice of invoices) {
                if (invoice.customerId) {
                    // CORRECTED: Outgoing = Debt (positive), Incoming = Credit (negative)
                    const type = invoice.type === 'Outgoing' ? 'Debt' : 'Credit';
                    const signedAmount = type === 'Debt'
                        ? invoice.totalAmount  // Positive: customer owes us
                        : -invoice.totalAmount; // Negative: we owe supplier

                    invoiceTransactions.push({
                        customerId: invoice.customerId,
                        amount: signedAmount,
                        type: type,
                        description: `Fatura: ${invoice.invoiceNumber} (${invoice.type === 'Outgoing' ? 'Satış' : 'Alış'})`,
                        referenceId: invoice.id,
                        referenceType: 'Invoice',
                        category: invoice.type === 'Outgoing' ? 'Sales' : 'Purchase',
                        date: invoice.invoiceDate
                    });

                    customerBalances.set(
                        invoice.customerId,
                        (customerBalances.get(invoice.customerId) || 0) + signedAmount
                    );

                    invoiceTxCount++;
                }
            }

            if (invoiceTransactions.length > 0) {
                await tx.customerTransaction.createMany({
                    data: invoiceTransactions
                });
            }
            logs.push(`Created ${invoiceTxCount} transactions from invoices.`);

            // 4. Recreate transactions from Approved proposals
            const proposals = await tx.proposal.findMany({
                where: { isDeleted: false,  status: 'Approved' }
            });

            let proposalTxCount = 0;
            const proposalTransactions = [];
            for (const proposal of proposals) {
                if (proposal.customerId) {
                    const signedAmount = proposal.totalAmount; // Positive = increases balance

                    proposalTransactions.push({
                        customerId: proposal.customerId,
                        amount: signedAmount,
                        type: 'Debt',
                        description: `Teklif Onayı: ${proposal.quoteNumber} - ${proposal.projectName}`,
                        referenceId: proposal.id,
                        referenceType: 'Proposal',
                        category: 'Sales',
                        date: proposal.createdAt
                    });

                    customerBalances.set(
                        proposal.customerId,
                        (customerBalances.get(proposal.customerId) || 0) + signedAmount
                    );

                    proposalTxCount++;
                }
            }

            if (proposalTransactions.length > 0) {
                await tx.customerTransaction.createMany({
                    data: proposalTransactions
                });
            }
            logs.push(`Created ${proposalTxCount} transactions from proposals.`);

            // 5. Bulk update customer balances
            for (const [customerId, increment] of customerBalances.entries()) {
                await tx.customer.update({
                    where: { id: customerId },
                    data: { balance: { increment } }
                });
            }
            logs.push(`Bulk updated balances for ${customerBalances.size} customers.`);
        });

        logs.push('Full reconciliation completed successfully.');
        revalidatePath('/');
        revalidatePath('/customers');
        return { success: true, logs };

    } catch (error: any) {
        logger.error('Full reconciliation failed:', error);
        return { success: false, error: error.message };
    }
}
