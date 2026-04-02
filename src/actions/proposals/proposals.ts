'use server'

import { prisma } from '@/lib/prisma';
import { Proposal, ProposalItem, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/services/audit-service';
import { deleteProjectInternal, createProjectFromProposalInternal } from '../projects/projects';
import { calculateItemTotals } from '@/lib/pricing';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProposalItemWithGroup {
    productId: string | null;
    name: string;
    brand: string | null;
    model: string | null;
    quantity: number;
    unit: string | null;
    listPrice: number;
    currency: string;
    discountRate: number;
    profitMargin: number;
    basePrice: number;
    vatRate: number;
    priceIncludesVat: boolean;
    orderIndex: number;
    groupName: string | null;
    groupDescription: string | null;
}

interface ProposalItemWithMetrics extends ProposalItem {
    metrics: ReturnType<typeof calculateItemTotals>;
}

interface ProposalDiffItem {
    old: ProposalItemWithMetrics;
    new: ProposalItemWithMetrics;
    changes: string[];
}

// ============================================================================
// HELPER FUNCTIONS - updateProposalStatus internal logic
// ============================================================================

/**
 * Handle stock reservation when proposal is approved
 */
async function handleStockReservationOnApproval(tx: any, proposal: any) {
    for (const item of proposal.items) {
        if (item.productId) {
            const productExists = await tx.product.findFirst({
                where: { isDeleted: false,  id: item.productId },
                select: { id: true }
            });

            if (productExists) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { reservedQuantity: { increment: item.quantity } }
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        type: 'RESERVED',
                        description: `Teklif onayı ile rezervasyon: ${proposal.quoteNumber}`,
                        referenceId: item.id,
                        projectId: proposal.projectId
                    }
                });
            }
        }
    }
}

/**
 * Handle stock release when proposal approval is cancelled
 */
async function handleStockReleaseOnCancel(tx: any, proposal: any) {
    for (const item of proposal.items) {
        if (item.productId) {
            const productExists = await tx.product.findFirst({
                where: { isDeleted: false,  id: item.productId },
                select: { id: true }
            });

            if (productExists) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { reservedQuantity: { decrement: item.quantity } }
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: item.quantity,
                        type: 'RESERVE_RELEASED',
                        description: `Teklif iptali/değişikliği ile rezervasyon kaldırıldı: ${proposal.quoteNumber}`,
                        referenceId: item.id,
                        projectId: proposal.projectId
                    }
                });
            }
        }
    }
}

/**
 * Handle customer transaction when proposal is approved
 */
async function handleCustomerTransactionOnApproval(tx: any, proposal: any) {
    await tx.customerTransaction.create({
        data: {
            customerId: proposal.customerId,
            amount: proposal.totalAmount,
            type: 'Debt',
            description: `Teklif Onayı: ${proposal.quoteNumber}`,
            referenceId: proposal.id,
            referenceType: 'Proposal',
            category: 'Sales',
            date: new Date()
        }
    });
    await tx.customer.update({
        where: { id: proposal.customerId },
        data: {
            balance: { increment: proposal.totalAmount },
            approvedProposalsCount: { increment: 1 },
            lastProposalDate: new Date()
        }
    });
}

/**
 * Revert customer transaction when proposal approval is cancelled
 */
async function revertCustomerTransactionOnCancel(tx: any, proposal: any) {
    if (proposal.projectId) {
        // Project exists: Delete it
        await deleteProjectInternal(proposal.projectId, tx);

        // Force the requested status
        await tx.proposal.update({
            where: { id: proposal.id },
            data: { status: proposal.newStatus }
        });
    } else {
        // No project: Manual cleanup
        await tx.customerTransaction.updateMany({
    where: {
                referenceId: proposal.id,
                referenceType: 'Proposal',
                type: 'Debt'
            },
    data: { isDeleted: true, deletedAt: new Date() }
});

        await tx.customer.update({
            where: { id: proposal.customerId },
            data: {
                balance: { decrement: proposal.totalAmount },
                approvedProposalsCount: { decrement: 1 }
            }
        });
    }
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

// Define a strict type for proposal statuses to avoid magic strings
export type ProposalStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Cancelled';

const VALID_PROPOSAL_STATUSES: ProposalStatus[] = ['Draft', 'Sent', 'Approved', 'Rejected', 'Cancelled'];

// Type for proposal with items
type ProposalWithItems = Proposal & {
    items: ProposalItem[];
};

/**
 * Get proposal list
 * @deprecated Use getProposalList instead
 */
export async function getProposals(filters?: {
    status?: ProposalStatus;
    customerId?: string;
}) {
    return getProposalList(filters);
}

export async function getProposalList(filters?: {
    status?: ProposalStatus;
    customerId?: string;
}) {
    try {
        const where: Prisma.ProposalWhereInput = {
            isDeleted: false
        };

        if (filters?.status && VALID_PROPOSAL_STATUSES.includes(filters.status)) {
            where.status = filters.status;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        const proposals = await prisma.proposal.findMany({
            where,
            include: {
                customer: true,
                items: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { orderIndex: 'asc' }
                },
                jobAssignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        personnel: true // Tekil ilişki - where desteklenmiyor
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { success: true, data: proposals };
    } catch (error) {
        logger.error('Failed to fetch proposals:', error);
        return { success: false, error: 'Teklifler yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get proposals with analytics
 * @deprecated Use getProposalAnalytics instead
 */
export async function getProposalsWithAnalytics() {
    return getProposalAnalytics();
}

export async function getProposalAnalytics() {
    try {
        const [proposals, customers] = await Promise.all([
            prisma.proposal.findMany({
                where: { isDeleted: false },
                include: {
                    customer: true,
                    items: {
                        where: { isDeleted: false }, // ✅ Soft delete filtresi
                        orderBy: { orderIndex: 'asc' }
                    },
                    jobAssignments: {
                        where: { isDeleted: false }, // ✅ Soft delete filtresi
                        include: {
                            personnel: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.customer.findMany({
                where: { isDeleted: false },
                select: { id: true, name: true }
            })
        ]);

        // Calculate analytics
        const totalProposals = proposals.length;
        const approvedProposals = proposals.filter(p => p.status === 'Approved').length;
        const totalValue = proposals
            .filter(p => p.status === 'Approved')
            .reduce((sum, p) => sum + p.totalAmount, 0);

        const averageValue = approvedProposals > 0 ? totalValue / approvedProposals : 0;
        const conversionRate = totalProposals > 0 ? (approvedProposals / totalProposals) * 100 : 0;

        return {
            success: true,
            data: {
                proposals,
                customers,
                analytics: {
                    totalProposals,
                    approvedProposals,
                    totalValue,
                    averageValue,
                    conversionRate
                }
            }
        };
    } catch (error) {
        logger.error('Failed to fetch proposals with analytics:', error);
        return { success: false, error: 'Teklif verileri yüklenirken hata oluştu.' };
    }
}

/**
 * Get a single proposal by ID
 */
export async function getProposal(id: string) {
    try {
        const proposal = await prisma.proposal.findFirst({
            where: { id, isDeleted: false },
            include: {
                customer: true,
                items: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { orderIndex: 'asc' }
                },
                jobAssignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        personnel: true // Tekil ilişki - where desteklenmiyor
                    }
                }
            }
        });

        if (!proposal) {
            return { success: false, error: 'Teklif bulunamadı.' };
        }

        return { success: true, data: proposal };
    } catch (error) {
        logger.error('Failed to fetch proposal:', error);
        return { success: false, error: 'Teklif yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get proposal with all data needed for printing (includes settings)
 */
export async function getProposalForPrint(id: string) {
    try {
        const proposal = await prisma.proposal.findFirst({
            where: { id, isDeleted: false },
            include: {
                customer: true,
                items: { where: { isDeleted: false },
                    orderBy: { orderIndex: 'asc' }
                }
            }
        });

        if (!proposal) {
            return { success: false, error: 'Teklif bulunamadı.' };
        }

        const settings = await prisma.settings.findFirst({ where: { isDeleted: false } });

        return {
            success: true,
            data: {
                proposal,
                items: proposal.items,
                customer: proposal.customer,
                settings
            }
        };
    } catch (error) {
        logger.error('Failed to fetch proposal for print:', error);
        return { success: false, error: 'Teklif yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get all versions of a proposal
 */
export async function getProposalVersions(rootProposalId: string) {
    try {
        const versions = await prisma.proposal.findMany({
            where: { rootProposalId, isDeleted: false },
            include: {
                customer: true,
                items: { where: { isDeleted: false },
                    orderBy: { orderIndex: 'asc' }
                }
            },
            orderBy: { version: 'desc' }
        });

        return { success: true, data: versions };
    } catch (error) {
        logger.error('Failed to fetch proposal versions:', error);
        return { success: false, error: 'Teklif versiyonları yüklenirken hata oluştu.' };
    }
}

/**
 * Create a new proposal
 */
export async function createProposal(data: {
    customerId: string;
    customerName: string;
    projectName: string;
    quoteNumber: string;
    projectId?: string;
    exchangeRateUSD?: number;
    exchangeRateEUR?: number;
    termsAndConditions?: string;
    tags?: string;
    items: Omit<ProposalItem, 'id' | 'proposalId'>[];
}) {
    try {
        // REFACTOR: Use the central pricing engine from `pricing.ts` as per .cursorrules
        const totalAmount = data.items.reduce((sum, item) => {
            let exchangeRate = 1;
            if (item.currency === 'USD') exchangeRate = data.exchangeRateUSD || 1;
            else if (item.currency === 'EUR') exchangeRate = data.exchangeRateEUR || 1;

            const totals = calculateItemTotals({
                ...item,
                exchangeRate,
            });

            // The totalAmount in Proposal model is VAT-exclusive.
            // `totalTlSell` from the pricing engine is also VAT-exclusive.
            return sum + totals.totalTlSell;
        }, 0);

        const proposal = await prisma.proposal.create({
            data: {
                customerId: data.customerId,
                customerName: data.customerName,
                projectName: data.projectName,
                projectId: data.projectId,
                quoteNumber: data.quoteNumber,
                totalAmount: totalAmount, // Use server-calculated total
                exchangeRateUSD: data.exchangeRateUSD || 0,
                exchangeRateEUR: data.exchangeRateEUR || 0,
                termsAndConditions: data.termsAndConditions,
                tags: data.tags,
                rootProposalId: '', // Will be updated below
                items: {
                    create: data.items
                }
            },
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        // Set rootProposalId to its own ID for the first version
        await prisma.proposal.update({
            where: { id: proposal.id },
            data: { rootProposalId: proposal.id }
        });

        await createAuditLog(
            'CREATE',
            'Proposal',
            proposal.id,
            `Yeni teklif oluşturuldu: ${proposal.quoteNumber} - ${proposal.customerName}`,
            null, // UserId 
            'System' // Username
        );

        revalidatePath('/quotes');
        return { success: true, data: proposal };
    } catch (error) {
        logger.error('Failed to create proposal:', error);
        return { success: false, error: 'Teklif oluşturulurken bir hata oluştu.' };
    }
}

/**
 * Update an existing proposal
 */
export async function updateProposal(
    id: string,
    data: Partial<Omit<Proposal, 'id' | 'createdAt'>>
) {
    try {
        const proposal = await prisma.proposal.update({
            where: { id },
            data,
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        revalidatePath('/quotes');
        revalidatePath(`/quotes/${id}`);
        return { success: true, data: proposal };
    } catch (error) {
        logger.error('Failed to update proposal:', error);
        return { success: false, error: 'Teklif güncellenirken bir hata oluştu.' };
    }
}

/**
 * Update proposal status with automatic stock and financial handling
 */
export async function updateProposalStatus(id: string, newStatus: ProposalStatus) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const currentProposal = await tx.proposal.findFirst({
                where: { id, isDeleted: false },
                include: { items: { where: { isDeleted: false } } }
            });

            if (!currentProposal) throw new Error("Teklif bulunamadı.");

            const oldStatus = currentProposal.status;
            if (oldStatus === newStatus) return currentProposal;

            // Update status
            const updatedProposal = await tx.proposal.update({
                where: { id },
                data: { status: newStatus },
                include: { items: { where: { isDeleted: false } } }
            });

            // Handle stock movements
            if (newStatus === 'Approved' && oldStatus !== 'Approved') {
                await handleStockReservationOnApproval(tx, updatedProposal);
            } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
                await handleStockReleaseOnCancel(tx, updatedProposal);
            }

            // Handle customer transactions
            if (newStatus === 'Approved' && oldStatus !== 'Approved') {
                await handleCustomerTransactionOnApproval(tx, updatedProposal);

                // Auto-create project if not linked
                if (!updatedProposal.projectId) {
                    await createProjectFromProposalInternal(updatedProposal, tx);
                }
            } else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
                await revertCustomerTransactionOnCancel(tx, { ...updatedProposal, newStatus });
            }

            return updatedProposal;
        });

        revalidatePath('/quotes');
        revalidatePath(`/quotes/${id}`);
        revalidatePath('/customers');
        return { success: true, data: result };
    } catch (error: any) {
        logger.error('Failed to update proposal status:', error);
        return { success: false, error: error.message || 'Teklif durumu güncellenirken hata oluştu.' };
    }
}

/**
 * Create a new version of a proposal
 */
export async function createProposalVersion(
    originalId: string,
    versionNote?: string
) {
    try {
        const original = await prisma.proposal.findFirst({
            where: { id: originalId, isDeleted: false },
            include: {
                items: { where: { isDeleted: false } },
                jobAssignments: { where: { isDeleted: false } }
            }
        });

        if (!original) {
            return { success: false, error: 'Orijinal teklif bulunamadı.' };
        }

        // Get the latest version number
        const latestVersion = await prisma.proposal.findFirst({
            where: { rootProposalId: original.rootProposalId || original.id, isDeleted: false },
            orderBy: { version: 'desc' }
        });

        const newVersion = (latestVersion?.version || 0) + 1;

        // FIX: Determine base quote number to prevent "Q-001-v1-v2" pattern
        let baseQuoteNumber = original.quoteNumber;
        // If original is a version (not root), fetch root to get clean number
        if (original.rootProposalId && original.rootProposalId !== original.id) {
            const root = await prisma.proposal.findFirst({ where: { isDeleted: false,  id: original.rootProposalId } });
            if (root) baseQuoteNumber = root.quoteNumber;
        }
        // If original is root, baseQuoteNumber is already correct (e.g. "Q-001")

        // Create new proposal version
        const newProposal = await prisma.proposal.create({
            data: {
                rootProposalId: original.rootProposalId || original.id,
                version: newVersion,
                status: 'Draft',
                quoteNumber: `${baseQuoteNumber}-v${newVersion}`,
                customerName: original.customerName,
                customerId: original.customerId,
                projectName: original.projectName,
                totalAmount: original.totalAmount,
                exchangeRateUSD: original.exchangeRateUSD,
                exchangeRateEUR: original.exchangeRateEUR,
                termsAndConditions: original.termsAndConditions,
                tags: original.tags,
                versionNote,
                items: {
                    create: original.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        brand: item.brand,
                        model: item.model,
                        quantity: item.quantity,
                        unit: item.unit,
                        listPrice: item.listPrice,
                        currency: item.currency,
                        discountRate: item.discountRate,
                        profitMargin: item.profitMargin,
                        groupName: item.groupName,
                        basePrice: item.basePrice,
                        vatRate: item.vatRate,
                        priceIncludesVat: item.priceIncludesVat,
                        orderIndex: item.orderIndex
                    }))
                }
            },
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        revalidatePath('/quotes');
        return { success: true, data: newProposal };
    } catch (error) {
        logger.error('Failed to create proposal version:', error);
        return { success: false, error: 'Yeni versiyon oluşturulurken hata oluştu.' };
    }
}

/**
 * Copy a proposal to a different customer
 */
export async function copyProposalToCustomer(
    originalId: string,
    targetCustomerId: string,
    customProjectName?: string
) {
    try {
        logger.info(`[copyProposalToCustomer] Copying ${originalId} to ${targetCustomerId}`);
        const [original, targetCustomer, settings] = await Promise.all([
            prisma.proposal.findFirst({
                where: { id: originalId, isDeleted: false },
                include: { items: { where: { isDeleted: false } } }
            }),
            prisma.customer.findFirst({
                where: { id: targetCustomerId, isDeleted: false } 
            }),
            prisma.settings.findFirst({ where: { isDeleted: false } })
        ]);

        if (!original) {
            return { success: false, error: 'Kopyalanacak orijinal teklif bulunamadı.' };
        }
        if (!targetCustomer) {
            return { success: false, error: 'Hedef müşteri bulunamadı.' };
        }

        const productIds = original.items
            .map(item => item.productId)
            .filter((id): id is string => id !== null);

        const products = await prisma.product.findMany({
            where: { id: { in: productIds }, isDeleted: false }
        });
        const productMap = new Map(products.map(p => [p.id, p]));

        // Create new items, updating prices from the product catalog
        const newItems = original.items.map(item => {
            const product = item.productId ? productMap.get(item.productId) : null;
            return {
                ...item,
                // If product exists in catalog, use its current price. Otherwise, keep original price.
                listPrice: product ? (product.listPrice || 0) : (item.listPrice || 0),
                basePrice: product ? (product.basePrice || 0) : (item.basePrice || 0),
                currency: product ? product.currency : (item.currency || 'TRY'),
                // Reset profit margin and discount to defaults or keep them?
                // Let's keep them for now, as they are part of the original proposal's structure.
            };
        });

        // REFACTOR: Use dynamic exchange rates from settings, not hardcoded values.
        const exchangeRateUSD = settings?.defaultExchangeRateUSD || 1;
        const exchangeRateEUR = settings?.defaultExchangeRateEUR || 1;


        // REFACTOR: Use the central pricing engine from `pricing.ts` as per .cursorrules
        const totalAmount = newItems.reduce((sum, item) => {
            let exchangeRate = 1;
            if (item.currency === 'USD') exchangeRate = exchangeRateUSD;
            else if (item.currency === 'EUR') exchangeRate = exchangeRateEUR;

            const totals = calculateItemTotals({
                ...item,
                exchangeRate,
            });
            return sum + totals.totalTlSell;
        }, 0);


        // Create a new proposal (as v1) for the target customer
        const newProposal = await prisma.proposal.create({
            data: {
                version: 1,
                status: 'Draft',
                quoteNumber: `COPY-${original.quoteNumber}`, // More descriptive
                customerName: targetCustomer.name,
                customerId: targetCustomer.id,
                projectName: customProjectName || `${original.projectName} (Kopya)`,
                totalAmount,
                exchangeRateUSD,
                exchangeRateEUR,
                termsAndConditions: original.termsAndConditions,
                tags: original.tags,
                rootProposalId: '', // Temporary
                versionNote: `"'${original.quoteNumber}' numaralı tekliften kopyalandı."`,
                items: {
                    create: newItems.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        brand: item.brand,
                        model: item.model,
                        quantity: item.quantity,
                        unit: item.unit,
                        listPrice: item.listPrice,
                        currency: item.currency,
                        discountRate: item.discountRate,
                        profitMargin: item.profitMargin,
                        groupName: item.groupName,
                        basePrice: item.basePrice,
                        vatRate: item.vatRate,
                        priceIncludesVat: item.priceIncludesVat,
                        orderIndex: item.orderIndex
                    }))
                }
            },
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        // Set its own ID as the root ID
        await prisma.proposal.update({
            where: { id: newProposal.id },
            data: { rootProposalId: newProposal.id }
        });


        revalidatePath('/quotes');
        return { success: true, data: newProposal };
    } catch (error: any) {
        logger.error('Failed to copy proposal:', error);
        return { success: false, error: `Teklif kopyalanırken bir hata oluştu: ${error?.message || 'Bilinmeyen hata'}` };
    }
}

/**
 * Delete a proposal
 */
export async function deleteProposal(id: string) {
    try {
        // Loglama için silinmeden önce veriyi çek
        const proposal = await prisma.proposal.findFirst({
            where: { id, isDeleted: false } 
        });

        await prisma.proposal.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        if (proposal) {
            await createAuditLog(
                'DELETE',
                'Proposal',
                id,
                `Teklif silindi. No: ${proposal.quoteNumber}, Müşteri: ${proposal.customerName}, Tutar: ${proposal.totalAmount}`,
                null,
                'System'
            );
        }

        revalidatePath('/quotes');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete proposal:', error);
        return { success: false, error: 'Teklif silinirken bir hata oluştu.' };
    }
}

/**
 * Update proposal items
 */
/**
 * Update proposal items
 */
export async function updateProposalItems(
    proposalId: string,
    items: ProposalItemWithGroup[]
) {
    try {
        const updatedProposal = await prisma.$transaction(async (tx) => {
            // Delete existing items
            await tx.proposalItem.updateMany({ where: { proposalId }, data: { isDeleted: true, deletedAt: new Date() } });

            // Create new items one by one to handle groupDescription
            for (const item of items) {
                const { groupDescription, ...itemWithoutGroupDesc } = item;
                await tx.proposalItem.create({
                    data: {
                        ...itemWithoutGroupDesc,
                        proposalId,
                        // groupDescription'ı manuel ekle (Prisma Client'da henüz yok)
                        ...(groupDescription ? { groupDescription } : {})
                    },
    data: { isDeleted: true, deletedAt: new Date() }
});
            }

            // Recalculate total amount
            const proposalWithNewItems = await tx.proposal.findFirst({
                where: { isDeleted: false,  id: proposalId },
                include: { items: { where: { isDeleted: false } } }
            });

            if (!proposalWithNewItems) {
                throw new Error("Teklif bulunamadı.");
            }

            // REFACTOR: Use the central pricing engine from `pricing.ts` as per .cursorrules
            const totalAmount = proposalWithNewItems.items.reduce((sum, item) => {
                let exchangeRate = 1;
                if (item.currency === 'USD') exchangeRate = proposalWithNewItems.exchangeRateUSD || 1;
                else if (item.currency === 'EUR') exchangeRate = proposalWithNewItems.exchangeRateEUR || 1;

                const totals = calculateItemTotals({
                    ...item,
                    exchangeRate,
                });

                return sum + totals.totalTlSell;
            }, 0);

            return tx.proposal.update({
                where: { id: proposalId },
                data: { totalAmount }
            });
        });

        revalidatePath('/quotes');
        revalidatePath(`/quotes/${proposalId}`);
        return { success: true, data: updatedProposal };
    } catch (error) {
        logger.error('Failed to update proposal items:', error);
        return { success: false, error: 'Teklif kalemleri güncellenirken bir hata oluştu.' };
    }
}

/**
 * Update costs (basePrice) for specific items in a proposal
 */
export async function updateProposalItemCosts(
    proposalId: string,
    updates: { itemId?: string; productId?: string; newCost: number; currency: string }[]
) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            for (const update of updates) {
                if (update.itemId) {
                    await tx.proposalItem.update({
                        where: { id: update.itemId },
                        data: {
                            basePrice: update.newCost,
                            currency: update.currency
                        }
                    });
                } else if (update.productId) {
                    // Update all items in this proposal that match the productId
                    await tx.proposalItem.updateMany({
                        where: {
                            proposalId,
                            productId: update.productId
                        },
                        data: {
                            basePrice: update.newCost,
                            currency: update.currency
                        }
                    });
                }
            }

            // Recalculate total amount
            const proposal = await tx.proposal.findFirst({
                where: { isDeleted: false,  id: proposalId },
                include: { items: { where: { isDeleted: false } } }
            });

            if (!proposal) throw new Error("Teklif bulunamadı.");

            // REFACTOR: Use the central pricing engine from `pricing.ts` as per .cursorrules
            const totalAmount = proposal.items.reduce((sum, item) => {
                let exchangeRate = 1;
                if (item.currency === 'USD') exchangeRate = proposal.exchangeRateUSD || 1;
                else if (item.currency === 'EUR') exchangeRate = proposal.exchangeRateEUR || 1;

                const totals = calculateItemTotals({
                    ...item,
                    exchangeRate,
                });

                return sum + totals.totalTlSell;
            }, 0);

            return tx.proposal.update({
                where: { id: proposalId },
                data: { totalAmount }
            });
        });

        revalidatePath(`/quotes/${proposalId}`);
        return { success: true, data: result };
    } catch (error: any) {
        logger.error('Failed to update costs:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Compare two proposals and return the differences
 */
export async function getProposalDiff(oldProposalId: string, newProposalId: string) {
    try {
        const [oldP, newP] = await prisma.$transaction([
            prisma.proposal.findFirst({
                where: { id: oldProposalId, isDeleted: false },
                include: { items: { where: { isDeleted: false } } }
            }),
            prisma.proposal.findFirst({
                where: { id: newProposalId, isDeleted: false },
                include: { items: { where: { isDeleted: false } } }
            })
        ]);

        if (!oldP || !newP) {
            return { success: false, error: 'Karşılaştırılacak tekliflerden biri bulunamadı.' };
        }

        // REFACTOR: Use the central pricing engine from `pricing.ts` as per .cursorrules
        const calculateItemMetrics = (item: ProposalItem, proposal: typeof oldP) => {
            let exchangeRate = 1;
            if (item.currency === 'USD') exchangeRate = proposal.exchangeRateUSD || 1;
            else if (item.currency === 'EUR') exchangeRate = proposal.exchangeRateEUR || 1;

            return calculateItemTotals({ ...item, exchangeRate });
        };

        // Enrich items with unitPrice
        const oldItems = oldP.items.map(i => ({ ...i, metrics: calculateItemMetrics(i, oldP) }));
        const newItems = newP.items.map(i => ({ ...i, metrics: calculateItemMetrics(i, newP) }));

        // 1. General Differences
        const diffAmount = newP.totalAmount - oldP.totalAmount;
        const generalDiff = {
            totalAmount: {
                old: oldP.totalAmount,
                new: newP.totalAmount,
                diff: diffAmount,
                percent: oldP.totalAmount > 0 ? (diffAmount / oldP.totalAmount) * 100 : 0
            },
            status: {
                old: oldP.status,
                new: newP.status,
                changed: oldP.status !== newP.status
            },
            exchangeRateUSD: {
                old: oldP.exchangeRateUSD,
                new: newP.exchangeRateUSD,
                changed: oldP.exchangeRateUSD !== newP.exchangeRateUSD
            },
            exchangeRateEUR: {
                old: oldP.exchangeRateEUR,
                new: newP.exchangeRateEUR,
                changed: oldP.exchangeRateEUR !== newP.exchangeRateEUR
            }
        };

        // 2. Item Differences
        // Helper to generate a key for items
        const getItemKey = (item: ProposalItem): string => {
            return item.productId ? `PID:${item.productId}` : `NAME:${item.name}`;
        };

        // Map old items for easy lookup
        const oldItemsMap = new Map<string, ProposalItemWithMetrics[]>();
        oldItems.forEach(item => {
            const key = getItemKey(item);
            const list = oldItemsMap.get(key) || [];
            list.push(item);
            oldItemsMap.set(key, list);
        });

        const added: ProposalItemWithMetrics[] = [];
        const removed: ProposalItemWithMetrics[] = [];
        const updated: ProposalDiffItem[] = [];
        const unchanged: ProposalItemWithMetrics[] = [];

        // Iterate new items to find matches
        // We use a copy of the list to pop items so we handle duplicates correctly (e.g. 2 same cables)
        for (const newItem of newItems) {
            const key = getItemKey(newItem);
            const oldList = oldItemsMap.get(key);

            if (oldList && oldList.length > 0) {
                // Match found (pop one to handle duplicates)
                const oldItem = oldList.shift()!;

                // Check specific fields for changes
                const changes: string[] = [];
                if (oldItem.quantity !== newItem.quantity) changes.push('quantity');
                // Compare the final TL sell price per unit
                if (Math.abs(oldItem.metrics.tlSellPrice - newItem.metrics.tlSellPrice) > 0.01) changes.push('price');
                if (oldItem.profitMargin !== newItem.profitMargin) changes.push('margin');

                // For simplified view, if any of these change, we consider it updated
                if (changes.length > 0) {
                    updated.push({ old: oldItem, new: newItem, changes });
                } else {
                    unchanged.push(newItem);
                }
            } else {
                // No match in old items -> ADDED
                added.push(newItem);
            }
        }

        // Remaining items in oldItemsMap are REMOVED
        oldItemsMap.forEach((list) => {
            list.forEach(item => removed.push(item));
        });

        // 3. Profit Analysis
        const calculateTotalProfit = (items: typeof oldItems) => {
            return items.reduce((sum, item) => sum + item.metrics.totalProfit, 0);
        };

        const oldProfit = calculateTotalProfit(oldItems);
        const newProfit = calculateTotalProfit(newItems);
        const diffProfit = newProfit - oldProfit;

        const marginOld = oldP.totalAmount > 0 ? (oldProfit / oldP.totalAmount) * 100 : 0;
        const marginNew = newP.totalAmount > 0 ? (newProfit / newP.totalAmount) * 100 : 0;

        const profitDiff = {
            old: oldProfit,
            new: newProfit,
            diff: diffProfit,
            percent: oldProfit > 0 ? (diffProfit / oldProfit) * 100 : 0,
            marginOld,
            marginNew
        };

        return {
            success: true,
            data: {
                oldParams: {
                    id: oldP.id,
                    version: oldP.version,
                    number: oldP.quoteNumber,
                    date: oldP.createdAt
                },
                newParams: {
                    id: newP.id,
                    version: newP.version,
                    number: newP.quoteNumber,
                    date: newP.createdAt
                },
                general: generalDiff,
                profit: profitDiff,
                items: {
                    added,
                    removed,
                    updated,
                    unchangedCount: unchanged.length
                }
            }
        };

    } catch (error) {
        logger.error('Failed to calculate proposal diff:', error);
        return { success: false, error: 'Karşılaştırma yapılırken bir hata oluştu.' };
    }
}

/**
 * Create a new proposal version directly from form data, without mutating the original.
 */
export async function createProposalVersionFromData(
    originalId: string,
    newData: {
        projectName: string;
        versionNote: string;
        termsAndConditions: string;
        items: ProposalItemWithGroup[];
        exchangeRates: { USD: number; EUR: number; };
    }
) {
    try {
        const original = await prisma.proposal.findFirst({
            where: { id: originalId, isDeleted: false },
        });

        if (!original) {
            return { success: false, error: 'Orijinal teklif bulunamadı.' };
        }

        const latestVersion = await prisma.proposal.findFirst({
            where: { rootProposalId: original.rootProposalId || original.id, isDeleted: false },
            orderBy: { version: 'desc' }
        });

        const newVersion = (latestVersion?.version || 0) + 1;

        let baseQuoteNumber = original.quoteNumber;
        if (original.rootProposalId && original.rootProposalId !== original.id) {
            const root = await prisma.proposal.findFirst({ where: { isDeleted: false,  id: original.rootProposalId } });
            if (root) baseQuoteNumber = root.quoteNumber;
        }
        if (baseQuoteNumber.includes('-v')) {
            baseQuoteNumber = baseQuoteNumber.split('-v')[0];
        }

        const totalAmount = newData.items.reduce((sum, item) => {
            let exchangeRate = 1;
            if (item.currency === 'USD') exchangeRate = newData.exchangeRates.USD || 1;
            else if (item.currency === 'EUR') exchangeRate = newData.exchangeRates.EUR || 1;
            const totals = calculateItemTotals({ ...item, exchangeRate });
            return sum + totals.totalTlSell;
        }, 0);

        const newProposal = await prisma.proposal.create({
            data: {
                rootProposalId: original.rootProposalId || original.id,
                version: newVersion,
                status: 'Draft',
                quoteNumber: `${baseQuoteNumber}-v${newVersion}`,
                customerName: original.customerName,
                customerId: original.customerId,
                projectName: newData.projectName,
                totalAmount: totalAmount,
                exchangeRateUSD: newData.exchangeRates.USD,
                exchangeRateEUR: newData.exchangeRates.EUR,
                termsAndConditions: newData.termsAndConditions,
                versionNote: newData.versionNote,
                items: {
                    create: newData.items.map(item => ({
                        productId: item.productId,
                        name: item.name,
                        brand: item.brand,
                        model: item.model,
                        quantity: item.quantity,
                        unit: item.unit,
                        listPrice: item.listPrice,
                        currency: item.currency,
                        discountRate: item.discountRate,
                        profitMargin: item.profitMargin,
                        groupName: item.groupName,
                        basePrice: item.basePrice,
                        vatRate: item.vatRate,
                        priceIncludesVat: item.priceIncludesVat,
                        orderIndex: item.orderIndex
                    }))
                }
            },
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        revalidatePath('/quotes');
        return { success: true, data: newProposal };
    } catch (error) {
        logger.error('Failed to create new proposal version from data:', error);
        return { success: false, error: 'Yeni versiyon oluşturulurken bir hata oluştu.' };
    }
}
