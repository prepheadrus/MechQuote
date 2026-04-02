import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getDashboardStats } from '@/actions/dashboard-actions';
import DashboardClientPage from '@/app/dashboard-content/dashboard-client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { calculateItemTotals } from '@/lib/pricing';

// --- Types moved to a stable place or kept here with 'export type' ---
export type TopProduct = {
    id: string;
    name: string;
    brand: string;
    totalQuantity: number;
    totalRevenue: number;
}

export type TopCustomer = {
    id: string;
    name: string;
    totalProposals: number;
    totalRevenue: number;
}

export type MonthlyTrendData = {
    name: string;
    revenue: number;
    profit: number;
    count: number;
}

export type DashboardPageData = {
    dashboardStats: any;
    financials: { totalRevenue: number, totalProfit: number, margin: number };
    topProducts: TopProduct[];
    topCustomers: TopCustomer[];
    monthlyFinancials: MonthlyTrendData[];
    operationalStats: { pendingCount: number, approvedCount: number, totalCount: number, winRate: number };
    monthlyTarget: { targetAmount: number, realizedAmount: number, label: string, daysLeft: number, targetYear: number, targetMonth: number, singleMonthTarget: number };
    lastActivities: any[];
    projectHealth: any[];
    forecast: any[];
    lowStockAlerts: any[];
    proposalReminders: any[];
}

const getDateRange = (filter: string): { start: Date, end: Date } | null => {
    const now = new Date();
    if (filter === 'thisMonth') {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) };
    } else if (filter === 'lastMonth') {
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
    } else if (filter === 'thisYear') {
        return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31, 23, 59, 59) };
    }
    return null;
};

/**
 * Sanitizes complex Prisma objects for safe Client-Side serialization.
 * Prevents "Maximum call stack size exceeded" errors.
 */
function sanitizeForClient(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

async function DashboardData({ filter }: { filter: string }) {
    const dateRange = getDateRange(filter);
    const whereClause = dateRange ? { createdAt: { gte: dateRange.start, lte: dateRange.end } } : {};

    const [
        dashboardStatsResult,
        proposals,
        lastActivitiesRaw,
        sixMonthTrendRaw,
        allTargets,
        settings
    ] = await Promise.all([
        getDashboardStats(),
        prisma.proposal.findMany({
            where: whereClause,
            include: {
                items: { where: { isDeleted: false } },
                customer: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.proposal.findMany({ where: { isDeleted: false },
            take: 5,
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.proposal.findMany({
            where: { isDeleted: false,
                status: 'Approved',
                createdAt: { gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
            },
            include: { items: { where: { isDeleted: false } } }
        }),
        prisma.monthlyTarget.findMany({ where: { isDeleted: false } }),
        prisma.settings.findFirst({ where: { isDeleted: false } })
    ]);

    // Financials with CONTRACT amount (not proposal amount!)
    const approvedProposals = proposals.filter(p => p.status === 'Approved');
    
    // Get projects linked to these proposals
    const projects = await prisma.project.findMany({
        where: {
            linkedProposalId: { in: approvedProposals.map(p => p.id) },
            isDeleted: false
        },
        select: {
            id: true,
            contractAmount: true,
            linkedProposalId: true,
            estimatedMaterialCost: true,
            estimatedLaborCost: true
        }
    });
    
    // Use CONTRACT amount as revenue (not proposal total!)
    const totalRevenue = projects.reduce((sum, p) => sum + (p.contractAmount || 0), 0);
    
    // Calculate profit as: Contract Amount - Planned Costs
    let totalProfit = 0;
    projects.forEach(p => {
        const contractAmount = p.contractAmount || 0;
        const plannedMaterialCost = p.estimatedMaterialCost || 0;
        const plannedLaborCost = p.estimatedLaborCost || 0;
        const totalPlannedCost = plannedMaterialCost + plannedLaborCost;
        totalProfit += contractAmount - totalPlannedCost;
    });

    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const financials = { totalRevenue, totalProfit, margin };

    // Top Products
    const productStats: { [key: string]: TopProduct } = {};
    approvedProposals.forEach(p => {
        p.items.forEach(item => {
            if (item.productId) {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        id: item.productId,
                        name: item.name,
                        brand: item.brand || '',
                        totalQuantity: 0,
                        totalRevenue: 0
                    };
                }
                const totals = calculateItemTotals({
                    listPrice: item.listPrice,
                    basePrice: item.basePrice,
                    discountRate: item.discountRate,
                    profitMargin: item.profitMargin,
                    exchangeRate: 1,
                    quantity: item.quantity,
                    vatRate: item.vatRate,
                    priceIncludesVat: item.priceIncludesVat
                });
                productStats[item.productId].totalQuantity += item.quantity;
                productStats[item.productId].totalRevenue += totals.totalTlSell;
            }
        });
    });
    const topProducts = Object.values(productStats).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    // Top Customers
    const customerStats: { [key: string]: TopCustomer } = {};
    approvedProposals.forEach(p => {
        if (p.customerId) {
            if (!customerStats[p.customerId]) {
                customerStats[p.customerId] = {
                    id: p.customerId,
                    name: p.customer.name,
                    totalProposals: 0,
                    totalRevenue: 0
                };
            }
            customerStats[p.customerId].totalProposals++;
            customerStats[p.customerId].totalRevenue += p.totalAmount;
        }
    });
    const topCustomers = Object.values(customerStats).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

    // Monthly Trend
    const trendMap: { [key: string]: MonthlyTrendData } = {};
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = d.toLocaleString('tr-TR', { month: 'long' });
        trendMap[key] = { name: key, revenue: 0, profit: 0, count: 0 };
    }
    sixMonthTrendRaw.forEach(p => {
        if (p.createdAt) {
            const key = p.createdAt.toLocaleString('tr-TR', { month: 'long' });
            if (trendMap[key]) {
                trendMap[key].revenue += p.totalAmount;
                trendMap[key].count++;

                // Calculate profit for this proposal in the trend
                p.items.forEach(item => {
                    const totals = calculateItemTotals({
                        listPrice: item.listPrice,
                        basePrice: item.basePrice,
                        discountRate: item.discountRate,
                        profitMargin: item.profitMargin,
                        exchangeRate: item.currency === 'USD' ? p.exchangeRateUSD : item.currency === 'EUR' ? p.exchangeRateEUR : 1,
                        quantity: item.quantity,
                        vatRate: item.vatRate,
                        priceIncludesVat: item.priceIncludesVat
                    });
                    trendMap[key].profit += totals.totalProfit;
                });
            }
        }
    });
    const monthlyFinancials = Object.values(trendMap);

    // Operational Stats
    const counts: { [key: string]: number } = { 'Approved': 0, 'Sent': 0, 'Rejected': 0, 'Draft': 0 };
    proposals.forEach(p => { if (counts[p.status] !== undefined) counts[p.status]++; });
    const operationalStats = {
        pendingCount: (counts.Sent || 0) + (counts.Draft || 0),
        approvedCount: counts.Approved || 0,
        totalCount: proposals.length,
        winRate: ((counts.Approved || 0) + (counts.Rejected || 0)) > 0 ? ((counts.Approved || 0) / ((counts.Approved || 0) + (counts.Rejected || 0))) * 100 : 0
    };

    // Monthly Target
    let targetAmount = settings?.monthlyTargetAmount ?? 100000;
    let realizedAmount = 0;
    let diffLabel = "Aylık Hedef";
    const now = new Date();
    let targetYear = now.getFullYear();
    let targetMonth = now.getMonth() + 1;

    if (filter === 'thisYear') {
        diffLabel = "Yıllık Hedef";
        const thisYearTargets = allTargets.filter(t => t.year === targetYear);
        targetAmount = thisYearTargets.reduce((sum, t) => sum + t.targetAmount, 0);
        if (thisYearTargets.length < 12) targetAmount += (12 - thisYearTargets.length) * (settings?.monthlyTargetAmount ?? 100000)
    }

    const currentMonthTargetDef = allTargets.find(t => t.year === targetYear && t.month === targetMonth);
    const singleMonthTarget = currentMonthTargetDef ? currentMonthTargetDef.targetAmount : (settings?.monthlyTargetAmount ?? 100000);
    if (filter !== 'thisYear') targetAmount = singleMonthTarget;

    realizedAmount = approvedProposals.reduce((sum, p) => sum + p.totalAmount, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeft = endOfMonth.getDate() - now.getDate();

    const monthlyTarget = { targetAmount, realizedAmount, label: diffLabel, daysLeft, targetYear, targetMonth, singleMonthTarget };

    // Final Data Construction with Explicit Sanitization
    const data: DashboardPageData = sanitizeForClient({
        dashboardStats: dashboardStatsResult.data || {},
        financials,
        topProducts,
        topCustomers,
        monthlyFinancials,
        operationalStats,
        monthlyTarget,
        lastActivities: lastActivitiesRaw.map(p => ({
            id: p.id,
            customerName: p.customer.name,
            projectName: p.projectName,
            quoteNumber: p.quoteNumber,
            totalAmount: p.totalAmount,
            status: p.status,
            createdAt: p.createdAt
        })),
        projectHealth: dashboardStatsResult.data?.projectHealth || [],
        forecast: dashboardStatsResult.data?.forecast || [],
        lowStockAlerts: dashboardStatsResult.data?.lowStockAlerts || [],
        proposalReminders: dashboardStatsResult.data?.proposalReminders || []
    });

    return <DashboardClientPage data={data} />;
}



export function DashboardView({ filter = 'thisMonth' }: { filter?: string }) {
    return (
        <Suspense fallback={<div className="p-8"><Skeleton className="h-[200px] w-full" /></div>}>
            <DashboardData filter={filter} />
        </Suspense>
    );
}
