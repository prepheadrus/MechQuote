'use server';

import { prisma } from '@/lib/prisma';
import { Project } from '@prisma/client';
import { logger } from '@/lib/logger';

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
    transactions: Array<{
        type: string;
        amount: number;
    }>;
    customer: {
        name: string;
    };
}

export interface MasterAnalyticsData {
    overall: {
        totalRevenue: number;
        totalEstimatedCost: number;
        totalActualCost: number;
        overallMargin: number;
        totalProfit: number;
    };
    projects: {
        id: string;
        name: string;
        customer: string;
        contractAmount: number;
        estCost: number;
        actCost: number;
        profit: number;
        margin: number;
        deviation: number;
        status: string;
    }[];
    customers: {
        name: string;
        projectCount: number;
        totalRevenue: number;
        totalProfit: number;
        avgMargin: number;
    }[];
    personnel: {
        name: string;
        projectCount: number;
        totalEstimatedLabor: number;
        totalActualLabor: number;
        deviation: number;
    }[];
}

export async function getMasterAnalytics(): Promise<{ success: boolean; data?: MasterAnalyticsData; error?: string }> {
    try {
        const projects = await prisma.project.findMany({ where: { isDeleted: false },
            include: {
                customer: { where: { isDeleted: false } },
                linkedProposal: { where: { isDeleted: false },
                    include: {
                        items: { where: { isDeleted: false } },
                        jobAssignments: { where: { isDeleted: false },
                            include: { personnel: { where: { isDeleted: false } } }
                        }
                    }
                },
                transactions: {
                    where: { isDeleted: false } // ✅ Soft delete filtresi
                }
            }
        });

        // --- OPTIMIZATION START: Batch Fetching ---
        const projectIds = projects.map(p => p.id);

        // 1. Fetch ALL relevant invoice items for ALL projects in one go
        const allInvoiceItems = await prisma.invoiceItem.findMany({
            where: {
                OR: [
                    { projectId: { in: projectIds } },
                    { invoice: { projectId: { in: projectIds } } }
                ],
                isDeleted: false // ✅ Soft delete filtresi
            },
            include: { invoice: { where: { isDeleted: false } } }
        });

        // 2. Fetch ALL relevant job assignments for ALL projects in one go
        const allAssignments = await prisma.jobAssignment.findMany({
            where: { 
                proposal: { projectId: { in: projectIds } },
                isDeleted: false // ✅ Soft delete filtresi
            },
            include: {
                personnel: { where: { isDeleted: false } },
                proposal: { where: { isDeleted: false },  select: { projectId: { where: { isDeleted: false } } } }
            }
        });

        // 3. Group data in memory for O(1) access
        const invoiceItemsMap = new Map<string, typeof allInvoiceItems>();
        allInvoiceItems.forEach(item => {
            const pid = item.projectId || item.invoice?.projectId;
            if (pid) {
                if (!invoiceItemsMap.has(pid)) invoiceItemsMap.set(pid, []);
                invoiceItemsMap.get(pid)!.push(item);
            }
        });

        const assignmentsMap = new Map<string, typeof allAssignments>();
        allAssignments.forEach(a => {
            const pid = a.proposal?.projectId;
            if (pid) {
                if (!assignmentsMap.has(pid)) assignmentsMap.set(pid, []);
                assignmentsMap.get(pid)!.push(a);
            }
        });
        // --- OPTIMIZATION END ---

        const projectStats = projects.map((p: ExtendedProject) => {
            // 1. Get items from memory map instead of DB query
            const relevantItems = invoiceItemsMap.get(p.id) || [];

            // 2. Estimated Costs
            let estMaterials = p.estimatedMaterialCost || 0;
            let estLabor = p.estimatedLaborCost || 0;

            if (estMaterials === 0 && p.linkedProposal?.items) {
                estMaterials = p.linkedProposal.items.reduce((sum, item) => {
                    const xr = (item.currency === 'USD' ? p.linkedProposal!.exchangeRateUSD :
                        item.currency === 'EUR' ? p.linkedProposal!.exchangeRateEUR : 1) ?? 1;
                    return sum + (item.basePrice * item.quantity * xr);
                }, 0);
            }
            if (estLabor === 0 && p.linkedProposal?.jobAssignments) {
                estLabor = p.linkedProposal.jobAssignments.reduce((sum, job) => sum + job.assignedAmount, 0);
            }
            const estTotal = estMaterials + estLabor;

            // 3. Actual Material Costs (From filtered Invoice Items)
            let actMaterials = 0;
            for (const item of relevantItems) {
                if (item.invoice.status === 'Cancelled') continue;
                if (item.invoice.type === 'Incoming') actMaterials += item.totalPrice;
                else if (item.invoice.type === 'PurchaseReturn') actMaterials -= item.totalPrice;
            }

            // 4. Actual Labor Costs (Fiili Ödemeler)
            let actLabor = 0;
            const assignments = assignmentsMap.get(p.id) || [];
            assignments.forEach(job => {
                try {
                    const history = job.paymentHistory ? (Array.isArray(job.paymentHistory) ? job.paymentHistory : (typeof job.paymentHistory === 'string' ? JSON.parse(job.paymentHistory) : [])) : [];
                    actLabor += history.reduce((s: number, pay: any) => s + (pay.amount || 0), 0);
                } catch { }
            });

            // 5. Actual Expenses (Kasa Hareketleri)
            const actExpenses = p.transactions
                .filter(t => t.type !== 'Income')
                .reduce((sum, t) => sum + t.amount, 0);

            const actTotal = actMaterials + actLabor + actExpenses;
            
            // CRITICAL: Use Contract Amount as the ONLY source of truth for revenue.
            // Do NOT fallback to proposal.totalPrice. If contract is 0, revenue is 0.
            const contractAmount = p.contractAmount || 0;
            const profit = contractAmount - actTotal;
            const margin = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

            return {
                id: p.id,
                name: p.name,
                customer: p.customer.name,
                contractAmount,
                estCost: estTotal,
                actCost: actTotal,
                profit,
                margin,
                deviation: estTotal > 0 ? ((actTotal - estTotal) / estTotal) * 100 : 0,
                status: p.status
            };
        });

        // Customer aggregation
        const customerMap = new Map<string, any>();
        projectStats.forEach(ps => {
            if (!customerMap.has(ps.customer)) {
                customerMap.set(ps.customer, { name: ps.customer, projectCount: 0, totalRevenue: 0, totalProfit: 0, margins: [] });
            }
            const c = customerMap.get(ps.customer);
            c.projectCount++;
            c.totalRevenue += ps.contractAmount;
            c.totalProfit += ps.profit;
            c.margins.push(ps.margin);
        });

        // Personnel aggregation
        const personnelMap = new Map<string, any>();
        allAssignments.forEach(ja => {
            if (!ja.personnel) return;
            const name = ja.personnel.name;
            if (!personnelMap.has(name)) {
                personnelMap.set(name, { name, projectCount: 0, totalEstimatedLabor: 0, totalActualLabor: 0 });
            }
            const per = personnelMap.get(name);
            per.projectCount++;
            per.totalEstimatedLabor += ja.assignedAmount;
            try {
                const history = ja.paymentHistory ? (Array.isArray(ja.paymentHistory) ? ja.paymentHistory : (typeof ja.paymentHistory === 'string' ? JSON.parse(ja.paymentHistory) : [])) : [];
                per.totalActualLabor += history.reduce((s: number, pay: any) => s + (pay.amount || 0), 0);
            } catch { }
        });

        const overallRevenue = projectStats.reduce((sum, p) => sum + p.contractAmount, 0);
        const overallActualCost = projectStats.reduce((sum, p) => sum + p.actCost, 0);
        const overallEstimatedCost = projectStats.reduce((sum, p) => sum + p.estCost, 0);

        return {
            success: true,
            data: {
                overall: {
                    totalRevenue: overallRevenue,
                    totalEstimatedCost: overallEstimatedCost,
                    totalActualCost: overallActualCost,
                    overallMargin: overallRevenue > 0 ? ((overallRevenue - overallActualCost) / overallRevenue) * 100 : 0,
                    totalProfit: overallRevenue - overallActualCost
                },
                projects: projectStats,
                customers: Array.from(customerMap.values()).map(c => ({
                    ...c,
                    avgMargin: c.margins.reduce((a: any, b: any) => a + b, 0) / c.margins.length
                })),
                personnel: Array.from(personnelMap.values()).map(p => ({
                    ...p,
                    deviation: p.totalEstimatedLabor > 0 ? ((p.totalActualLabor - p.totalEstimatedLabor) / p.totalEstimatedLabor) * 100 : 0
                }))
            }
        };
    } catch (error: any) {
        logger.error("Master Analytics Error:", error);
        return { success: false, error: error.message };
    }
}
