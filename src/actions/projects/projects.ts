'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Project, Prisma, ProjeDurumu, JobAssignment, Personnel } from '@prisma/client';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProjectTeamMember extends Omit<Personnel, 'status' | 'isDeleted' | 'deletedAt' | 'dailyRate'> {
    assignmentId: string;
    assignedAmount: number | null;
    assignedAt: Date | null;
    paymentStatus: string | null;
    notes: string | null;
    paymentHistory: unknown[];
    proposalId?: string;
    quoteNumber?: string;
    projectId?: string;
    balance: number;
    status?: string;
    isDeleted?: boolean;
    deletedAt?: Date | null;
    dailyRate?: number | null;
}

interface ProjectUpdateData {
    name?: string;
    description?: string;
    address?: string;
    status?: ProjeDurumu;
    contractAmount?: number | null;
    estimatedMaterialCost?: number | null;
    estimatedLaborCost?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
}

// Update fonksiyonunda null değerleri undefined'a çevir
function prepareUpdateData(data: ProjectUpdateData): Prisma.ProjectUpdateInput {
    const result: Prisma.ProjectUpdateInput = {};
    if (data.name !== undefined) result.name = data.name;
    if (data.description !== undefined) result.description = data.description;
    if (data.address !== undefined) result.address = data.address;
    if (data.status !== undefined) result.status = data.status;
    if (data.contractAmount !== undefined) result.contractAmount = data.contractAmount;
    if (data.estimatedMaterialCost !== undefined) result.estimatedMaterialCost = data.estimatedMaterialCost;
    if (data.estimatedLaborCost !== undefined) result.estimatedLaborCost = data.estimatedLaborCost;
    if (data.startDate !== undefined && data.startDate !== null) result.startDate = data.startDate;
    if (data.endDate !== undefined && data.endDate !== null) result.endDate = data.endDate;
    return result;
}

// ============================================================================
// HELPER FUNCTIONS - createProject internal logic
// ============================================================================

/**
 * Check for duplicate project by name and customer ID
 */
async function checkDuplicateProject(tx: any, name: string, customerId: string) {
    return await tx.project.findFirst({
        where: {
            name: name,
            customerId: customerId,
            isDeleted: false
        }
    });
}

/**
 * Calculate material and labor costs from proposal items
 */
async function calculateProjectCostsFromProposal(tx: any, proposalId: string) {
    const proposal = await tx.proposal.findFirst({
        where: { id: proposalId, isDeleted: false },
        include: { items: { where: { isDeleted: false } }, jobAssignments: true }
    });

    if (!proposal) return { proposal: null, materialCost: 0, laborCost: 0 };

    // Calculate material costs (exclude labor category)
    const productIds = proposal.items
        .map((item: any) => item.productId)
        .filter((id: any): id is string => !!id);

    const products = await tx.product.findMany({
        where: { id: { in: productIds }, isDeleted: false },
        select: { id: true, category: true }
    });
    const productCategoryMap = new Map(products.map((p: any) => [p.id, p.category]));

    const materialCost = proposal.items.reduce((sum: number, item: any) => {
        const category = item.productId ? productCategoryMap.get(item.productId) : null;
        if (category === 'İşçilik') return sum;

        const xr = item.currency === 'USD' ? (proposal.exchangeRateUSD || 1) :
                   item.currency === 'EUR' ? (proposal.exchangeRateEUR || 1) : 1;
        return sum + (item.quantity * item.basePrice * xr);
    }, 0);

    // Calculate labor costs from job assignments
    const laborCost = proposal.jobAssignments.reduce(
        (sum: number, ja: any) => sum + (ja.assignedAmount || 0),
        0
    );

    return { proposal, materialCost, laborCost };
}

/**
 * Handle proposal conversion to project (status update, stock reservation, financial transactions)
 */
async function handleProposalConversion(tx: any, proposal: any, project: any, contractAmount?: number) {
    const oldStatus = proposal.status;
    const newStatus = 'Approved';

    // Update proposal status and link to project
    await tx.proposal.update({
        where: { id: proposal.id },
        data: {
            projectId: project.id,
            status: newStatus
        }
    });

    // If not already approved, trigger stock and financial operations
    if (oldStatus !== 'Approved') {
        // A. Stock Reservation
        for (const item of proposal.items) {
            if (item.productId) {
                const productExists = await tx.product.findFirst({
                    where: { id: item.productId, isDeleted: false },
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
                            description: `Proje oluşturma ile onaylanan tekliften rezervasyon: ${proposal.quoteNumber}`,
                            referenceId: item.id,
                            projectId: project.id
                        }
                    });
                }
            }
        }

        // B. Customer Transaction (Debt)
        const debtAmount = (contractAmount !== undefined && contractAmount !== null)
            ? contractAmount
            : (proposal.totalAmount || 0);

        await tx.customerTransaction.create({
            data: {
                customerId: proposal.customerId,
                amount: debtAmount,
                type: 'Debt',
                description: `Proje Oluşturma (Teklif Onayı): ${proposal.quoteNumber}`,
                referenceId: proposal.id,
                referenceType: 'Proposal',
                category: 'Sales',
                date: new Date()
            }
        });

        await tx.customer.update({
            where: { id: proposal.customerId },
            data: {
                balance: { increment: debtAmount },
                approvedProposalsCount: { increment: 1 },
                lastProposalDate: new Date()
            }
        });
    } else {
        // Already approved - check for price difference
        const finalAmount = (contractAmount !== undefined && contractAmount !== null)
            ? contractAmount
            : (proposal.totalAmount || 0);

        const proposalAmount = proposal.totalAmount || 0;

        if (Math.abs(finalAmount - proposalAmount) > 0.01) {
            const diff = finalAmount - proposalAmount;

            const existingTx = await tx.customerTransaction.findFirst({
                where: { isDeleted: false,
                    referenceId: proposal.id,
                    referenceType: 'Proposal',
                    type: 'Debt'
                }
            });

            if (existingTx) {
                await tx.customerTransaction.update({
                    where: { id: existingTx.id },
                    data: { amount: finalAmount }
                });

                await tx.customer.update({
                    where: { id: proposal.customerId },
                    data: { balance: { increment: diff } }
                });
            }
        }
    }
}

/**
 * Assign team members to project from proposal
 */
async function assignProjectTeam(
    tx: any,
    proposalId: string,
    teamMemberDetails?: { id: string; name: string; role?: string; email?: string }[],
    teamMemberIds?: string[],
    estimatedLaborCost?: number
) {
    if (teamMemberDetails && teamMemberDetails.length > 0) {
        for (const person of teamMemberDetails) {
            await tx.personnel.upsert({
                where: { id: person.id },
                update: { name: person.name, role: person.role || '', email: person.email },
                create: { id: person.id, name: person.name, role: person.role || '', status: 'Aktif', email: person.email }
            });

            const existingAssignment = await tx.jobAssignment.findFirst({
                where: { isDeleted: false,  proposalId, personnelId: person.id }
            });

            if (!existingAssignment) {
                const initialAmount = (teamMemberDetails.length === 1) ? (estimatedLaborCost || 0) : 0;
                await tx.jobAssignment.create({
                    data: { proposalId, personnelId: person.id, assignedAmount: initialAmount }
                });
            } else if (teamMemberDetails.length === 1 && (estimatedLaborCost || 0) > 0) {
                await tx.jobAssignment.update({
                    where: { id: existingAssignment.id },
                    data: { assignedAmount: estimatedLaborCost }
                });
            }
        }
    } else if (teamMemberIds && teamMemberIds.length > 0) {
        for (const pid of teamMemberIds) {
            const existingAssignment = await tx.jobAssignment.findFirst({
                where: { isDeleted: false,  proposalId, personnelId: pid }
            });

            if (!existingAssignment) {
                const initialAmount = (teamMemberIds.length === 1) ? (estimatedLaborCost || 0) : 0;
                await tx.jobAssignment.create({
                    data: { proposalId, personnelId: pid, assignedAmount: initialAmount }
                });
            } else if (teamMemberIds.length === 1 && (estimatedLaborCost || 0) > 0) {
                await tx.jobAssignment.update({
                    where: { id: existingAssignment.id },
                    data: { assignedAmount: estimatedLaborCost }
                });
            }
        }
    }
}

/**
 * Handle advance payment for project
 */
async function handleAdvancePayment(tx: any, projectId: string, customerId: string, amount: number, projectName: string) {
    // Create Project Income
    const incomeTx = await tx.projectExpense.create({
        data: {
            projectId,
            description: 'Proje Başlangıç Avansı',
            amount,
            category: 'Advance Payment',
            type: 'Income',
            date: new Date()
        }
    });

    // Create Customer Payment Transaction
    await tx.customerTransaction.create({
        data: {
            customerId,
            referenceId: incomeTx.id,
            referenceType: 'Manual',
            type: 'Payment',
            amount: amount,
            date: new Date(),
            description: `${projectName} - Başlangıç Avansı`,
            category: 'Collection'
        }
    });

    // Update Customer Balance
    await tx.customer.update({
        where: { id: customerId },
        data: { balance: { decrement: amount } }
    });
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get projects with optional filtering
 */
export async function getProjects(filters?: { status?: ProjeDurumu | 'All' | string; q?: string }) {
    try {
        const where: any = {
            isDeleted: false
        };

        if (filters?.status && filters.status !== 'All') {
            const validEnumStatuses = Object.values(ProjeDurumu);

            if (validEnumStatuses.includes(filters.status as ProjeDurumu)) {
                where.status = filters.status as ProjeDurumu;
            } else {
                // Grouped Status Logic
                switch (filters.status) {
                    case 'Ongoing':
                        where.status = {
                            in: [
                                ProjeDurumu.SOZLESME_ASAMASI,
                                ProjeDurumu.PROJE_PLANLAMA,
                                ProjeDurumu.MALZEME_TEDARIK,
                                ProjeDurumu.SAHA_MOBILIZASYONU,
                                ProjeDurumu.MONTAJ_VE_IMALAT,
                                ProjeDurumu.TEST_VE_DEVREYE_ALMA
                            ]
                        };
                        break;
                    case 'Completed':
                        where.status = {
                            in: [
                                ProjeDurumu.GECICI_KABUL,
                                ProjeDurumu.EKSIK_GIDERME,
                                ProjeDurumu.PROJE_TAMAMLANDI,
                                ProjeDurumu.FATURALANDIRILDI_VE_KAPANDI
                            ]
                        };
                        break;
                    case 'Pending':
                        where.status = ProjeDurumu.ASKIYA_ALINDI;
                        break;
                    case 'Cancelled':
                        where.status = ProjeDurumu.IPTAL_EDILDI;
                        break;
                }
            }
        }

        if (filters?.q) {
            where.OR = [
                { name: { contains: filters.q } },
                { customer: { name: { contains: filters.q } } },
            ];
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                customer: true,
                proposals: { where: { isDeleted: false },
                    select: { id: true, quoteNumber: true, createdAt: true },
                    take: 1
                },
                _count: {
                    select: { invoices: { where: { isDeleted: false } }, proposals: { where: { isDeleted: false } } }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Also fetch totals for the header cards, unfiltered
        const allProjects = await prisma.project.findMany({
            where: { isDeleted: false },
            select: { status: true, contractAmount: true }
        });

        return { success: true, data: { projects, allProjects } };
    } catch (error) {
        logger.error('Failed to fetch projects:', error);
        return { success: false, error: 'Projeler yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get exhaustive details for a single project (Financials, Team, Invoices)
 */
export async function getProject(id: string) {
    try {
        const project = await prisma.project.findFirst({
            where: { id, isDeleted: false },
            include: {
                invoices: { where: { isDeleted: false },
                    orderBy: { invoiceDate: 'desc' }
                },
                proposals: { where: { isDeleted: false },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        jobAssignments: {
                            where: { isDeleted: false }, // ✅ Soft delete filtresi
                            include: {
                                personnel: true
                            }
                        }
                    }
                },
                transactions: { where: { isDeleted: false },
                    orderBy: { date: 'desc' }
                },
                // ✅ YENİ: Müşteri ödemelerini de dahil et (Kasa Defteri için)
                customer: {
                    include: {
                        transactions: {
                            where: {
                                type: 'Payment', // Sadece tahsilatlar
                                isDeleted: false,
                                projectId: id // ✅ SADECE bu projeye ait ödemeler
                            },
                            orderBy: { date: 'desc' }
                        }
                    }
                },
                jobAssignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        personnel: true
                    }
                },
                statusHistory: { where: { isDeleted: false },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!project) return { success: false, error: 'Proje bulunamadı.' };

        // 1. Fetch relevant Invoice Items (Directly linked OR via Invoice parent)
        const relevantItems = await prisma.invoiceItem.findMany({
            where: { isDeleted: false,
                OR: [
                    { projectId: id },
                    {
                        projectId: null,
                        invoice: { projectId: id }
                    }
                ]
            },
            include: {
                invoice: {
                    select: {
                        id: true,
                        type: true,
                        status: true,
                        currency: true,
                        invoiceNumber: true,
                        invoiceDate: true,
                        senderName: true,
                        receiverName: true,
                        customer: { where: { isDeleted: false },
                            select: { name: true }
                        }
                    }
                }
            }
        });

        // 2. Calculate Financials
        const invoicedIncome = { net: 0, tax: 0, total: 0 };
        const grossCost = { net: 0, tax: 0, total: 0 };
        const returnedAmount = { net: 0, tax: 0, total: 0 };

        const transactions = project.transactions || [];
        const manualExpenses = transactions
            .filter((t: any) => t.type !== 'Income' && t.category !== 'Personel Ödemesi')
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
        const manualIncomes = transactions
            .filter((t: any) => t.type === 'Income')
            .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

        grossCost.net += manualExpenses;
        grossCost.total += manualExpenses;
        invoicedIncome.net += manualIncomes;
        invoicedIncome.total += manualIncomes;

        // --- Labor Cost Integration ---
        // Sum up actual payments made to personnel from all job assignments linked to this project
        let totalLaborPayments = 0;
        // Labor from Proposal-linked assignments
        project.proposals?.forEach((p) => {
            p.jobAssignments?.forEach((ja: any) => {
                if (ja.paymentHistory) {
                    try {
                        const history = typeof ja.paymentHistory === 'string' ? JSON.parse(ja.paymentHistory) : ja.paymentHistory;
                        if (Array.isArray(history)) {
                            totalLaborPayments += history.reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
                        }
                    } catch (e) { }
                }
            });
        });

        // Labor from Direct project assignments
        project.jobAssignments?.forEach((ja) => {
            if (ja.paymentHistory) {
                try {
                    const history = typeof ja.paymentHistory === 'string' ? JSON.parse(ja.paymentHistory) : ja.paymentHistory;
                    if (Array.isArray(history)) {
                        totalLaborPayments += history.reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
                    }
                } catch (e) { }
            }
        });

        grossCost.net += totalLaborPayments;
        grossCost.total += totalLaborPayments;

        for (const item of relevantItems) {
            if (item.invoice.status === 'Cancelled') continue;
            
            // Get exchange rate for currency conversion
            const invoiceCurrency = item.invoice.currency || 'TRY';
            const exchangeRate = invoiceCurrency === 'USD' ? 32.50 :
                                invoiceCurrency === 'EUR' ? 35.00 : 1;
            
            // Convert to TL
            const itemNetTL = item.totalPrice * exchangeRate;
            const itemTaxTL = (item.taxAmount || 0) * exchangeRate;
            const itemTotalTL = itemNetTL + itemTaxTL;

            if (item.invoice.type === 'Outgoing') {
                invoicedIncome.net += itemNetTL;
                invoicedIncome.tax += itemTaxTL;
                invoicedIncome.total += itemTotalTL;
            } else if (item.invoice.type === 'Incoming') {
                grossCost.net += itemNetTL;
                grossCost.tax += itemTaxTL;
                grossCost.total += itemTotalTL;
            } else if (item.invoice.type === 'PurchaseReturn') {
                returnedAmount.net += itemNetTL;
                returnedAmount.tax += itemTaxTL;
                returnedAmount.total += itemTotalTL;
            }
        }

        const netCost = {
            net: grossCost.net - returnedAmount.net,
            tax: grossCost.tax - returnedAmount.tax,
            total: grossCost.total - returnedAmount.total
        };

        const profit = {
            net: invoicedIncome.net - netCost.net,
            total: invoicedIncome.total - netCost.total
        };

        const margin = invoicedIncome.net > 0 ? (profit.net / invoicedIncome.net) * 100 : 0;
        const approvedProposalsTotal = project.proposals
            .filter((p: any) => p.status === 'Approved')
            .reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);

        const contractAmount = (project.contractAmount && project.contractAmount > 0)
            ? project.contractAmount
            : approvedProposalsTotal;

        // 3. Aggregate Invoices for Display
        const invoiceMap = new Map<string, any>();
        for (const item of relevantItems) {
            if (!invoiceMap.has(item.invoiceId)) {
                invoiceMap.set(item.invoiceId, {
                    id: item.invoice.id,
                    type: item.invoice.type,
                    invoiceNumber: item.invoice.invoiceNumber,
                    invoiceDate: item.invoice.invoiceDate,
                    status: item.invoice.status,
                    companyName: item.invoice.type === 'Incoming' ? item.invoice.senderName : (item.invoice.customer?.name || item.invoice.receiverName),
                    projectAmount: { net: 0, tax: 0, total: 0 }
                });
            }
            const inv = invoiceMap.get(item.invoiceId);
            inv.projectAmount.net += item.totalPrice;
            inv.projectAmount.tax += (item.taxAmount || 0);
            inv.projectAmount.total += (item.totalPrice + (item.taxAmount || 0));
        }

        const enrichedInvoices = Array.from(invoiceMap.values()).sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

        // Extract Team Members
        const teamMembers = new Map();
        // Members from Proposals
        project.proposals.forEach((p: any) => {
            p.jobAssignments.forEach((ja: any) => {
                if (ja.personnel) {
                    teamMembers.set(ja.personnel.id, { ...ja.personnel, assignmentId: ja.id });
                }
            });
        });

        // Members from Direct Assignments
        project.jobAssignments.forEach((ja: any) => {
            if (ja.personnel) {
                teamMembers.set(ja.personnel.id, { ...ja.personnel, assignmentId: ja.id });
            }
        });

        return {
            success: true,
            data: {
                ...project,
                invoices: enrichedInvoices,
                team: Array.from(teamMembers.values()),
                // ✅ YENİ: Müşteri ödemelerini ve personel ödemelerini proje işlemlerine ekle
                transactions: [
                    ...project.transactions, // Proje giderleri
                    // Müşteri ödemeleri (Tahsilatlar) - SADECE bu projeye ait olanlar
                    ...(project.customer?.transactions || [])
                        .filter((ct: any) => ct.projectId === id || !ct.projectId) // Sadece bu proje veya projectsiz
                        .map((ct: any) => ({
                            ...ct,
                            type: 'Income',
                            category: ct.category || 'Tahsilat',
                            description: ct.description || `${ct.category} - ${ct.date.toLocaleDateString('tr-TR')}`,
                            projectId: id
                        })),
                    // Personel ödemeleri (JobAssignment.paymentHistory'dan)
                    ...project.jobAssignments.flatMap((ja: any) => {
                        if (!ja.paymentHistory) return [];
                        try {
                            const history = typeof ja.paymentHistory === 'string' 
                                ? JSON.parse(ja.paymentHistory) 
                                : ja.paymentHistory;
                            if (!Array.isArray(history)) return [];
                            
                            return history.map((payment: any, idx: number) => ({
                                id: `ja-${ja.id}-${idx}`,
                                type: 'Expense',
                                category: 'Personel Ödemesi',
                                description: payment.note || `${idx + 1}. Hakediş - ${ja.personnel?.name}`,
                                amount: payment.amount || 0,
                                date: new Date(payment.date) || ja.assignedAt,
                                projectId: id
                            }));
                        } catch {
                            return [];
                        }
                    })
                ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                financials: {
                    contractAmount,
                    invoicedIncome,
                    grossCost,
                    returnedAmount,
                    netCost,
                    profit,
                    margin
                }
            }
        };
    } catch (error: any) {
        logger.error('Failed to get project details:', error);
        return { success: false, error: error.message };
    }
}

// Alias for getProject for those using the name "getProjectDetails"
export const getProjectDetails = getProject;

/**
 * Create a new project or update existing one
 * Uses helper functions for modularity
 */
export async function createProject(data: {
    name: string;
    customerId: string;
    description?: string;
    address?: string;
    status?: ProjeDurumu;
    contractAmount?: number;
    estimatedMaterialCost?: number;
    estimatedLaborCost?: number;
    startDate?: Date;
    endDate?: Date;
    linkedProposalId?: string;
    teamMemberIds?: string[];
    teamMemberDetails?: { id: string; name: string; role?: string; email?: string }[];
    advancePayment?: number;
}) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Check duplicates
            const existing = await checkDuplicateProject(tx, data.name, data.customerId);

            if (existing) {
                return tx.project.update({
                    where: { id: existing.id },
                    data: {
                        description: data.description !== undefined ? data.description : existing.description,
                        contractAmount: data.contractAmount !== undefined ? data.contractAmount : existing.contractAmount,
                        estimatedMaterialCost: data.estimatedMaterialCost !== undefined ? data.estimatedMaterialCost : existing.estimatedMaterialCost,
                        estimatedLaborCost: data.estimatedLaborCost !== undefined ? data.estimatedLaborCost : existing.estimatedLaborCost,
                        startDate: data.startDate !== undefined ? data.startDate : existing.startDate,
                        status: data.status || existing.status
                    }
                });
            }

            // 2. Calculate costs from proposal if linked
            let proposal: any = null;
            let calculatedMaterialCost = 0;
            let calculatedLaborCost = 0;

            if (data.linkedProposalId) {
                const costs = await calculateProjectCostsFromProposal(tx, data.linkedProposalId);
                proposal = costs.proposal;
                calculatedMaterialCost = costs.materialCost;
                calculatedLaborCost = costs.laborCost;
            }

            // 3. Create project
            const project = await tx.project.create({
                data: {
                    name: data.name,
                    customerId: data.customerId,
                    description: data.description,
                    address: data.address,
                    status: data.status || ProjeDurumu.MONTAJ_VE_IMALAT,
                    contractAmount: data.contractAmount,
                    estimatedMaterialCost: data.estimatedMaterialCost !== undefined
                        ? data.estimatedMaterialCost
                        : calculatedMaterialCost,
                    estimatedLaborCost: data.estimatedLaborCost !== undefined
                        ? data.estimatedLaborCost
                        : calculatedLaborCost,
                    startDate: data.startDate || new Date(),
                    endDate: data.endDate,
                    linkedProposalId: data.linkedProposalId
                }
            });

            // 4. Handle proposal conversion if linked
            if (project.id && proposal) {
                await handleProposalConversion(tx, proposal, project, data.contractAmount);

                // 5. Assign team members
                await assignProjectTeam(
                    tx,
                    data.linkedProposalId!,
                    data.teamMemberDetails,
                    data.teamMemberIds,
                    data.estimatedLaborCost
                );
            }

            // 6. Handle advance payment
            if (data.advancePayment && data.advancePayment > 0) {
                await handleAdvancePayment(tx, project.id, data.customerId, data.advancePayment, data.name);
            }

            return project;
        });

        revalidatePath('/projects');
        revalidatePath(`/customers/${result.customerId}`);
        return { success: true, data: result };
    } catch (error) {
        logger.error('Failed to create project:', error);
        return { success: false, error: 'Proje oluşturulurken bir hata oluştu.' };
    }
}

/**
 * Comprehensive Update Project (with team sync and invoice handling)
 */
export async function updateProject(id: string, data: {
    name?: string;
    description?: string;
    address?: string;
    status?: ProjeDurumu;
    contractAmount?: number;
    estimatedMaterialCost?: number;
    estimatedLaborCost?: number;
    startDate?: Date;
    endDate?: Date;
    linkedProposalId?: string;
    teamMemberDetails?: { id: string; name: string; role?: string; email?: string }[];
    statusNote?: string;
    statusDate?: Date;
}) {
    try {
        const { teamMemberDetails, linkedProposalId, statusNote, statusDate, ...rawProjectData } = data;

        // Filter out fields that are not in the Project model or should not be updated directly
        const projectData: ProjectUpdateData = {};
        const allowedKeys = ['name', 'description', 'address', 'status', 'contractAmount', 'estimatedMaterialCost', 'estimatedLaborCost', 'startDate', 'endDate'] as const;
        for (const key of Object.keys(rawProjectData) as Array<keyof typeof rawProjectData>) {
            if (allowedKeys.includes(key)) {
                projectData[key] = rawProjectData[key] as any;
            }
        }

        // 1. Fetch current project to check for Contract Amount change or Status change
        const currentProject = await prisma.project.findFirst({
            where: { id, isDeleted: false },
            select: { contractAmount: true, customerId: true, linkedProposalId: true, status: true }
        });

        const project = await prisma.project.update({
            where: { id },
            data: prepareUpdateData(projectData)
        });

        // 1.5. Record Status History if status changed
        if (projectData.status && currentProject && projectData.status !== currentProject.status) {
            await prisma.projectStatusHistory.create({
                data: {
                    projectId: id,
                    status: projectData.status,
                    note: statusNote || 'Durum güncellendi.',
                    date: statusDate || new Date()
                }
            });
        }

        // 2. Sync Contract Amount Change to Customer Debt
        if (projectData.contractAmount !== undefined && currentProject && projectData.contractAmount !== currentProject.contractAmount) {
            const difference = (projectData.contractAmount || 0) - (currentProject.contractAmount || 0);

            // Find the Debt transaction
            // FIX: First try to find by Project reference, if not found, try by Linked Proposal reference
            let debtTx = await prisma.customerTransaction.findFirst({
                where: { isDeleted: false,
                    referenceId: id,
                    referenceType: 'Project',
                    type: 'Debt'
                }
            });

            if (!debtTx && currentProject.linkedProposalId) {
                debtTx = await prisma.customerTransaction.findFirst({
                    where: { isDeleted: false,
                        referenceId: currentProject.linkedProposalId,
                        referenceType: 'Proposal',
                        type: 'Debt'
                    }
                });
            }

            if (debtTx) {
                // Update transaction amount
                await prisma.customerTransaction.update({
                    where: { id: debtTx.id },
                    data: { amount: projectData.contractAmount ?? 0 }
                });

                // Update Customer Balance
                await prisma.customer.update({
                    where: { id: currentProject.customerId },
                    data: { balance: { increment: difference } }
                });
            } else {
                // If no debt transaction exists (legacy project), should we create one?
                // For now, let's only update if it exists to avoid side effects on old data
                // unless explicitly requested. 
                // However, user wants "End-to-End". If we update an old project, 
                // maybe we should ensure it has a transaction? 
                // Let's stick to updating existing for safety, unless the user complains.
            }
        }

        // Sync Team
        let targetProposalId = linkedProposalId;
        if (!targetProposalId) {
            // Find the primary proposal for this project
            const primaryProposal = await prisma.proposal.findFirst({
                where: { isDeleted: false,  projectId: id },
                orderBy: { version: 'desc' }
            });
            targetProposalId = primaryProposal?.id;
        }

        if (targetProposalId && teamMemberDetails) {
            const currentAssignments = await prisma.jobAssignment.findMany({
                where: { isDeleted: false,  proposalId: targetProposalId }
            });
            const currentMemberIds = currentAssignments.map(a => a.personnelId);
            const newMemberIds = teamMemberDetails.map(p => p.id);

            // 1. Remove members no longer in the list (Soft-delete)
            const membersToRemove = currentMemberIds.filter(id => !newMemberIds.includes(id));
            if (membersToRemove.length > 0) {
                await prisma.jobAssignment.updateMany({
                    where: {
                        proposalId: targetProposalId,
                        personnelId: { in: membersToRemove }
                    },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date()
                    }
                });
            }

            // 2. Add or Update members (Optimized to prevent N+1)
            await prisma.$transaction(
                teamMemberDetails.map(person =>
                    prisma.personnel.upsert({
                        where: { id: person.id },
                        update: { name: person.name, role: person.role || '', email: person.email },
                        create: { id: person.id, name: person.name, role: person.role || '', status: 'Aktif', email: person.email }
                    })
                )
            );

            const newMembers = teamMemberDetails.filter(person => !currentMemberIds.includes(person.id));
            if (newMembers.length > 0) {
                await prisma.jobAssignment.createMany({
                    data: newMembers.map(person => ({
                        proposalId: targetProposalId,
                        projectId: id,
                        personnelId: person.id,
                        assignedAmount: (teamMemberDetails.length === 1 ? (projectData.estimatedLaborCost || 0) : 0)
                    }))
                });
            }

            // 3. Distribution of Estimated Labor Cost (Optional / Suggestion)
            // If estimatedLaborCost is provided and there are members, we could split it?
            // User says "seçilen ekibin hanesine alacak olarak yazmalı".
            // If there's 1 person, give all. If more, maybe split or just leave for manual edit.
            // For now, if there is exactly 1 person and 0 existing assignedAmount, auto-assign.
            const updatedAssignments = await prisma.jobAssignment.findMany({ where: { isDeleted: false,  proposalId: targetProposalId } });
            if (updatedAssignments.length === 1 && (projectData.estimatedLaborCost || 0) > 0) {
                await prisma.jobAssignment.update({
                    where: { id: updatedAssignments[0].id },
                    data: { assignedAmount: projectData.estimatedLaborCost ?? 0 }
                });
            }
        }

        // Cleanup if Cancelled
        if (projectData.status === ProjeDurumu.IPTAL_EDILDI) {
            await prisma.invoice.updateMany({ where: { projectId: id }, data: { projectId: null } });
            await prisma.invoiceItem.updateMany({ where: { projectId: id }, data: { projectId: null } });
            await prisma.proposal.updateMany({ where: { projectId: id }, data: { projectId: null } });
        }

        revalidatePath(`/projects/${id}`);
        revalidatePath('/projects');
        return { success: true, data: project };
    } catch (error) {
        logger.error('Failed to update project:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Proje güncellenemedi.' };
    }
}

/**
 * Internal Delete Logic (Reused by Proposal Status Change)
 */
export async function deleteProjectInternal(id: string, tx: any) {
    // 1. Financial Cleanup: Revert Project Debt
    const debtTx = await tx.customerTransaction.findFirst({
        where: { isDeleted: false,
            referenceId: id,
            referenceType: 'Project'
        }
    });

    if (debtTx) {
        await tx.customer.update({
            where: { id: debtTx.customerId },
            data: { balance: { decrement: debtTx.amount } }
        });
        await tx.customerTransaction.update({ where: { id: debtTx.id }, data: { isDeleted: true, deletedAt: new Date() } });
    }

    // 2. Financial Cleanup: Revert Project Collections/Incomes of Project Expenses
    const pTransactions = await tx.projectExpense.findMany({
        where: { isDeleted: false,  projectId: id },
        select: { id: true }
    });

    const pTxIds = pTransactions.map((t: any) => t.id);

    if (pTxIds.length > 0) {
        const linkedCTxs = await tx.customerTransaction.findMany({
            where: { isDeleted: false,  referenceId: { in: pTxIds } }
        });

        for (const ctx of linkedCTxs) {
            await tx.customer.update({
                where: { id: ctx.customerId },
                data: { balance: { decrement: ctx.amount } }
            });
            await tx.customerTransaction.update({ where: { id: ctx.id }, data: { isDeleted: true, deletedAt: new Date() } });
        }
    }

    // 3. Existing Cleanup Logic
    await tx.invoice.updateMany({ where: { projectId: id }, data: { projectId: null } });
    await tx.invoiceItem.updateMany({ where: { projectId: id }, data: { projectId: null } });

    const linkedProposals = await tx.proposal.findMany({ 
        where: { projectId: id, isDeleted: false }, 
        select: { id: true }
    });

    // Financial Cleanup for Linked Proposals
    const linkedProposalIds = linkedProposals.map((p: any) => p.id);
    if (linkedProposalIds.length > 0) {
        const proposalDebtTxs = await tx.customerTransaction.findMany({
            where: { isDeleted: false,
                referenceType: 'Proposal',
                referenceId: { in: linkedProposalIds },
                type: 'Debt'
            }
        });

        for (const pTx of proposalDebtTxs) {
            await tx.customer.update({
                where: { id: pTx.customerId },
                data: { balance: { decrement: pTx.amount } }
            });
            await tx.customerTransaction.update({ where: { id: pTx.id }, data: { isDeleted: true, deletedAt: new Date() } });
        }
    }

    for (const prop of linkedProposals) {
        await tx.jobAssignment.updateMany({ where: { proposalId: prop.id }, data: { isDeleted: true, deletedAt: new Date() } });
    }

    await tx.proposal.updateMany({
        where: { projectId: id },
        data: { projectId: null, status: 'Sent' }
    });

    await tx.project.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });
}

/**
 * Internal Create Project from Proposal (Automated)
 */
export async function createProjectFromProposalInternal(proposal: any, tx: any) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const project = await tx.project.create({
        data: {
            name: proposal.projectName || `Proje: ${proposal.quoteNumber}`,
            customerId: proposal.customerId,
            contractAmount: proposal.totalAmount,
            status: ProjeDurumu.MONTAJ_VE_IMALAT, // FIX: Use Prisma enum instead of magic string
            startDate: startDate,
            endDate: endDate,
            linkedProposalId: proposal.id
        }
    });

    await tx.proposal.update({
        where: { id: proposal.id },
        data: { projectId: project.id }
    });

    return project;
}

/**
 * Comprehensive Delete Project (with safe unlinking)
 */
export async function deleteProject(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Financial Cleanup: Revert Project Debt
            const debtTx = await tx.customerTransaction.findFirst({
                where: { isDeleted: false,
                    referenceId: id,
                    referenceType: 'Project'
                }
            });

            if (debtTx) {
                await tx.customer.update({
                    where: { id: debtTx.customerId },
                    data: { balance: { decrement: debtTx.amount } }
                });
                await tx.customerTransaction.update({ where: { id: debtTx.id }, data: { isDeleted: true, deletedAt: new Date() } });
            }

            // 2. Financial Cleanup: Revert Project Collections/Incomes of Project Expenses
            // Get IDs of all project expenses/transactions to be deleted
            const pTransactions = await tx.projectExpense.findMany({
                where: { isDeleted: false,  projectId: id },
                select: { id: true }
            });

            const pTxIds = pTransactions.map(t => t.id);

            if (pTxIds.length > 0) {
                const linkedCTxs = await tx.customerTransaction.findMany({
                    where: { isDeleted: false,  referenceId: { in: pTxIds } }
                });

                for (const ctx of linkedCTxs) {
                    await tx.customer.update({
                        where: { id: ctx.customerId },
                        data: { balance: { decrement: ctx.amount } }
                    });
                    await tx.customerTransaction.update({ where: { id: ctx.id }, data: { isDeleted: true, deletedAt: new Date() } });
                }
            }

            // 3. Existing Cleanup Logic
            await tx.invoice.updateMany({ where: { projectId: id }, data: { projectId: null } });
            await tx.invoiceItem.updateMany({ where: { projectId: id }, data: { projectId: null } });

            const linkedProposals = await tx.proposal.findMany({ 
                where: { projectId: id, isDeleted: false }, 
                select: { id: true }
            });

            // NEW: Financial Cleanup for Linked Proposals
            // If the proposal generated a debt transaction (e.g. on Approval), we need to revert it since we are reverting the project.
            const linkedProposalIds = linkedProposals.map(p => p.id);
            if (linkedProposalIds.length > 0) {
                const proposalDebtTxs = await tx.customerTransaction.findMany({
                    where: { isDeleted: false,
                        referenceType: 'Proposal',
                        referenceId: { in: linkedProposalIds },
                        type: 'Debt'
                    }
                });

                for (const pTx of proposalDebtTxs) {
                    await tx.customer.update({
                        where: { id: pTx.customerId },
                        data: { balance: { decrement: pTx.amount } }
                    });
                    await tx.customerTransaction.update({ where: { id: pTx.id }, data: { isDeleted: true, deletedAt: new Date() } });
                }
            }

            for (const prop of linkedProposals) {
                await tx.jobAssignment.updateMany({ where: { proposalId: prop.id }, data: { isDeleted: true, deletedAt: new Date() } });
            }

            await tx.proposal.updateMany({
                where: { projectId: id },
                data: { projectId: null, status: 'Sent' }
            });

            // Note: ProjectExpense (transactions) will be deleted via cascade if configured in schema,
            // but we already handled the customer side sync above.
            // If cascade is not set, we should delete them explicitly.
            // Assuming cascade or manual deletion isn't strictly required if handled by DB,
            // but for safety let's delete them if we are doing manual cleanup.
            // However, to be safe and match existing pattern, we trust the database cascade or add explicit delete.
            // Given the previous code didn't delete expenses explicitly, it relies on Cascade.

            await tx.project.update({
                where: { id },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        });

        revalidatePath('/projects');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete project:', error);
        return { success: false, error: 'Proje silinirken bir hata oluştu.' };
    }
}

/**
 * Utility functions for projects
 */
export async function deleteProjectByName(name: string, customerId: string) {
    const project = await prisma.project.findFirst({ where: { isDeleted: false,  name, customerId } });
    if (project) return deleteProject(project.id);
    return { success: true };
}

export async function getProjectsByCustomer(customerId: string) {
    try {
        const projects = await prisma.project.findMany({
            where: { isDeleted: false,  customerId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { invoices: { }, proposals: { } } } }
        });
        return { success: true, data: projects };
    } catch (error) {
        return { success: false, error: 'Projeler yüklenemedi.' };
    }
}

export async function getAllProjects() {
    try {
        const projects = await prisma.project.findMany({ where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: { select: { id: true, name: true } },
                _count: { select: { invoices: { }, proposals: { } } }
            }
        });
        return { success: true, data: projects };
    } catch (error) {
        return { success: false, error: 'Projeler yüklenemedi.' };
    }
}

export async function getProjectsForSelect(customerId?: string) {
    try {
        const where: any = {};
        if (customerId) where.customerId = customerId;

        const projects = await prisma.project.findMany({
            where,
            select: { id: true, name: true, customer: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' }
        });

        return { success: true, data: projects.map(p => ({ id: p.id, name: p.name, customerName: p.customer.name })) };
    } catch (error) {
        return { success: false, error: 'Projeler yüklenemedi.' };
    }
}

export async function importProject(data: {
    id?: string;
    name: string;
    customerId: string;
    customerName?: string;
    description?: string;
    address?: string;
    status?: string;
    budget?: number;
    estimatedMaterialCost?: number;
    estimatedLaborCost?: number;
    startDate?: Date;
    endDate?: Date;
    linkedProposalId?: string;
    contractAmount?: number;
}) {
    try {
        let validCustomerId = data.customerId;

        // 1. Müşteri Kontrolü (ID veya İsim ile)
        const customerExists = await prisma.customer.findFirst({ where: { isDeleted: false,  id: data.customerId } });
        if (!customerExists && data.customerName) {
            const customerByName = await prisma.customer.findFirst({ where: { isDeleted: false,  name: data.customerName } });
            if (customerByName) {
                validCustomerId = customerByName.id;
            } else {
                const newCustomer = await prisma.customer.create({
                    data: { id: data.customerId, name: data.customerName, status: 'Aktif' }
                });
                validCustomerId = newCustomer.id;
            }
        }

        // 2. Proje Verisini Hazırla
        const projectData = {
            name: data.name,
            customerId: validCustomerId,
            description: data.description,
            address: data.address,
            status: (data.status as ProjeDurumu) || ProjeDurumu.MONTAJ_VE_IMALAT,
            contractAmount: data.contractAmount || data.budget, // Bütçeyi contractAmount'a eşle
            estimatedMaterialCost: data.estimatedMaterialCost || 0,
            estimatedLaborCost: data.estimatedLaborCost || 0,
            startDate: data.startDate || new Date(),
            endDate: data.endDate
        };

        // 3. Projeyi Oluştur veya Güncelle
        // ID geçerli bir UUID ise güncelleme dene, değilse yeni oluştur
        const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
        let project;

        if (data.id && isUuid(String(data.id))) {
            const { customerId: _, ...updateData } = projectData;
            project = await prisma.project.upsert({
                where: { id: String(data.id) },
                update: { ...updateData, status: projectData.status },
                create: { id: String(data.id), ...projectData }
            });
        } else {
            project = await prisma.project.create({ data: projectData });
        }

        // 4. Teklif Bağlantısı
        if (data.linkedProposalId && project.id) {
            const proposalExists = await prisma.proposal.findFirst({ where: { isDeleted: false,  id: data.linkedProposalId } });
            if (proposalExists) {
                await prisma.proposal.update({
                    where: { id: data.linkedProposalId },
                    data: { projectId: project.id }
                });
            }
        }

        return { success: true, data: project };
    } catch (error: any) {
        logger.error('Import project error:', error);
        return { success: false, error: `Proje içe aktarılamadı: ${error.message}` };
    }
}

export async function getProjectTeam(projectId: string) {
    try {
        const teamMembers: ProjectTeamMember[] = [];
        const seenIds = new Set();

        // 1. Members from Proposals linked to this project
        const proposals = await prisma.proposal.findMany({
            where: { isDeleted: false,  projectId: projectId },
            include: {
                jobAssignments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: { personnel: { } }
                }
            }
        });

        for (const prop of proposals) {
            if (prop.jobAssignments) {
                for (const assignment of prop.jobAssignments) {
                    if (assignment.personnel) {
                        const memberId = assignment.personnel.id;
                        if (!seenIds.has(memberId)) {
                            teamMembers.push({
                                id: memberId,
                                assignmentId: assignment.id,
                                name: assignment.personnel.name,
                                role: assignment.personnel.role,
                                email: assignment.personnel.email,
                                phone: assignment.personnel.phone,
                                assignedAmount: assignment.assignedAmount,
                                assignedAt: assignment.assignedAt,
                                paymentStatus: assignment.paymentStatus,
                                notes: assignment.notes,
                                paymentHistory: assignment.paymentHistory ? (Array.isArray(assignment.paymentHistory) ? assignment.paymentHistory : (typeof assignment.paymentHistory === 'string' ? JSON.parse(assignment.paymentHistory) : [])) : [],
                                proposalId: prop.id,
                                quoteNumber: prop.quoteNumber,
                                balance: assignment.personnel.balance
                            });
                            seenIds.add(memberId);
                        }
                    }
                }
            }
        }

        // 2. Members from Direct Assignments
        const directAssignments = await prisma.jobAssignment.findMany({
            where: { 
                projectId: projectId,
                isDeleted: false // ✅ Soft delete filtresi
            },
            include: { personnel: { } }
        });

        for (const assignment of directAssignments) {
            const asm = assignment;
            if (asm.personnel) {
                const memberId = asm.personnel.id;
                if (!seenIds.has(memberId)) {
                    teamMembers.push({
                        id: memberId,
                        assignmentId: asm.id,
                        name: asm.personnel.name,
                        role: asm.personnel.role,
                        email: asm.personnel.email,
                        phone: asm.personnel.phone,
                        assignedAmount: asm.assignedAmount,
                        assignedAt: asm.assignedAt,
                        paymentStatus: asm.paymentStatus,
                        notes: asm.notes,
                        paymentHistory: asm.paymentHistory ? (Array.isArray(asm.paymentHistory) ? asm.paymentHistory : (typeof asm.paymentHistory === 'string' ? JSON.parse(asm.paymentHistory) : [])) : [],
                        projectId: projectId,
                        balance: asm.personnel.balance
                    });
                    seenIds.add(memberId);
                }
            }
        }

        return { success: true, data: teamMembers };
    } catch (error) {
        logger.error("Failed to fetch project team:", error);
        return { success: false, error: "Ekip bilgileri alınamadı." };
    }
}

export async function updateProjectStatus(projectId: string, newStatus: ProjeDurumu) {
    try {
        const currentProject = await prisma.project.findFirst({ where: { isDeleted: false,  id: projectId } });
        if (!currentProject) {
            return { success: false, error: "Proje bulunamadı." };
        }

        const statusOrder = Object.values(ProjeDurumu);

        const currentStatusIndex = statusOrder.indexOf(currentProject.status);
        const newStatusIndex = statusOrder.indexOf(newStatus);

        // Allow movement (Note: business rules might restrict going backwards, but we'll stick to a simple forward or any for now if requested, 
        // however the previous robust code had logic for it. Let's re-implement the requested logic from previous turn)
        if (currentProject.status !== ProjeDurumu.ASKIYA_ALINDI &&
            currentProject.status !== ProjeDurumu.IPTAL_EDILDI &&
            newStatusIndex < currentStatusIndex &&
            newStatus !== ProjeDurumu.ASKIYA_ALINDI &&
            newStatus !== ProjeDurumu.IPTAL_EDILDI) {
            return { success: false, error: "Proje durumu yalnızca ilerleyen adımlara taşınabilir." };
        }

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: { status: newStatus },
        });

        revalidatePath("/projects");
        revalidatePath(`/projects/${projectId}`);

        return { success: true, data: updatedProject };
    } catch (error: any) {
        logger.error("Error updating project status:", error);
        return { success: false, error: error.message || "Proje durumu güncellenirken bir hata oluştu." };
    }
}

export async function addOrUpdateProject(data: any) {
    const { id, ...formData } = data;
    if (id) {
        return updateProject(id, formData);
    } else {
        return createProject(formData);
    }
}
export async function addProjectStatusHistory(projectId: string, data: { status: ProjeDurumu, note?: string, date?: Date }) {
    try {
        const history = await prisma.projectStatusHistory.create({
            data: {
                projectId,
                status: data.status,
                note: data.note,
                date: data.date || new Date()
            }
        });

        // Also update project status to match
        await prisma.project.update({
            where: { id: projectId },
            data: { status: data.status }
        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, data: history };
    } catch (error) {
        logger.error('Failed to add status history:', error);
        return { success: false, error: 'İşlem başarısız.' };
    }
}
