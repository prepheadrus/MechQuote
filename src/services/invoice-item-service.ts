'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { matchProduct } from '@/actions/matching';

/**
 * Delete a specific invoice item and recalculate invoice totals
 */
export async function deleteInvoiceItem(itemId: string) {
    try {
        // 1. Get the item to find its parent invoice
        const item = await prisma.invoiceItem.findUnique({
            where: { id: itemId },
            select: { invoiceId: true }
        });

        if (!item) {
            return { success: false, error: 'Fatura kalemi bulunamadı.' };
        }

        // 2. Delete the item
        await prisma.invoiceItem.delete({
            where: { id: itemId }
        });

        // 3. Recalculate Invoice Totals
        const remainingItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: item.invoiceId }
        });

        let subTotal = 0;
        let totalDiscountAmount = 0;
        let totalTaxAmount = 0;
        let totalAmount = 0;

        // Lets do a robust sum:
        const newSubTotal = remainingItems.reduce((sum, i) => sum + i.totalPrice, 0); // Base totals
        const newTaxTotal = remainingItems.reduce((sum, i) => sum + (i.taxAmount || (i.totalPrice * ((i.taxRate || 20) / 100))), 0);
        const newDiscountTotal = remainingItems.reduce((sum, i) => sum + (i.discountAmount || 0), 0);

        // Total Amount = SubTotal + Tax (Discount is usually deducted from Unit Price before TotalPrice is calc'd in many systems, OR deducted separately)
        // Let's assume totalPrice IS the post-discount pre-tax amount.
        const newTotalAmount = newSubTotal + newTaxTotal;

        // 4. Update Invoice
        await prisma.invoice.update({
            where: { id: item.invoiceId },
            data: {
                subTotal: newSubTotal,
                totalTaxAmount: newTaxTotal,
                totalDiscountAmount: newDiscountTotal,
                totalAmount: newTotalAmount,
                taxInclusiveTotal: newTotalAmount // same property often
            }
        });

        revalidatePath('/invoices');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete invoice item:', error);
        return { success: false, error: 'Kalem silinirken hata oluştu.' };
    }
}

/**
 * Add items to an existing invoice and recalculate totals
 */
export async function addInvoiceItems(invoiceId: string, items: any[]) {
    try {
        console.log(`[AddItems] Adding ${items.length} items to invoice ${invoiceId}`);

        // 1. Get the invoice to verify it exists and get type
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (!invoice) {
            return { success: false, error: 'Fatura bulunamadı.' };
        }

        // 2a. Fetch existing items to check for duplicates
        const existingItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: invoiceId }
        });

        // 2b. Prepare items with linkedProductId logic
        const preparedItems: any[] = [];
        const itemsToUpdate: any[] = [];

        await Promise.all(items.map(async (item) => {
            // Try to find product by exact name match if no ID provided or if linking desired
            let linkedProductId = item.productId;

            // If the item comes with a 'productId' that looks like a real UUID, good.
            // If it's a virtual one or missing, use Hybrid Matching
            if (!linkedProductId || linkedProductId.startsWith('virtual-')) {
                const matchResult = await matchProduct(item.name, invoice.customerId);
                linkedProductId = matchResult ? matchResult.product?.id : undefined;
            }

            // CHECK FOR DUPLICATE
            const existingMatch = existingItems.find(ex =>
                (linkedProductId && ex.linkedProductId === linkedProductId) ||
                (ex.name === item.name) // Fallback to name match
            );

            if (existingMatch) {
                // Merge Logic: Update existing item
                const newQuantity = existingMatch.quantity + item.quantity;
                const newTotalPrice = existingMatch.unitPrice * newQuantity; // Keep existing Unit Price

                // Recalculate Tax based on original rate (or default)
                const taxRate = existingMatch.taxRate || 20;
                const newTaxAmount = newTotalPrice * (taxRate / 100);

                itemsToUpdate.push({
                    id: existingMatch.id,
                    quantity: newQuantity,
                    totalPrice: newTotalPrice,
                    taxAmount: newTaxAmount,
                });
            } else {
                // Prepare for creation
                preparedItems.push({
                    invoiceId: invoiceId,
                    name: item.name,
                    quantity: item.quantity,
                    unit: item.unit || 'Adet',
                    unitPrice: item.unitPrice,
                    listPrice: item.listPrice || item.unitPrice,
                    discountRate: item.discountRate || 0,
                    discountAmount: item.discountAmount || 0,
                    taxRate: item.taxRate || 20,
                    taxAmount: item.taxAmount || ((item.unitPrice * item.quantity) * (0.20)),
                    totalPrice: item.totalPrice || (item.unitPrice * item.quantity),
                    linkedProductId: linkedProductId
                });
            }
        }));

        // 3. Create New Items
        if (preparedItems.length > 0) {
            await prisma.invoiceItem.createMany({
                data: preparedItems
            });
        }

        // 3b. Update Existing Items
        // Loop because prisma doesn't support bulk update with different values easily
        for (const update of itemsToUpdate) {
            await prisma.invoiceItem.update({
                where: { id: update.id },
                data: {
                    quantity: update.quantity,
                    totalPrice: update.totalPrice,
                    taxAmount: update.taxAmount
                }
            });
        }

        // 4. Recalculate Invoice Totals (Reuse logic from deleteInvoiceItem ideally, or duplicate for safety)
        const allItems = await prisma.invoiceItem.findMany({
            where: { invoiceId: invoiceId }
        });

        const newSubTotal = allItems.reduce((sum, i) => sum + i.totalPrice, 0);
        const newTaxTotal = allItems.reduce((sum, i) => sum + (i.taxAmount || (i.totalPrice * ((i.taxRate || 20) / 100))), 0);
        const newDiscountTotal = allItems.reduce((sum, i) => sum + (i.discountAmount || 0), 0);
        const newTotalAmount = newSubTotal + newTaxTotal;

        // 5. Update Invoice
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                subTotal: newSubTotal,
                totalTaxAmount: newTaxTotal,
                totalDiscountAmount: newDiscountTotal,
                totalAmount: newTotalAmount,
                taxInclusiveTotal: newTotalAmount
            }
        });

        revalidatePath('/invoices');
        return { success: true };

    } catch (error) {
        console.error('Failed to add invoice items:', error);
        return { success: false, error: 'Kalemler eklenirken hata oluştu.' };
    }
}

/**
 * Link invoice item to product and create purchase history
 */
export async function linkInvoiceItemToProject(itemId: string, projectId: string | undefined) {
    try {
        let updatedItem;
        if (!projectId) {
            // Remove the link
            updatedItem = await prisma.invoiceItem.update({
                where: { id: itemId },
                data: { projectId: null },
                include: {
                    project: {
                        include: {
                            customer: true
                        }
                    }
                }
            });
        } else {
            // Validate project exists
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) return { success: false, error: "Seçilen proje bulunamadı." };

            updatedItem = await prisma.invoiceItem.update({
                where: { id: itemId },
                data: { projectId: projectId },
                include: {
                    project: {
                        include: {
                            customer: true
                        }
                    }
                }
            });
        }
        revalidatePath('/invoices');
        return { success: true, data: updatedItem };
    } catch (error: any) {
        console.error('Failed to link project:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkLinkInvoiceItemsToProject(itemIds: string[], projectId: string | undefined) {
    try {
        if (!projectId) {
            // Remove the link for all
            await prisma.invoiceItem.updateMany({
                where: { id: { in: itemIds } },
                data: { projectId: null }
            });
        } else {
            // Validate project exists
            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) return { success: false, error: "Seçilen proje bulunamadı." };

            await prisma.invoiceItem.updateMany({
                where: { id: { in: itemIds } },
                data: { projectId: projectId }
            });
        }

        revalidatePath('/invoices');
        return { success: true };
    } catch (error: any) {
        console.error('Failed to bulk link project:', error);
        return { success: false, error: error.message };
    }
}
