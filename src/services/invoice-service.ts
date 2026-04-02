'use server';

import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { CreateInvoiceSchema, validateWithSchema } from '@/lib/validators';

const logger = createLogger('InvoiceService');
import { Invoice, InvoiceItem, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { createTransaction } from '@/actions/customer-transactions';
import { matchProduct } from '@/actions/matching';
import { findOrCreateCustomerFromInvoice } from './customer-service';

// Type for invoice with items
export type InvoiceWithItems = Invoice & {
    items: InvoiceItem[];
    customer?: any;
};

/**
 * Get all invoices with optional filtering
 */
export async function getInvoices(filters?: {
    type?: 'Incoming' | 'Outgoing';
    customerId?: string;
    status?: string;
}) {
    try {
        const where: any = {};

        if (filters?.type) {
            where.type = filters.type;
        }

        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }

        if (filters?.status) {
            where.status = filters.status;
        }

        const invoices = await prisma.invoice.findMany({
            where: { ...where, isDeleted: false }, // ✅ Soft delete filtresi
            include: {
                customer: {
                    where: { isDeleted: false } // ✅ Nested filtre
                },
                items: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        project: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            include: {
                                customer: true // Tekil ilişki - where desteklenmiyor
                            }
                        }
                    }
                },
                purchaseHistory: {
                    where: { isDeleted: false } // ✅ Soft delete filtresi
                },
                project: {
                    where: { isDeleted: false } // ✅ Soft delete filtresi
                }
            },
            orderBy: { invoiceDate: 'desc' }
        });

        return { success: true, data: invoices };
    } catch (error) {
        console.error('Failed to fetch invoices:', error);
        return { success: false, error: 'Faturalar yüklenirken bir hata oluştu.' };
    }
}

/**
 * Get invoices with analytics
 */
export async function getInvoicesWithAnalytics() {
    try {
        const invoices = await prisma.invoice.findMany({
            where: { isDeleted: false }, // ✅ Soft delete filtresi
            include: {
                customer: {
                    where: { isDeleted: false } // ✅ Nested filtre
                },
                items: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        project: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            include: {
                                customer: true // Tekil ilişki - where desteklenmiyor
                            }
                        }
                    }
                }
            },
            orderBy: { invoiceDate: 'desc' }
        });

        // Calculate analytics
        const incoming = invoices.filter(i => i.type === 'Incoming');
        const outgoing = invoices.filter(i => i.type === 'Outgoing');

        const totalIncoming = incoming.reduce((sum, i) => sum + i.totalAmount, 0);
        const totalOutgoing = outgoing.reduce((sum, i) => sum + i.totalAmount, 0);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthlyIncoming = incoming
            .filter(i => {
                const date = new Date(i.invoiceDate);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            })
            .reduce((sum, i) => sum + i.totalAmount, 0);

        return {
            success: true,
            data: {
                invoices,
                analytics: {
                    totalInvoices: invoices.length,
                    incomingCount: incoming.length,
                    outgoingCount: outgoing.length,
                    totalIncoming,
                    totalOutgoing,
                    monthlyIncoming,
                    balance: totalIncoming - totalOutgoing
                }
            }
        };
    } catch (error) {
        console.error('Failed to fetch invoices with analytics:', error);
        return { success: false, error: 'Fatura verileri yüklenirken hata oluştu.' };
    }
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(id: string) {
    try {
        const invoice = await prisma.invoice.findFirst({
            where: { id, isDeleted: false }, // ✅ Soft delete filtresi
            include: {
                customer: {
                    where: { isDeleted: false } // ✅ Nested filtre
                },
                items: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    include: {
                        project: {
                            where: { isDeleted: false }, // ✅ Nested filtre
                            include: {
                                customer: true // Tekil ilişki - where desteklenmiyor
                            }
                        }
                    }
                },
                purchaseHistory: {
                    where: { isDeleted: false } // ✅ Soft delete filtresi
                },
                payments: {
                    where: { isDeleted: false }, // ✅ Soft delete filtresi
                    orderBy: { date: 'desc' }
                },
                project: {
                    where: { isDeleted: false }, // ✅ Nested filtre
                    include: {
                        customer: true // Tekil ilişki - where desteklenmiyor
                    }
                }
            }
        });

        if (!invoice) {
            return { success: false, error: 'Fatura bulunamadı.' };
        }

        return { success: true, data: invoice };
    } catch (error) {
        console.error('Failed to fetch invoice:', error);
        return { success: false, error: 'Fatura yüklenirken bir hata oluştu.' };
    }
}

/**
 * Create a new invoice
 */
export async function createInvoice(data: {
    type: 'Incoming' | 'Outgoing';
    customerId?: string;
    senderName?: string;
    receiverName?: string;
    senderTaxId?: string;
    senderAddress?: string;
    senderPhone?: string;
    senderEmail?: string;
    senderTaxOffice?: string;
    invoiceNumber: string;
    ettsn?: string;
    invoiceDate: Date;
    currency: string;
    totalAmount: number;
    subTotal?: number;
    totalDiscountAmount?: number;
    totalTaxAmount?: number;
    taxInclusiveTotal?: number;
    pdfFileBlob?: Buffer | string;
    status?: string;
    projectId?: string;
    items: Omit<InvoiceItem, 'id' | 'invoiceId'>[];
}) {
    // Validate input
    const validation = validateWithSchema(CreateInvoiceSchema, data);
    if (!validation.success) {
        return { success: false, error: validation.error };
    }

    // Normalize invoiceDate - convert to Date if string
    let invoiceDate: Date | undefined = undefined;
    if (validation.data.invoiceDate) {
        invoiceDate = validation.data.invoiceDate instanceof Date
            ? validation.data.invoiceDate
            : new Date(validation.data.invoiceDate);
    }

    // Convert base64 to Buffer if needed (Stream-based for memory efficiency)
    let pdfBuffer: Buffer | undefined;
    if (data.pdfFileBlob) {
        if (typeof data.pdfFileBlob === 'string') {
            // Base64 string - convert to Buffer
            // Using Buffer.from for memory-efficient conversion
            pdfBuffer = Buffer.from(data.pdfFileBlob, 'base64');
        } else {
            // Already a Buffer
            pdfBuffer = data.pdfFileBlob as Buffer;
        }
    }

    // Consolidate identical items to prevent multiple rows for the same product
    if (data.items && data.items.length > 0) {
        const mergedMap = new Map<string, typeof data.items[0]>();

        data.items.forEach(item => {
            const key = [
                item.name?.trim() || '',
                // Use fixed precision for price comparison to avoid float issues
                (item.unitPrice || 0).toFixed(4),
                (item.taxRate || 0).toFixed(2),
                (item.discountRate || 0).toFixed(2),
                item.unit || '',
                item.projectId || ''
            ].join('|');

            if (mergedMap.has(key)) {
                const existing = mergedMap.get(key)!;
                existing.quantity += item.quantity;

                // Aggregate total price if present
                if (typeof existing.totalPrice === 'number' && typeof item.totalPrice === 'number') {
                    existing.totalPrice += item.totalPrice;
                }
            } else {
                mergedMap.set(key, { ...item }); // Spread to clone
            }
        });

        // Update items array with consolidated list
        data.items = Array.from(mergedMap.values());
    }

    // Check for existing invoice to prevent duplicates
    if (data.invoiceNumber) {
        const existing = await prisma.invoice.findFirst({
            where: { isDeleted: false,
                invoiceNumber: data.invoiceNumber,
                // Check uniqueness by Tax ID OR Name + Number
                OR: [
                    { senderTaxId: data.senderTaxId || undefined },
                    { senderName: data.senderName }
                ]
            }
        });

        // Also check by ETTSN if available (Strongest check)
        if (!existing && data.ettsn) {
            const existingEttsn = await prisma.invoice.findFirst({
                where: { isDeleted: false,  ettsn: data.ettsn }
            });
            if (existingEttsn) {
                return { success: false, error: `Bu ETTSN ile fatura zaten kayıtlı! (Fatura No: ${existingEttsn.invoiceNumber})` };
            }
        }

        if (existing) {
            console.log(`[CreateInvoice] Duplicate invoice attempted: ${data.invoiceNumber}`);
            return { success: false, error: `Bu fatura numarası (${data.invoiceNumber}) ile daha önce bir kayıt oluşturulmuş.` };
        }
    }

    // Auto-link items to products using the Hybrid Matching Engine
    const itemsWithLinks = await Promise.all(data.items.map(async (item) => {
        const matchResult = await matchProduct(item.name, data.customerId);

        return {
            ...item,
            linkedProductId: matchResult ? matchResult.product?.id : undefined
        };
    }));

    // Auto-resolve customer if missing
    if (!data.customerId && data.senderName) {
        try {
            const customerResult = await findOrCreateCustomerFromInvoice(data.senderName, data.senderTaxId, {
                address: data.senderAddress,
                phone: data.senderPhone,
                email: data.senderEmail,
                taxOffice: data.senderTaxOffice
            });
            if (customerResult.success && customerResult.data) {
                console.log(`[CreateInvoice] Auto-resolved customer: ${customerResult.data.name} (${customerResult.data.id})`);
                data.customerId = customerResult.data.id;
            }
        } catch (err) {
            console.error('[CreateInvoice] Failed to auto-resolve customer:', err);
        }
    }

    try {
        // Use transaction to ensure invoice, items, history and product updates happen together or fail together
        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    type: data.type,
                    customerId: data.customerId,
                    senderName: data.senderName ? String(data.senderName) : undefined,
                    receiverName: data.receiverName ? String(data.receiverName) : undefined,
                    senderTaxId: data.senderTaxId ? String(data.senderTaxId) : undefined,
                    invoiceNumber: String(data.invoiceNumber),
                    ettsn: data.ettsn ? String(data.ettsn) : undefined,
                    invoiceDate: invoiceDate || new Date(),
                    currency: data.currency,
                    totalAmount: data.totalAmount,
                    subTotal: data.subTotal,
                    totalDiscountAmount: data.totalDiscountAmount,
                    totalTaxAmount: data.totalTaxAmount,
                    taxInclusiveTotal: data.taxInclusiveTotal,
                    pdfFileBlob: pdfBuffer ? new Uint8Array(pdfBuffer) : null,
                    status: data.status || 'Draft',
                    projectId: data.projectId,
                    items: {
                        create: itemsWithLinks
                    }
                },
                include: {
                    items: true
                }
            });

            // Create Purchase History for linked items
            const savedItems = (newInvoice as any).items || [];
            for (const item of savedItems) {
                if (item.linkedProductId) {
                    const netPrice = item.unitPrice * (1 - (item.discountRate || 0) / 100);

                    await tx.purchaseHistory.create({
                        data: {
                            productId: item.linkedProductId,
                            supplierId: newInvoice.customerId, // LINKED!
                            supplierName: newInvoice.senderName || 'Bilinmeyen',
                            date: newInvoice.invoiceDate,
                            listPrice: item.listPrice || item.unitPrice,
                            discountRate: item.discountRate || 0,
                            netPrice: netPrice,
                            currency: newInvoice.currency,
                            invoiceId: newInvoice.id
                        }
                    });

                    // Update product prices and stock
                    await tx.product.update({
                        where: { id: item.linkedProductId },
                        data: {
                            listPrice: item.listPrice || item.unitPrice,
                            stockQuantity: { increment: item.quantity }
                        }
                    });

                    // Log Stock Movement
                    await tx.stockMovement.create({
                        data: {
                            productId: item.linkedProductId,
                            quantity: item.quantity,
                            type: 'IN_INVOICE',
                            description: `Fatura ile giriş: ${newInvoice.invoiceNumber}`,
                            referenceId: item.id,
                            date: newInvoice.invoiceDate
                        }
                    });
                }
            }
            return newInvoice;
        });

        // --- Create Customer Transaction (Balance) ---
        if (invoice.customerId) {
            // CORRECTED LOGIC (2026-02-21):
            // Outgoing (Sales): Customer owes us → Debt (positive balance)
            // Incoming (Purchase): We owe supplier → Credit (negative balance = we are debtor)
            // PurchaseReturn: Supplier owes us back → Debt (reduces our debt to them)

            let type: 'Debt' | 'Credit';
            if (invoice.type === 'Outgoing') {
                type = 'Debt'; // Customer owes us
            } else if (invoice.type === 'Incoming') {
                type = 'Credit'; // We owe supplier (negative balance from our perspective)
            } else {
                // PurchaseReturn, SalesReturn, etc.
                type = 'Debt'; // Return reduces debt / creates receivable
            }

            await createTransaction({
                customerId: invoice.customerId,
                amount: invoice.totalAmount,
                type: type,
                description: `Fatura: ${invoice.invoiceNumber} (${invoice.type === 'Outgoing' ? 'Satış' : invoice.type === 'Incoming' ? 'Alış' : invoice.type})`,
                referenceId: invoice.id,
                referenceType: 'Invoice',
                category: invoice.type === 'Outgoing' ? 'Sales' : 'Purchase',
                date: invoice.invoiceDate
            });
        }
        // --------------------------------------------------

        revalidatePath('/invoices');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Failed to create invoice:', error);
        return { success: false, error: 'Fatura oluşturulurken bir hata oluştu.' };
    }
}

/**
 * Update an existing invoice
 */
export async function updateInvoice(
    id: string,
    data: Prisma.InvoiceUpdateInput & { projectId?: string | null } // Explicitly handle projectId in type intersection if needed, or just let generic handle it
) {
    try {
        // Handle projectId specifically: Convert empty string to null to avoid FK error
        if (typeof data.projectId !== 'undefined') {
            if (data.projectId === "" || data.projectId === "no-project") {
                data.projectId = null;
            }
        }

        // Prepare update data (exclude fields that shouldn't be updated directly)
        const updateData: any = { ...data };
        delete (updateData as any).id;
        delete (updateData as any).customerId;
        delete (updateData as any).customerName;

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData,
            include: {
                items: true
            }
        });

        // Cascade project update to all items if projectId was changed
        if (typeof data.projectId !== 'undefined') {
            await prisma.invoiceItem.updateMany({
                where: { invoiceId: id },
                data: { projectId: data.projectId }
            });
        }

        revalidatePath('/invoices');
        revalidatePath(`/invoices/${id}`);
        revalidatePath('/');
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Failed to update invoice:', error);
        return { success: false, error: 'Fatura güncellenirken bir hata oluştu.' };
    }
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(id: string, status: string) {
    try {
        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status }
        });

        revalidatePath('/invoices');
        revalidatePath(`/invoices/${id}`);
        return { success: true, data: invoice };
    } catch (error) {
        console.error('Failed to update invoice status:', error);
        return { success: false, error: 'Fatura durumu güncellenirken hata oluştu.' };
    }
}

/**
 * Delete an invoice (HARD DELETE - Eski davranış, geriye dönük uyumlu)
 * ⚠️ BU FONKSİYON HER ŞEYİ SİLER - DİKKATLİ KULLANIN
 */
export async function deleteInvoice(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete associated purchase history first (FK reference)
            await tx.purchaseHistory.updateMany({
    where: { invoiceId: id },
    data: { isDeleted: true, deletedAt: new Date() }
});

            // 2. Delete the invoice
            await tx.invoice.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } });

            // 3. Delete associated Transaction (Inline logic to ensure atomicity)
            const transactions = await tx.customerTransaction.findMany({
                where: { isDeleted: false,  referenceId: id }
            });

            for (const transaction of transactions) {
                // Reverse balance
                await tx.customer.update({
                    where: { id: transaction.customerId },
                    data: { balance: { decrement: transaction.amount } }
                });
                await tx.customerTransaction.update({ where: { id: transaction.id }, data: { isDeleted: true, deletedAt: new Date() } });
            }
        });

        revalidatePath('/invoices');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete invoice:', error);
        return { success: false, error: 'Fatura silinirken hata oluştu.' };
    }
}

/**
 * ✅ YENİ: Cancel Invoice (SOFT CANCEL - İlişkileri kes, veriyi koru)
 * Faturayı silmek yerine iptal eder - satın alma verisi korunur
 */
export async function cancelInvoice(
    id: string,
    options: {
        reason: string;
        cancelType: "soft" | "hard";
        deletedBy?: string;
        modules: {
            projects: boolean;
            customerBalance: boolean;
            stock: boolean;
            preserveProducts: boolean; // Satın alma verisini koru
        };
    }
) {
    try {
        await prisma.$transaction(async (tx) => {
            const now = new Date();
            
            // 1. Mark invoice as cancelled (soft delete)
            await tx.invoice.update({
                where: { id },
                data: {
                    isDeleted: true,
                    deletedAt: now,
                    deletedBy: options.deletedBy || 'system',
                    deleteReason: options.reason,
                    cancelType: options.cancelType,
                    cancelledModules: JSON.stringify(options.modules),
                }
            });

            // 2. Mark invoice items as cancelled (preserve purchase data)
            await tx.invoiceItem.updateMany({
                where: { invoiceId: id },
                data: {
                    isDeleted: true,
                    deletedAt: now,
                    cancelledAt: now,
                    cancelReason: options.reason,
                    // ✅ Satın alma verisini koru (zaten var olan alanlar)
                    // supplierName, invoiceDate, netPrice korunuyor
                }
            });

            // 3. Module-specific cleanup
            // A. Projects: Remove linkage
            if (options.modules.projects) {
                await tx.invoiceItem.updateMany({
                    where: { invoiceId: id },
                    data: { projectId: null }
                });
            }

            // B. Customer Balance: Create reversal transaction
            if (options.modules.customerBalance) {
                const invoice = await tx.invoice.findFirst({
                    where: { isDeleted: false,  id },
                    include: { customer: true }
                });

                if (invoice && invoice.customerId) {
                    // Create reversal transaction (negative amount)
                    await tx.customerTransaction.create({
                        data: {
                            customerId: invoice.customerId,
                            amount: -invoice.totalAmount, // Negative = reversal
                            type: 'Invoice_Cancelled',
                            description: `Fatura iptal edildi: ${invoice.invoiceNumber} - ${options.reason}`,
                            referenceId: id,
                            referenceType: 'Invoice',
                            date: now
                        }
                    });

                    // Update customer balance
                    await tx.customer.update({
                        where: { id: invoice.customerId },
                        data: { balance: { decrement: invoice.totalAmount } }
                    });
                }
            }

            // C. Stock: Reverse stock movements
            if (options.modules.stock) {
                // Get invoice number for description
                const invoiceForStock = await tx.invoice.findFirst({
                    where: { isDeleted: false,  id },
                    select: { invoiceNumber: true }
                });
                
                const invoiceItems = await tx.invoiceItem.findMany({
                    where: { isDeleted: false,  invoiceId: id },
                    include: { product: true }
                });

                for (const item of invoiceItems) {
                    if (item.linkedProductId && item.product) {
                        // Reverse stock IN (because we're cancelling a purchase)
                        await tx.stockMovement.create({
                            data: {
                                productId: item.linkedProductId,
                                quantity: -item.quantity, // Negative = reverse
                                type: 'INVOICE_CANCELLED',
                                description: `Fatura iptal: ${invoiceForStock?.invoiceNumber || id}`,
                                referenceId: item.id,
                                date: now
                            }
                        });

                        // Update product stock quantity
                        await tx.product.update({
                            where: { id: item.linkedProductId },
                            data: {
                                stockQuantity: { decrement: item.quantity }
                            }
                        });
                    }
                }
            }

            // D. Purchase History: Preserve or mark as cancelled
            if (!options.modules.preserveProducts) {
                // Mark purchase history as cancelled (don't delete)
                await tx.purchaseHistory.updateMany({
                    where: { invoiceId: id },
                    data: {
                        isDeleted: true,
                        deletedAt: now
                    }
                });
            }
            // If preserveProducts = true, do nothing (data stays intact)
        });

        revalidatePath('/invoices');
        return { 
            success: true, 
            message: options.cancelType === 'soft' 
                ? 'Fatura iptal edildi (satın alma verisi korundu)' 
                : 'Fatura iptal edildi (tüm ilişkiler kesildi)'
        };
    } catch (error) {
        console.error('Failed to cancel invoice:', error);
        return { 
            success: false, 
            error: 'Fatura iptal edilirken hata oluştu.' 
        };
    }
}

/**
 * ✅ YENİ: Restore Invoice (İptal edilmiş faturayı geri yükle)
 */
export async function restoreInvoice(id: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Restore invoice
            await tx.invoice.update({
                where: { id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    deletedBy: null,
                    deleteReason: null,
                    cancelType: null,
                    cancelledModules: { set: null }
                }
            });

            // 2. Restore invoice items
            await tx.invoiceItem.updateMany({
                where: { invoiceId: id },
                data: {
                    isDeleted: false,
                    deletedAt: null,
                    cancelledAt: null,
                    cancelReason: null
                }
            });

            // 3. Restore purchase history
            await tx.purchaseHistory.updateMany({
                where: { invoiceId: id },
                data: {
                    isDeleted: false,
                    deletedAt: null
                }
            });
        });

        revalidatePath('/invoices');
        return { success: true, message: 'Fatura geri yüklendi' };
    } catch (error) {
        console.error('Failed to restore invoice:', error);
        return { success: false, error: 'Fatura geri yüklenirken hata oluştu.' };
    }
}

/**
 * Create a Return Invoice
 */
export async function createReturnInvoice(data: {
    supplierName: string;
    customerId?: string;
    invoiceDate: Date;
    items: any[];
    currency: string;
    totalAmount: number;
    taxInclusiveTotal: number;
    projectId?: string;
}) {
    try {
        // 1. Resolve customer if not provided (needed for balance)
        let targetCustomerId = data.customerId;
        let resolvedCustomerName = data.supplierName;

        if (!targetCustomerId) {
            const customerResult = await findOrCreateCustomerFromInvoice(data.supplierName);
            if (customerResult.success && customerResult.data) {
                targetCustomerId = customerResult.data.id;
                resolvedCustomerName = customerResult.data.name;
            }
        }

        // Generate a Return Invoice Number (e.g., RET-YYYYMMDD-XXX)
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const invoiceNumber = `RET-${dateStr}-${randomSuffix}`;

        const invoice = await prisma.invoice.create({
            data: {
                type: 'PurchaseReturn',
                customerId: targetCustomerId,
                receiverName: resolvedCustomerName, // Receiver is the supplier in a return scenario
                senderName: 'Mecit Müh. Mak. İnş. San. ve Tic. Ltd. Şti.', // Standard sender
                invoiceNumber: invoiceNumber,
                invoiceDate: data.invoiceDate,
                currency: data.currency,
                totalAmount: data.totalAmount,
                taxInclusiveTotal: data.taxInclusiveTotal,
                status: 'Draft',
                items: {
                    create: data.items.map((item: any) => ({
                        name: item.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        unit: item.unit,
                        linkedProductId: item.productId
                    }))
                },
                projectId: data.projectId
            }
        });

        // 2. Create Customer Transaction (Debt - Borç)
        // Alış iadesi = Tedarikçiye mal iade ettik = Bizim alacağımız artar = Pozitif bakiye
        if (targetCustomerId) {
            await createTransaction({
                customerId: targetCustomerId,
                amount: data.totalAmount,
                type: 'Debt',
                description: `Alış İadesi: ${invoiceNumber}`,
                referenceId: invoice.id,
                referenceType: 'Invoice',
                category: 'Purchase',
                date: data.invoiceDate
            });
        }

        revalidatePath('/invoices');
        return { success: true, data: invoice };

    } catch (error) {
        console.error('Error creating return invoice:', error);
        return { success: false, error: 'İade faturası oluşturulamadı.' };
    }
}

/**
 * Find a suggested product ID based on previous invoice items with the same name
 */
export async function findSuggestedProductId(invoiceItemName: string) {
    try {
        if (!invoiceItemName) return { success: false, data: null };

        // Normalize the name for better matching (lowercase, trim)
        const normalizedName = invoiceItemName.trim();

        // Find the most recent invoice item with this name that was linked to a product
        // Note: Using search on 'name' field. 
        // Ideally we should use full-text search or normalized columns, 
        // but for now strict insensitive match is a good 'memory' feature.
        const previousMatch = await prisma.invoiceItem.findFirst({
            where: { isDeleted: false,
                name: {
                    equals: normalizedName,
                    // mode: 'insensitive' // Postgres only feature usually, check DB provider. 
                    // If SQLite/MySQL default collation might handle it.
                    // Only safe way cross-DB is explicit casing or exact match.
                    // Keeping exact match for memory safety first.
                },
                linkedProductId: {
                    not: null
                }
            },
            orderBy: {
                invoice: {
                    invoiceDate: 'desc'
                }
            },
            select: {
                linkedProductId: true
            }
        });

        if (previousMatch?.linkedProductId) {
            return { success: true, data: previousMatch.linkedProductId };
        }

        return { success: true, data: null };
    } catch (error) {
        console.error('Failed to find suggestion:', error);
        return { success: false, error: 'Öneri aranırken hata oluştu.' };
    }
}
