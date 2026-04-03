'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { createLogger } from "@/lib/logger";

const logger = createLogger('Dashboard');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PaymentHistoryItem {
    amount: number;
    date?: string;
    notes?: string;
}

interface ForecastDay {
    date: string;
    income: number;
    expense: number;
    label: string;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

export const getDashboardStats = cache(async function getDashboardStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);

        logger.info('Dashboard stats loading...');

        // --- Optimized Parallel Fetching ---
        const [
            allSalesInvoices,
            allPurchaseInvoices,
            allReturnInvoices,
            transactions,
            assignments,
            recentInvoices,
            ongoingProjects,
            lowStockProducts,
            pendingProposals
        ] = await Promise.all([
            // OUTGOING INVOICES - Optimized with select
            prisma.invoice.findMany({
                where: { type: 'Outgoing', status: { not: 'Cancelled' }, isDeleted: false },
                select: {
                    id: true,
                    totalAmount: true,
                    dueDate: true,
                    status: true,
                    payments: { where: { isDeleted: false },  select: { amount: true } },
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } }
                }
            }),
            // INCOMING INVOICES - Optimized with select
            prisma.invoice.findMany({
                where: { type: 'Incoming', status: { not: 'Cancelled' }, isDeleted: false },
                select: {
                    id: true,
                    totalAmount: true,
                    dueDate: true,
                    status: true,
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } }
                }
            }),
            // RETURN INVOICES - Optimized with select
            prisma.invoice.findMany({
                where: { type: 'PurchaseReturn', status: { not: 'Cancelled' }, isDeleted: false },
                select: {
                    id: true,
                    totalAmount: true,
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } }
                }
            }),
            // TRANSACTIONS - Minimal fields
            prisma.projectExpense.findMany({
                where: { isDeleted: false }, // ✅ Soft delete filtresi
                select: {
                    id: true,
                    amount: true,
                    type: true,
                    category: true
                }
            }),
            // ASSIGNMENTS - Minimal fields
            prisma.jobAssignment.findMany({
                where: { isDeleted: false }, // ✅ Soft delete filtresi
                select: {
                    id: true,
                    paymentHistory: true
                }
            }),
            // RECENT INVOICES - Limited with select
            prisma.invoice.findMany({
                where: { isDeleted: false },
                take: 10,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    createdAt: true,
                    customer: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } }
                }
            }),
            // ONGOING PROJECTS - Optimized nested includes
            prisma.project.findMany({
                where: {
                    isDeleted: false,
                    status: {
                        in: [
                            'PROJE_PLANLAMA',
                            'MALZEME_TEDARIK',
                            'SAHA_MOBILIZASYONU',
                            'MONTAJ_VE_IMALAT',
                            'TEST_VE_DEVREYE_ALMA',
                            'GECICI_KABUL',
                            'EKSIK_GIDERME'
                        ]
                    }
                },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    contractAmount: true,
                    updatedAt: true,
                    customer: { select: { id: true, name: true } },
                    invoiceItems: {
                        where: { isDeleted: false,
                            invoice: {
                                status: { not: 'Cancelled' }
                            }
                        },
                        select: {
                            totalPrice: true,
                            invoice: { select: { type: true } }
                        }
                    },
                    transactions: {
                        where: { isDeleted: false,  type: 'Expense' },
                        select: { amount: true, category: true }
                    },
                    linkedProposal: { select: {
                            jobAssignments: { where: { isDeleted: false },
                                select: { paymentHistory: true }
                            }
                        }
                    }
                },
                orderBy: { updatedAt: 'desc' }
            }),
            // LOW STOCK PRODUCTS - Optimized
            prisma.product.findMany({
                where: {
                    isDeleted: false,
                    OR: [
                        { stockQuantity: { lte: 10 } },
                        { stockQuantity: { lte: prisma.product.fields.minStockLevel } }
                    ]
                },
                take: 15,
                select: {
                    id: true,
                    name: true,
                    stockQuantity: true,
                    minStockLevel: true
                },
                orderBy: { stockQuantity: 'asc' }
            }),
            // PENDING PROPOSALS - Optimized
            prisma.proposal.findMany({
                where: {
                    isDeleted: false,
                    status: 'Sent',
                    createdAt: { lte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
                },
                select: {
                    id: true,
                    quoteNumber: true,
                    createdAt: true,
                    customer: { select: { id: true, name: true } }
                },
                take: 5,
                orderBy: { createdAt: 'asc' }
            })
        ]);

        logger.info(`Loaded: ${allSalesInvoices.length} sales, ${allPurchaseInvoices.length} purchases, ${ongoingProjects.length} projects`);

        // --- 1. REVENUE (CİRO) ---
        const totalInvoicedRevenue = allSalesInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalManualIncome = transactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const totalRevenue = totalInvoicedRevenue + totalManualIncome;

        // --- 2. CASH IN (TAHSİLAT) ---
        const totalInvoicedCollection = allSalesInvoices.reduce((sum, inv) => {
            return sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
        }, 0);
        const totalCollected = totalInvoicedCollection + totalManualIncome;

        // --- 3. EXPENSES (GİDERLER) ---
        const totalIncomingInvoices = allPurchaseInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalReturnInvoices = allReturnInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

        // Net Official Expenses = Incoming - Returns
        const totalOfficialExpenses = totalIncomingInvoices - totalReturnInvoices;

        const totalManualExpenses = transactions
            .filter(t => t.type !== 'Income' && t.category !== 'Personel Ödemesi')
            .reduce((sum, t) => sum + (t.amount || 0), 0);

        let totalLaborPayments = 0;
        assignments.forEach(ja => {
            if (ja.paymentHistory) {
                try {
                    const history = ja.paymentHistory as PaymentHistoryItem[] | string;
                    const historyArray = Array.isArray(history) ? history : (typeof history === 'string' ? JSON.parse(history) : []);
                    if (Array.isArray(historyArray)) {
                        totalLaborPayments += historyArray.reduce((sum: number, pay: PaymentHistoryItem) => sum + (pay.amount || 0), 0);
                    }
                } catch (e) { }
            }
        });

        const totalExpenses = totalOfficialExpenses + totalManualExpenses + totalLaborPayments;

        // --- 4. PROFIT (NET DURUM) ---
        const netProfit = totalRevenue - totalExpenses;

        // --- NEW: Filtered Stats for Alerts ---
        const lowStockAlerts = lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            current: p.stockQuantity,
            min: p.minStockLevel || 5
        }));

        const proposalReminders = pendingProposals.map(p => ({
            id: p.id,
            number: p.quoteNumber,
            customer: p.customer.name,
            date: p.createdAt,
            days: Math.floor((Date.now() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        }));

        // --- 5. CASH FLOW FORECAST (30 DAYS) ---
        const forecastData: ForecastDay[] = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dateStr = date.toLocaleDateString('sv-SE');
            forecastData.push({ date: dateStr, income: 0, expense: 0, label: date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) });
        }

        allSalesInvoices.forEach(inv => {
            if (!inv.dueDate || inv.dueDate < today || inv.dueDate > thirtyDaysLater) return;
            if (!['Draft', 'Sent', 'Taslak', 'Gönderildi'].includes(inv.status)) return;
            const dateStr = inv.dueDate.toLocaleDateString('sv-SE');
            const day = forecastData.find(d => d.date === dateStr);
            if (day) day.income += inv.totalAmount;
        });

        allPurchaseInvoices.forEach(inv => {
            if (!inv.dueDate || inv.dueDate < today || inv.dueDate > thirtyDaysLater) return;
            if (['Paid', 'Ödendi'].includes(inv.status)) return;
            const dateStr = inv.dueDate.toLocaleDateString('sv-SE');
            const day = forecastData.find(d => d.date === dateStr);
            if (day) day.expense += inv.totalAmount;
        });

        // Project Health Monitor
        const projectHealth = ongoingProjects.map(p => {
            const contractAmount = p.contractAmount || 0;
            const materialSpent = p.invoiceItems.reduce((sum: number, item: any) => {
                if (item.invoice.type === 'Incoming') return sum + item.totalPrice;
                if (item.invoice.type === 'PurchaseReturn') return sum - item.totalPrice;
                return sum;
            }, 0);
            let laborSpent = 0;
            p.linkedProposal?.jobAssignments.forEach((ja: any) => {
                if (ja.paymentHistory) {
                    try {
                        const history = ja.paymentHistory as PaymentHistoryItem[] | string;
                        const historyArray = Array.isArray(history) ? history : (typeof history === 'string' ? JSON.parse(history) : []);
                        if (Array.isArray(historyArray)) laborSpent += historyArray.reduce((s: number, pay: PaymentHistoryItem) => s + (pay.amount || 0), 0);
                    } catch { }
                }
            });
            const expenseSpent = p.transactions
                .filter((t: any) => t.category !== 'Personel Ödemesi')
                .reduce((sum: number, t: any) => sum + t.amount, 0);
            const totalSpent = materialSpent + laborSpent + expenseSpent;
            const percentage = contractAmount > 0 ? (totalSpent / contractAmount) * 100 : 0;
            let status: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (percentage >= 100) status = 'critical';
            else if (percentage >= 90) status = 'critical';
            else if (percentage >= 80) status = 'warning';

            return { id: p.id, name: p.name, customer: p.customer.name, budget: contractAmount, spent: totalSpent, percentage, status };
        });

        return {
            success: true,
            data: {
                totalRevenue,
                totalCollected,
                totalExpenses,
                netProfit,
                recentInvoices,
                projectHealth,
                forecast: forecastData,
                lowStockAlerts,
                proposalReminders
            }
        };

    } catch (error) {
        logger.error("Dashboard stats error:", error);
        return { success: false, error: "Veriler yüklenirken hata oluştu." };
    }
});

export async function updateMonthlyTarget(year: number, month: number, amount: number) {
    try {
        if (isNaN(amount) || amount < 0) return { success: false, error: "Geçersiz tutar." };
        await prisma.monthlyTarget.upsert({
            where: { year_month: { year, month } },
            create: { year, month, targetAmount: amount, currency: 'TRY' },
            update: { targetAmount: amount }
        });
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        logger.error("Failed to update monthly target:", error);
        return { success: false, error: "Hedef güncellenirken bir hata oluştu." };
    }
}
