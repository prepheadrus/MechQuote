'use server';

import { prisma } from '@/lib/prisma';

export async function getWarehouseStock() {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            include: {
                _count: { where: { isDeleted: false },
                    select: { stockMovements: { where: { isDeleted: false } } }
                }
            },
            orderBy: { name: 'asc' }
        });

        const criticalStock = products.filter(p => p.stockQuantity <= p.minStockLevel && p.minStockLevel > 0);
        const totalValue = products.reduce((sum, p) => sum + (p.stockQuantity * p.basePrice), 0);

        return {
            success: true,
            data: {
                products,
                stats: {
                    totalItems: products.length,
                    criticalCount: criticalStock.length,
                    totalValue
                }
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStockMovements(productId?: string) {
    try {
        const where = productId ? { productId, isDeleted: false } : { isDeleted: false };
        const movements = await prisma.stockMovement.findMany({
            where,
            include: {
                product: { where: { isDeleted: false } }
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        return { success: true, data: movements };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
