'use server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function getQuickPurchasingInsight(productId: string) {
    // ... existing ...
}

export async function getBulkPurchasingInsights(productIds: string[]) {
    try {
        const validIds = productIds.filter(id => id && !id.startsWith('custom_') && !id.startsWith('labor_'));
        if (validIds.length === 0) return { success: true, data: {} };

        // Fetch all history for these products
        const history = await prisma.purchaseHistory.findMany({
            where: {
                productId: { in: validIds }
            },
            orderBy: [
                { productId: 'asc' },
                { date: 'desc' }
            ]
        });

        // Group by product and find best/latest
        const results: Record<string, any> = {};
        
        validIds.forEach(id => {
            const productHistory = history.filter(h => h.productId === id);
            if (productHistory.length === 0) return;

            const latest = productHistory[0]; // First due to date desc
            const best = [...productHistory].sort((a, b) => a.netPrice - b.netPrice)[0];

            // Get last unique suppliers (up to 3)
            const seenSuppliers = new Set();
            const uniqueSuppliers = [];
            for (const h of productHistory) {
                if (h.supplierName && !seenSuppliers.has(h.supplierName)) {
                    seenSuppliers.add(h.supplierName);
                    uniqueSuppliers.push({
                        supplierName: h.supplierName,
                        price: h.netPrice,
                        date: h.date,
                        currency: h.currency
                    });
                }
                if (uniqueSuppliers.length >= 5) break; // Return more for better choice
            }

            results[id] = {
                best: {
                    supplierName: best.supplierName,
                    price: best.netPrice,
                    date: best.date,
                    currency: best.currency
                },
                latest: {
                    supplierName: latest.supplierName,
                    price: latest.netPrice,
                    date: latest.date,
                    currency: latest.currency
                },
                comparison: uniqueSuppliers
            };
        });

        return { success: true, data: results };
    } catch (error) {
        logger.error("Bulk insight error:", error);
        return { success: false, error: String(error) };
    }
}
