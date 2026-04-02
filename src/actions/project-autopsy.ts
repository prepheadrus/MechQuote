'use server';

import { prisma } from '@/lib/prisma';
import { Project } from '@prisma/client';

interface ExtendedProject extends Project {
    estimatedMaterialCost: number | null;
    estimatedLaborCost: number | null;
    linkedProposal?: {
        items: Array<{
            basePrice: number;
            quantity: number;
            currency: string;
        }> | null;
        exchangeRateUSD: number | null;
        exchangeRateEUR: number | null;
        jobAssignments: Array<{
            assignedAmount: number;
        }> | null;
    } | null;
}

export interface ProjectAutopsyData {
    estimated: {
        materials: number;
        labor: number;
        total: number;
        margin: number;
    };
    actual: {
        materials: number;
        labor: number;
        expenses: number;
        total: number;
        margin: number;
    };
    deviation: {
        amount: number;
        percentage: number;
        status: 'under' | 'over' | 'exact';
    };
    details: {
        contractAmount: number;
        invoicedRevenue: number; // ✅ YENİ: Gerçek satış faturası
        profitDifference: number;
    };
}

export async function getProjectAutopsy(projectId: string): Promise<{ success: boolean; data?: ProjectAutopsyData; error?: string }> {
    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                linkedProposal: {
                    include: {
                        items: true,
                        jobAssignments: {
                            include: { personnel: true }
                        }
                    }
                },
                transactions: true
            }
        });

        if (!project) return { success: false, error: 'Proje bulunamadı.' };

        // 1. Fetch relevant Invoice Items for Material Costs (Same logic as getProject)
        const relevantItems = await prisma.invoiceItem.findMany({
            where: {
                OR: [
                    { projectId },
                    { projectId: null, invoice: { projectId } }
                ]
            },
            include: { invoice: true }
        });

        // --- CALCULATIONS ---

        // A. Estimated (Planned)
        let estMaterials = (project as ExtendedProject).estimatedMaterialCost || 0;
        let estLabor = (project as ExtendedProject).estimatedLaborCost || 0;

        // Fallback to linked proposal if manual estimates are zero
        if (estMaterials === 0 && project.linkedProposal?.items) {
            estMaterials = project.linkedProposal.items.reduce((sum, item) => {
                const xr = (item.currency === 'USD' ? project.linkedProposal!.exchangeRateUSD :
                           item.currency === 'EUR' ? project.linkedProposal!.exchangeRateEUR : 1) ?? 1;
                return sum + (item.basePrice * item.quantity * xr);
            }, 0);
        }
        if (estLabor === 0 && project.linkedProposal?.jobAssignments) {
            estLabor = project.linkedProposal.jobAssignments.reduce((sum, job) => sum + job.assignedAmount, 0);
        }

        const contractAmount = project.contractAmount || 0;
        const estTotal = estMaterials + estLabor;
        const estMargin = contractAmount > 0 ? ((contractAmount - estTotal) / contractAmount) * 100 : 0;

        // B. Actual (Realized)

        // 1. Materials from Invoices (Support both Turkish and English types)
        let actMaterials = 0;
        for (const item of relevantItems) {
            if (item.invoice.status === 'Cancelled') continue;
            
            // Get exchange rate from invoice (currency conversion)
            const invoiceCurrency = item.invoice.currency || 'TRY';
            const exchangeRate = invoiceCurrency === 'USD' ? 32.50 :
                                invoiceCurrency === 'EUR' ? 35.00 : 1;
            
            // Convert item totalPrice to TL
            const itemTotalTL = item.totalPrice * exchangeRate;
            
            // Support both "Incoming" (EN) and "Gelen" (TR)
            if (item.invoice.type === 'Incoming' || item.invoice.type === 'Gelen') {
                actMaterials += itemTotalTL;
            }
            else if (item.invoice.type === 'PurchaseReturn' || item.invoice.type === 'Iade') {
                actMaterials -= itemTotalTL;
            }
        }

        // 2. Labor from Job Payments (Check both projectId and proposal.projectId)
        let actLabor = 0;
        
        // First: Direct project assignments (JobAssignment.projectId)
        const directAssignments = await prisma.jobAssignment.findMany({
            where: { projectId }
        });
        directAssignments.forEach(job => {
            try {
                const history = job.paymentHistory ? (Array.isArray(job.paymentHistory) ? job.paymentHistory : (typeof job.paymentHistory === 'string' ? JSON.parse(job.paymentHistory) : [])) : [];
                actLabor += history.reduce((s: number, p: any) => s + (p.amount || 0), 0);
            } catch {}
        });
        
        // Second: Proposal-based assignments (fallback)
        const proposalAssignments = await prisma.jobAssignment.findMany({
            where: { proposal: { projectId } }
        });
        proposalAssignments.forEach(job => {
            // Avoid double counting if same assignment
            if (!directAssignments.find(d => d.id === job.id)) {
                try {
                    const history = job.paymentHistory ? (Array.isArray(job.paymentHistory) ? job.paymentHistory : (typeof job.paymentHistory === 'string' ? JSON.parse(job.paymentHistory) : [])) : [];
                    actLabor += history.reduce((s: number, p: any) => s + (p.amount || 0), 0);
                } catch {}
            }
        });

        // 3. Expenses from Transactions (Filter by type "Expense")
        const actExpenses = project.transactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // 4. Invoiced Revenue (Sales Invoice)
        let invoicedRevenue = contractAmount; // Fallback to contract amount
        const salesInvoices = await prisma.invoice.findMany({
            where: {
                projectId,
                type: 'Outgoing', // Sales invoice (English)
                status: { not: 'Cancelled' }
            },
            select: { totalAmount: true }
        });
        if (salesInvoices.length > 0) {
            invoicedRevenue = salesInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        }

        const actTotal = actMaterials + actLabor + actExpenses;
        const actMargin = invoicedRevenue > 0 ? ((invoicedRevenue - actTotal) / invoicedRevenue) * 100 : 0;

        // C. Deviation
        const deviationAmount = actTotal - estTotal;
        const deviationPercentage = estTotal > 0 ? (deviationAmount / estTotal) * 100 : 0;
        const status = deviationAmount > 0 ? 'over' : (deviationAmount < 0 ? 'under' : 'exact');

        return {
            success: true,
            data: {
                estimated: { materials: estMaterials, labor: estLabor, total: estTotal, margin: estMargin },
                actual: { materials: actMaterials, labor: actLabor, expenses: actExpenses, total: actTotal, margin: actMargin },
                deviation: { amount: deviationAmount, percentage: deviationPercentage, status },
                details: { 
                    contractAmount,
                    invoicedRevenue,
                    profitDifference: (invoicedRevenue - actTotal) - (contractAmount - estTotal)
                }
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
