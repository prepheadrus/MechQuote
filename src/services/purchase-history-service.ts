'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { saveProductAlias } from '@/actions/matching';
import { PurchaseHistory } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * COMPLETELY WIPE all purchase history.
 * Used when the user wants a clean slate after deleting invoices.
 */
export async function wipeAllPurchaseHistory() {
    try {
        await prisma.purchaseHistory.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        logger.error('Wipe failed:', error);
        return { success: false, error };
    }
}

/**
 * Cleanup duplicate purchase history
 */
export async function cleanupDuplicatePurchaseHistory() {
    try {
        const history = await prisma.purchaseHistory.findMany({ where: { isDeleted: false } });
        const groups = new Map<string, PurchaseHistory[]>();

        // 1. Check for negative prices (bugs) and duplicates
        const idsToDelete: string[] = [];

        history.forEach((h) => {
            // Delete corrupt data (negative prices)
            if (h.netPrice < 0) {
                idsToDelete.push(h.id);
                return;
            }

            if (h.productId) {
                // Deduplicate by content: same product, supplier, date and price
                // This catches same-invoice duplicates AND duplicate invoice uploads
                const dateStr = h.date instanceof Date
                    ? h.date.toISOString().split('T')[0]
                    : String(h.date).split('T')[0];

                const key = `${h.productId}-${h.supplierName || ''}-${dateStr}-${h.listPrice}-${h.discountRate}`;

                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(h);
            }
        });

        // 2. Identify duplicates within groups
        for (const [key, items] of groups) {
            if (items && items.length > 1) {
                // Keep the most recently created one (assuming ID generation order or keeping last)
                const duplicates = items.slice(0, items.length - 1);
                duplicates.forEach(d => {
                    if (!idsToDelete.includes(d.id)) {
                        idsToDelete.push(d.id);
                    }
                });
            }
        }

        if (idsToDelete.length > 0) {
            await prisma.purchaseHistory.updateMany({
    where: { id: { in: idsToDelete } },
    data: { isDeleted: true, deletedAt: new Date() }
});
            logger.info(`[Cleanup] Deleted ${idsToDelete.length} records (duplicates/corrupt).`);
            revalidatePath('/', 'layout');
        }
        return { success: true, count: idsToDelete.length };
    } catch (error) {
        logger.error('Cleanup failed:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Regenerate Purchase History from Invoice Items
 * Used to restore data if it was wiped or to sync legacy data.
 */
export async function regeneratePurchaseHistory() {
    try {
        // 1. Clear existing history to avoid duplicates
        await prisma.purchaseHistory.updateMany({ data: { isDeleted: true, deletedAt: new Date() } });

        // 2. Get all invoice items that are linked to a product
        const items = await prisma.invoiceItem.findMany({
            where: { isDeleted: false,  linkedProductId: { not: null } },
            include: { invoice: true }
        });

        logger.info(`[Regenerate] Found ${items.length} linked items.`);

        let count = 0;
        for (const item of items) {
            if (item.linkedProductId && item.invoice) {
                const netPrice = item.unitPrice * (1 - (item.discountRate || 0) / 100);

                await prisma.purchaseHistory.create({
                    data: {
                        productId: item.linkedProductId,
                        supplierId: item.invoice.customerId,
                        supplierName: item.invoice.senderName || 'Bilinmeyen',
                        date: item.invoice.invoiceDate,
                        listPrice: item.listPrice || item.unitPrice,
                        discountRate: item.discountRate || 0,
                        netPrice: netPrice,
                        currency: item.invoice.currency,
                        invoiceId: item.invoice.id
                    }
                });

                // Update product stats
                await prisma.product.update({
                    where: { id: item.linkedProductId },
                    data: {
                        listPrice: item.listPrice || item.unitPrice,
                        discountRate: item.discountRate || 0,
                        // Update vatRate if valid
                        ...(item.taxRate ? { vatRate: item.taxRate } : {})
                    }
                });

                count++;
            }
        }

        revalidatePath('/', 'layout');
        return { success: true, count };
    } catch (error) {
        logger.error('Regeneration failed:', error);
        return { success: false, error: 'Veri onarımı başarısız oldu.' };
    }
}

/**
 * Link invoice item to product and create purchase history
 */
export async function linkInvoiceItemToProduct(
    invoiceItemId: string,
    productId: string
) {
    try {
        // Get the invoice item with invoice details
        const item = await prisma.invoiceItem.findFirst({
            where: { isDeleted: false,  id: invoiceItemId },
            include: {
                invoice: true,
                product: true // Include product for name
            }
        });

        if (!item || !item.invoice) {
            return { success: false, error: 'Fatura kalemi bulunamadı.' };
        }

        // 1. Update the invoice item (Priority: Persistence of Link)
        await prisma.invoiceItem.update({
            where: { id: invoiceItemId },
            data: { linkedProductId: productId }
        });

        // --- NEW: Save to Training Data (ML Learning) ---
        try {
            const { collectTrainingData } = await import('@/ml/training-collector');
            await collectTrainingData(
                invoiceItemId,
                productId,
                item.name,
                item.product?.name || 'Unknown Product',
                1.0, // High confidence (user approved)
                'user-approved'
            );
        } catch (trainingErr) {
            logger.warn('[LinkProduct] Failed to collect training data:', trainingErr);
            // Don't fail the whole operation if training data collection fails
        }
        // -----------------------------------------------

        // --- NEW: Save Alias (Memory) ---
        try {
            await saveProductAlias(item.invoice.customerId, item.name, productId);
        } catch (aliasErr) {
            logger.warn('[LinkProduct] Failed to save alias:', aliasErr);
        }
        // --------------------------------

        // 2. Try to create purchase history and update product (Optional/Best Effort)
        // Since products might only exist in local Dexie DB, these might fail if not in Prisma.
        // We catch these errors so we don't rollback the link.
        try {
            const netPrice = item.unitPrice * (1 - (item.discountRate || 0) / 100);

            // Check if product exists before trying to link (to avoid FK errors)
            const productExists = await prisma.product.findFirst({ where: { isDeleted: false,  id: productId } });

            if (productExists) {
                // Check if history already exists for this invoice and product to avoid duplicates
                const existingHistory = await prisma.purchaseHistory.findFirst({
                    where: { isDeleted: false,
                        invoiceId: item.invoiceId,
                        productId: productId
                    }
                });

                if (existingHistory) {
                    await prisma.purchaseHistory.update({
                        where: { id: existingHistory.id },
                        data: {
                            supplierId: null,
                            supplierName: item.invoice.senderName || 'Bilinmeyen',
                            date: item.invoice.invoiceDate,
                            listPrice: item.listPrice || item.unitPrice,
                            discountRate: item.discountRate || 0,
                            netPrice,
                            currency: item.invoice.currency
                        }
                    });
                } else {
                    await prisma.purchaseHistory.create({
                        data: {
                            productId,
                            supplierId: null,
                            supplierName: item.invoice.senderName || 'Bilinmeyen',
                            date: item.invoice.invoiceDate,
                            listPrice: item.listPrice || item.unitPrice,
                            discountRate: item.discountRate || 0,
                            netPrice,
                            currency: item.invoice.currency,
                            invoiceId: item.invoiceId
                        }
                    });
                }

                await prisma.product.update({
                    where: { id: productId },
                    data: {
                        basePrice: netPrice, // CRITICAL: Update base price (net purchase price)
                        listPrice: item.listPrice || item.unitPrice,
                        discountRate: item.discountRate || 0,
                        // Update vatRate if valid
                        ...(item.taxRate ? { vatRate: item.taxRate } : {}),
                        stockQuantity: { increment: item.quantity }
                    }
                });

                // Log Stock Movement
                await prisma.stockMovement.create({
                    data: {
                        productId: productId,
                        quantity: item.quantity,
                        type: 'IN_INVOICE',
                        description: `Eşleştirme ile giriş: ${item.invoice.invoiceNumber}`,
                        referenceId: item.id,
                        date: item.invoice.invoiceDate
                    }
                });
            } else {
                logger.warn(`[LinkProduct] Product ${productId} not found in Prisma. Skipping history/update.`);
            }
        } catch (secondaryError) {
            logger.warn('[LinkProduct] Failed to update history/product (non-critical):', secondaryError);
        }

        revalidatePath('/invoices');
        revalidatePath(`/products/${productId}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to link invoice item to product:', error);
        return { success: false, error: 'Ürün eşleştirmesi başarısız oldu.' };
    }
}

/**
 * Get purchased products by supplier for Return Invoice Wizard
 */
export async function getPurchasedProductsBySupplier(supplierName: string) {
    try {
        // Query InvoiceItems directly to get the actionable purchase data (price, quantity, invoice no)
        // We find items from invoices sent by this supplier
        const items = await prisma.invoiceItem.findMany({
            where: { isDeleted: false,
                invoice: {
                    senderName: { contains: supplierName }, // Flexible match
                    type: 'Incoming'
                }
            },
            include: {
                invoice: { where: { isDeleted: false },
                    select: {
                        invoiceDate: { where: { isDeleted: false } },
                        invoiceNumber: { where: { isDeleted: false } },
                        currency: { where: { isDeleted: false } }
                    }
                }
            },
            orderBy: {
                invoice: { invoiceDate: 'desc' }
            }
        });

        // Collect all linkedProductIds to fetch system names
        const linkedProductIds = items
            .map(i => i.linkedProductId)
            .filter((id): id is string => id !== null);

        const products = await prisma.product.findMany({
            where: { isDeleted: false,  id: { in: linkedProductIds } },
            select: { id: { where: { isDeleted: false } }, name: { where: { isDeleted: false } }, unit: { where: { isDeleted: false } } }
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        // Group by LINKED Product ID (preferred) or Name
        const uniqueProductsMap = new Map();

        items.forEach(item => {
            const key = item.linkedProductId || item.name; // Use ID if available, else Name

            if (!uniqueProductsMap.has(key)) {
                const systemProduct = item.linkedProductId ? productMap.get(item.linkedProductId) : null;

                uniqueProductsMap.set(key, {
                    productId: item.linkedProductId || `virtual-${item.id}`, // Fallback ID

                    // Display Logic: Use System Name if available, otherwise Invoice Item Name
                    name: systemProduct ? systemProduct.name : item.name,
                    originalName: item.name, // Keep supplier's name for reference

                    lastPrice: item.unitPrice,
                    currency: item.invoice.currency, // Use invoice currency
                    lastDate: item.invoice.invoiceDate,
                    unit: systemProduct ? systemProduct.unit : item.unit,

                    // New fields for details
                    invoiceNumber: item.invoice.invoiceNumber,
                    quantity: item.quantity,
                    netPrice: item.unitPrice,
                    taxAmount: item.taxAmount || (item.totalPrice * (item.taxRate || 0.20)), // Fallback calc
                    totalAmount: item.totalPrice
                });
            }
        });

        return { success: true, data: Array.from(uniqueProductsMap.values()) };

    } catch (error) {
        logger.error('Error fetching purchased products:', error);
        return { success: false, error: 'Ürün geçmişi alınamadı.' };
    }
}
