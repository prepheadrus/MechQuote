'use server'

import { prisma } from '@/lib/prisma';
import { Product, ProposalItem } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '../../prisma/audit-logs';
import { logger } from '@/lib/logger';
import { normalizeText } from '@/services/product-search-service';
import { authenticateUser, authorizeUser } from '@/lib/security';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProposalItemWithProposal extends Omit<ProposalItem, 'proposal'> {
    proposal?: {
        exchangeRateUSD: number | null;
        exchangeRateEUR: number | null;
    } | null;
}

interface ProductAnalyticsResult {
    totalProducts: number;
    topSelling: Array<{ id: string; name: string; brand: string; totalQuantity: number }>;
    mostProfitable: Array<{ id: string; name: string; brand: string; avgProfitMargin: number }>;
    averageSellingPrice: number;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

// Cache for searchProducts to avoid DB hits on every keystroke
let productsCache: Product[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedProducts(): Promise<Product[]> {
    const now = Date.now();
    if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return productsCache;
    }

    logger.info('[searchProducts] Loading products from DB (cache miss/expired)');
    productsCache = await prisma.product.findMany({
        where: { isDeleted: false },
        // No take limit - get ALL products for search
    });
    cacheTimestamp = now;
    return productsCache;
}

// Helper to calculate analytics
function calculateAnalytics(
    products: Product[], 
    items: Array<{
        productId: string | null;
        name: string;
        brand: string | null;
        quantity: number;
        profitMargin: number;
        basePrice: number;
        listPrice: number;
        currency: string;
        proposal?: {
            exchangeRateUSD: number | null;
            exchangeRateEUR: number | null;
        } | null;
    }>
): ProductAnalyticsResult {
    const productSales: Record<string, { totalQuantity: number, profitMargins: number[], count: number, totalRevenue: number, sampleName: string, sampleBrand: string }> = {};

    items.forEach(item => {
        // Exchange rate handling
        let exchangeRate = 1;
        if (item.currency === 'USD') exchangeRate = item.proposal?.exchangeRateUSD || 1;
        else if (item.currency === 'EUR') exchangeRate = item.proposal?.exchangeRateEUR || 1;

        // Calculate total price from available fields
        // totalPrice = basePrice * quantity (basePrice already has discount applied)
        const itemTotal = (item.basePrice || item.listPrice || 0) * (item.quantity || 0);
        const lineTotalTL = itemTotal * exchangeRate;
        const productId = item.productId || 'unknown';

        if (!productSales[productId]) {
            productSales[productId] = {
                totalQuantity: 0,
                profitMargins: [],
                count: 0,
                totalRevenue: 0,
                sampleName: item.name || 'İsimsiz Ürün',
                sampleBrand: item.brand || ''
            };
        }
        productSales[productId].totalQuantity += (item.quantity || 0);
        productSales[productId].profitMargins.push(item.profitMargin || 0);
        productSales[productId].totalRevenue += lineTotalTL;
        productSales[productId].count++;
    });

    const topSelling = Object.entries(productSales)
        .sort(([, a], [, b]) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5)
        .map(([id, data]) => {
            const product = products.find(p => p.id === id);
            return {
                id,
                name: product?.name || data.sampleName,
                brand: product?.brand || data.sampleBrand,
                totalQuantity: data.totalQuantity
            };
        });

    const mostProfitable = Object.entries(productSales)
        .map(([id, data]) => ({
            id,
            avgProfitMargin: data.profitMargins.reduce((a, b) => a + b, 0) / data.profitMargins.length,
            sampleName: data.sampleName,
            sampleBrand: data.sampleBrand
        }))
        .sort((a, b) => b.avgProfitMargin - a.avgProfitMargin)
        .slice(0, 5)
        .map(p => {
            const product = products.find(prod => prod.id === p.id);
            return {
                id: p.id,
                name: product?.name || p.sampleName,
                brand: product?.brand || p.sampleBrand,
                avgProfitMargin: p.avgProfitMargin
            }
        });

    const totalRevenue = Object.values(productSales).reduce((sum, p) => sum + p.totalRevenue, 0);
    const totalItemsSold = Object.values(productSales).reduce((sum, p) => sum + p.count, 0);
    const averageSellingPrice = totalItemsSold > 0 ? totalRevenue / totalItemsSold : 0;

    return {
        totalProducts: products.length,
        topSelling,
        mostProfitable,
        averageSellingPrice
    };
}

/**
 * Get product analytics
 * @deprecated Use getProductAnalytics instead
 */
export async function getProductsWithAnalytics() {
    return getProductAnalytics();
}

export async function getProductAnalytics() {
    try {
        const [products, suppliers, categories, approvedItems, purchaseItems] = await Promise.all([
            prisma.product.findMany({ 
                where: { isDeleted: false },
                orderBy: { createdAt: 'desc' } 
            }),
            prisma.supplier.findMany({ 
                where: { isDeleted: false },
                orderBy: { name: 'asc' } 
            }),
            prisma.installationType.findMany({ 
                where: { isDeleted: false },
                orderBy: { name: 'asc' } 
            }),
            prisma.proposalItem.findMany({
                where: { isDeleted: false,  proposal: { status: 'Approved' } },
                select: {
                    productId: true,
                    quantity: true,
                    profitMargin: true,
                    name: true,
                    brand: true,
                    listPrice: true,
                    basePrice: true,
                    discountRate: true,
                    currency: true,
                    proposal: {
                        select: {
                            exchangeRateUSD: true,
                            exchangeRateEUR: true
                        }
                    }
                }
            }),
            // Fetch Incoming Invoice Items for "Most Purchased"
            prisma.invoiceItem.findMany({
                where: { isDeleted: false,
                    invoice: { type: 'Incoming' },
                    linkedProductId: { not: null }
                },
                select: {
                    linkedProductId: true,
                    quantity: true,
                    name: true
                }
            })
        ]);

        const salesAnalytics = calculateAnalytics(products, approvedItems);

        // Calculate Purchase Analytics (Most Purchased)
        const purchaseCounts: Record<string, { qty: number, name: string }> = {};
        purchaseItems.forEach(item => {
            if (!item.linkedProductId) return;
            if (!purchaseCounts[item.linkedProductId]) {
                purchaseCounts[item.linkedProductId] = { qty: 0, name: item.name };
            }
            purchaseCounts[item.linkedProductId].qty += (item.quantity || 0);
        });

        const mostPurchased = Object.entries(purchaseCounts)
            .sort(([, a], [, b]) => b.qty - a.qty)
            .slice(0, 5)
            .map(([id, data]) => {
                const product = products.find(p => p.id === id);
                return {
                    id,
                    name: product?.name || data.name,
                    brand: product?.brand || '',
                    totalQuantity: data.qty
                };
            });

        return {
            success: true,
            data: {
                products,
                suppliers,
                categories,
                analytics: {
                    ...salesAnalytics,
                    mostPurchased // Added new metric
                }
            }
        };
    } catch (error) {
        logger.error('Failed to fetch products with stats:', error);
        return { success: false, error: 'Ürün verileri yüklenirken hata oluştu.' };
    }
}

/**
 * Get product list
 * @deprecated Use getProductList instead
 */
export async function getProducts() {
    return getProductList();
}

export async function getProductList() {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: products };
    } catch (error) {
        logger.error('Failed to fetch products:', error);
        return { success: false, error: 'Ürünler yüklenirken bir hata oluştu.' };
    }
}

/**
 * Gets unique category names from the Product table
 */
export async function getUniqueCategories() {
    try {
        const categories = await prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
            where: { 
                isDeleted: false,
                category: { not: null } 
            }
        });

        // Also include InstallationType names as they are often used as categories
        const installationTypes = await prisma.installationType.findMany({
            select: { name: true },
            where: { isDeleted: false }
        });

        const all = new Set([
            ...categories.map(c => c.category as string),
            ...installationTypes.map(i => i.name)
        ]);

        return { success: true, data: Array.from(all).sort() };
    } catch (error) {
        logger.error('Failed to fetch categories:', error);
        return { success: false, error: 'Kategoriler yüklenirken hata oluştu.' };
    }
}

export async function searchProducts(query: string) {
    try {
        if (!query || query.trim().length < 2) return { success: true, data: [] };

        // Use new centralized search service
        const { searchProducts: searchProductsService } = await import('@/services/product-search-service');

        // Get all products from cache
        const allProducts = await getCachedProducts();

        // Use centralized search
        const results = searchProductsService(allProducts, query);

        // Return top 100 results
        const topResults = results.slice(0, 100).map(r => r.product);

        logger.info(`[searchProducts] Query: "${query}", Found: ${topResults.length} products`);

        return { success: true, data: topResults };
    } catch (error) {
        logger.error('[searchProducts] Error:', error);
        return { success: false, error: 'Arama sırasında hata oluştu' };
    }
}

export async function getProduct(id: string) {
    try {
        const product = await prisma.product.findFirst({
            where: { id, isDeleted: false }
        });
        return { success: true, data: product };
    } catch (error) {
        logger.error('Failed to fetch product:', error);
        return { success: false, error: 'Ürün bulunamadı.' };
    }
}

export async function getProductDetails(id: string) {
    try {
        const product = await prisma.product.findFirst({
            where: { id, isDeleted: false } 
        });
        if (!product) return { success: false, error: 'Ürün bulunamadı.' };

        const [supplier, category, history, sales] = await Promise.all([
            product.supplierId ? prisma.supplier.findFirst({
                where: { id: product.supplierId, isDeleted: false } 
            }) : null,
            product.installationTypeId ? prisma.installationType.findFirst({
                where: { id: product.installationTypeId, isDeleted: false } 
            }) : null,
            prisma.purchaseHistory.findMany({
                where: { 
                    productId: id,
                    isDeleted: false // ✅ Soft delete filtresi
                },
                orderBy: { date: 'desc' }
            }),
            prisma.proposalItem.findMany({
                where: {
                    productId: id,
                    proposal: { status: 'Approved' },
                    isDeleted: false // ✅ Soft delete filtresi
                },
                select: {
                    quantity: true,
                    profitMargin: true,
                    basePrice: true,
                    listPrice: true,
                    currency: true,
                    proposal: {
                        select: {
                            exchangeRateUSD: true,
                            exchangeRateEUR: true
                        }
                    }
                }
            })
        ]);

        // Get the last supplier name from purchase history (if no direct supplier)
        const lastSupplierName = history && history.length > 0 ? history[0].supplierName : null;

        // Calculate Analytics
        let totalSold = 0;
        let totalRevenue = 0;
        let totalProfitMargin = 0;
        let saleCount = sales.length;

        sales.forEach(item => {
            const quantity = item.quantity || 0;
            totalSold += quantity;
            totalProfitMargin += (item.profitMargin || 0);

            // Calculate Revenue (in TL)
            let exchangeRate = 1;
            if (item.currency === 'USD') exchangeRate = item.proposal?.exchangeRateUSD || 1;
            else if (item.currency === 'EUR') exchangeRate = item.proposal?.exchangeRateEUR || 1;

            const itemPrice = item.basePrice || item.listPrice || 0;
            totalRevenue += (itemPrice * quantity * exchangeRate);
        });

        const avgProfitMargin = saleCount > 0 ? totalProfitMargin / saleCount : 0;

        return {
            success: true,
            data: {
                product: {
                    ...product,
                    supplierName: supplier?.name || lastSupplierName, // Use last supplier from history if no direct supplier
                    installationCategoryName: category?.name
                },
                history,
                analytics: {
                    totalSold,
                    totalRevenue,
                    avgProfitMargin,
                    saleCount
                }
            }
        };
    } catch (error) {
        logger.error('Failed to fetch product details:', error);
        return { success: false, error: 'Ürün detayları yüklenirken hata oluştu.' };
    }
}

export async function getLatestPurchaseInfo(productId: string) {
    try {
        const history = await prisma.purchaseHistory.findFirst({
            where: { isDeleted: false,  productId },
            orderBy: { date: 'desc' },
            include: {
                product: {
                    select: {
                        name: true,
                        brand: true,
                        model: true,
                        unit: true
                    }
                }
            }
        });

        if (!history) {
            return { success: true, data: null };
        }

        return { success: true, data: history };
    } catch (error) {
        logger.error('Failed to fetch latest purchase info:', error);
        return { success: false, error: 'Satınalma geçmişi alınamadı.' };
    }
}

/**
 * Fetches the absolute latest pricing context for a product
 * Prioritizes latest purchase history, fallbacks to catalog record
 */
export async function getLatestProductPrice(id: string) {
    try {
        const product = await prisma.product.findFirst({
            where: { id, isDeleted: false },
            select: {
                listPrice: true,
                discountRate: true,
                currency: true,
                vatRate: true,
                priceIncludesVat: true
            }
        });

        const latestHistory = await prisma.purchaseHistory.findFirst({
            where: { isDeleted: false,  productId: id },
            orderBy: { date: 'desc' }
        });

        if (!product) return { success: false, error: 'Ürün bulunamadı.' };

        return {
            success: true,
            data: {
                listPrice: latestHistory?.listPrice ?? product.listPrice,
                discountRate: latestHistory?.discountRate ?? product.discountRate,
                currency: latestHistory?.currency ?? product.currency,
                vatRate: product.vatRate,
                priceIncludesVat: product.priceIncludesVat
            }
        };
    } catch (error) {
        return { success: false, error: 'Fiyat bilgisi alınamadı.' };
    }
}

export async function addPurchaseHistory(data: {
    productId: string;
    supplierId?: string | null;
    supplierName?: string | null;
    date: Date | string;
    listPrice: number;
    discountRate: number;
    netPrice: number;
    currency: string;
    invoiceId?: string | null;
}) {
    try {
        // Normalization: Ensure discountRate is a decimal (e.g., 0.23 instead of 23)
        let normalizedDiscountRate = Number(data.discountRate || 0);
        if (normalizedDiscountRate > 1) normalizedDiscountRate /= 100;

        const history = await prisma.purchaseHistory.create({
            data: {
                productId: data.productId,
                supplierId: data.supplierId,
                supplierName: data.supplierName,
                date: new Date(data.date),
                listPrice: Number(data.listPrice),
                discountRate: normalizedDiscountRate,
                netPrice: Number(data.netPrice),
                currency: data.currency,
                invoiceId: data.invoiceId
            }
        });
        return { success: true, data: history };
    } catch (error: any) {
        logger.error('Failed to add purchase history:', error);
        return { success: false, error: error.message };
    }
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stockQuantity' | 'reservedQuantity' | 'minStockLevel'> & Partial<Pick<Product, 'stockQuantity' | 'reservedQuantity' | 'minStockLevel'>>) {
    try {
        // Normalization
        if (data.discountRate && data.discountRate > 1) data.discountRate /= 100;
        if (data.vatRate && data.vatRate > 1) data.vatRate /= 100;

        const product = await prisma.product.create({
            data: {
                ...data,
            }
        });
        // revalidatePath('/products');
        return { success: true, data: product };
    } catch (error) {
        logger.error('Failed to create product:', error);
        return { success: false, error: 'Ürün oluşturulurken bir hata oluştu.' };
    }
}

export async function updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
        // Loglama için eski veriyi çek
        const oldProduct = await prisma.product.findFirst({
            where: { id, isDeleted: false } 
        });

        // Normalization
        if (data.discountRate && data.discountRate > 1) data.discountRate /= 100;
        if (data.vatRate && data.vatRate > 1) data.vatRate /= 100;

        const product = await prisma.product.update({
            where: { id },
            data
        });

        // Fiyat değişikliği kontrolü ve loglama
        if (oldProduct && data.listPrice !== undefined && data.listPrice !== oldProduct.listPrice) {
            await createAuditLog({
                action: 'UPDATE_PRICE',
                entityId: id,
                entityType: 'Product',
                details: `Fiyat Değişikliği: ${oldProduct.listPrice} -> ${data.listPrice} ${oldProduct.currency} (Ürün: ${oldProduct.name})`
            });
        }

        // revalidatePath('/products');
        return { success: true, data: product };
    } catch (error) {
        logger.error('Failed to update product:', error);
        return { success: false, error: 'Ürün güncellenirken bir hata oluştu.' };
    }
}

export async function deleteProduct(id: string) {
    try {
        await prisma.product.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        // revalidatePath('/products');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete product:', error);
        return { success: false, error: 'Ürün silinirken bir hata oluştu.' };
    }
}

export async function bulkDeleteProducts(ids: string[]) {
    try {
        await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        // revalidatePath('/products');
        return { success: true };
    } catch (error) {
        logger.error('Failed to bulk delete products:', error);
        return { success: false, error: 'Ürünler silinirken bir hata oluştu.' };
    }
}

export async function importProductsFromExcel(products: Partial<Product>[]) {
    try {
        await prisma.$transaction(async (tx) => {
            for (const p of products) {
                // Check if product exists by code
                const existing = await tx.product.findFirst({
                    where: {
                        code: p.code,
                        isDeleted: false
                    }
                });

                // Prepare data (remove undefined/nulls if necessary, but prisma handles it well)
                // We assume 'p' is already formatted correctly by the client

                if (existing) {
                    // Update
                    await tx.product.update({ 
                        where: { id: existing.id }, 
                        data: {
                            name: p.name,
                            code: p.code,
                            brand: p.brand,
                            model: p.model,
                            category: p.category,
                            description: p.description,
                            unit: p.unit,
                            listPrice: p.listPrice,
                            currency: p.currency,
                            vatRate: p.vatRate,
                            basePrice: p.basePrice,
                            priceIncludesVat: p.priceIncludesVat,
                            discountRate: p.discountRate,
                            stockQuantity: p.stockQuantity,
                            reservedQuantity: p.reservedQuantity,
                            minStockLevel: p.minStockLevel
                        }
                    });
                } else {
                    // Create
                    await tx.product.create({ 
                        data: {
                            name: p.name!,
                            code: p.code || null,
                            brand: p.brand || null,
                            model: p.model || null,
                            category: p.category || null,
                            description: p.description || null,
                            unit: p.unit || null,
                            listPrice: p.listPrice || 0,
                            currency: p.currency || 'TRY',
                            vatRate: p.vatRate || 0.20,
                            basePrice: p.basePrice || 0,
                            priceIncludesVat: p.priceIncludesVat || false,
                            discountRate: p.discountRate || 0,
                            stockQuantity: p.stockQuantity || 0,
                            reservedQuantity: p.reservedQuantity || 0,
                            minStockLevel: p.minStockLevel || 0
                        }
                    });
                }
            }
        }, {
            maxWait: 5000, // Transaction kilidi için bekleme süresi (5sn)
            timeout: 60000 // Büyük dosyalar için işlem süresi (60sn)
        });

        // revalidatePath('/products');
        return { success: true };
    } catch (error: any) {
        logger.error('Bulk import error:', error);
        return { success: false, error: `İçe aktarma hatası: ${error.message}` };
    }
}

export async function mergeProducts(targetId: string, sourceIds: string[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Move InvoiceItems
            await tx.invoiceItem.updateMany({
                where: { linkedProductId: { in: sourceIds } },
                data: { linkedProductId: targetId }
            });

            // 2. Move ProposalItems
            await tx.proposalItem.updateMany({
                where: { productId: { in: sourceIds } },
                data: { productId: targetId }
            });

            // 3. Move PurchaseHistory
            await tx.purchaseHistory.updateMany({
                where: { productId: { in: sourceIds } },
                data: { productId: targetId }
            });

            // 4. Soft delete source products
            await tx.product.updateMany({
                where: { id: { in: sourceIds } },
                data: { isDeleted: true, deletedAt: new Date() }
            });
        }, {
            timeout: 20000 // Birleştirme işlemi için güvenli süre (20sn)
        });

        // revalidatePath('/products');
        return { success: true };
    } catch (error) {
        logger.error('Failed to merge products:', error);
        return { success: false, error: 'Ürünler birleştirilirken hata oluştu.' };
    }
}

/**
 * Ensure a product exists in Prisma DB (sync from Dexie if needed)
 * Used when linking invoice items to products that may only exist in IndexedDB
 */
export async function ensureProductInPrisma(productData: {
    id?: string;
    name: string;
    brand?: string;
    model?: string;
    category?: string;
    unit?: string;
    listPrice?: number;
    currency?: string;
    vatRate?: number;
    basePrice?: number;
    priceIncludesVat?: boolean;
    supplierId?: string;
    installationTypeId?: string;
}) {
    try {
        // If ID provided, check if it exists
        if (productData.id) {
            const existing = await prisma.product.findFirst({
                where: { id: productData.id, isDeleted: false }
            });

            if (existing) {
                return { success: true, data: existing };
            }
        }

        // Create new product in Prisma
        const product = await prisma.product.create({
            data: {
                id: productData.id, // Use provided ID if available (from Dexie)
                name: productData.name,
                brand: productData.brand || 'Diğer',
                model: productData.model || '',
                category: productData.category || 'Genel',
                unit: productData.unit || 'Adet',
                listPrice: productData.listPrice || 0,
                currency: productData.currency || 'TRY',
                vatRate: productData.vatRate || 0.20,
                basePrice: productData.basePrice || productData.listPrice || 0,
                priceIncludesVat: productData.priceIncludesVat || false,
                supplierId: productData.supplierId,
                installationTypeId: productData.installationTypeId
            }
        });

        // revalidatePath('/products');
        // revalidatePath(`/products/${product.id}`);
        return { success: true, data: product };
    } catch (error) {
        logger.error('Failed to ensure product in Prisma:', error);
        return { success: false, error: 'Ürün senkronize edilemedi.' };
    }
}

export type DuplicateGroup = {
    name: string;
    products: (Product & {
        _count: {
            purchaseHistory: number;
        }
    })[];
}

export async function findDuplicateProducts() {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            include: {
                _count: {
                    select: {
                        purchaseHistory: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const groups: Record<string, DuplicateGroup> = {};
        
        for (const product of products) {
            const normName = normalizeText(product.name);
            if (!groups[normName]) {
                groups[normName] = { name: product.name, products: [] };
            }
            groups[normName].products.push(product);
        }

        const duplicateGroups = Object.values(groups).filter(g => g.products.length > 1);

        return { success: true, data: duplicateGroups };
    } catch (error) {
        logger.error('Failed to find duplicates:', error);
        return { success: false, error: 'Çift kayıtlar aranırken hata oluştu.' };
    }
}

/**
 * Bulk find best matching products for a list of search queries.
 * Used by Smart Proposal Importer to auto-match draft items without AI.
 */
export async function findBestMatches(queries: string[]) {
    try {
        // 1. Get popular products (Top 100 used in proposals)
        // This acts as a "Frequently Used" cache
        const topItems = await prisma.proposalItem.groupBy({
            by: ['productId'],
            _count: { productId: true },
            orderBy: { _count: { productId: 'desc' } },
            take: 100
        });
        const popularProductIds = topItems.map(i => i.productId);
        const popularSet = new Set(popularProductIds);

        // Process queries in parallel
        const matches = await Promise.all(
            queries.map(async (query, index) => {
                if (!query || query.length < 1) return null;

                // Normalize query
                // Remove Turkish suffixes like "lık", "lik" which are common in colloquial speech but not in DB
                const stopWords = ['lık', 'lik', 'luk', 'lük', 'lı', 'li', 'lu', 'lü', 'cu', 'cü', 'ci', 'cı', 'da', 'de', 'ta', 'te'];

                const terms = query.trim().split(/[\s,\-\/'’]+/).filter(t => {
                    const lower = t.toLocaleLowerCase('tr-TR');
                    if (stopWords.includes(lower)) return false;
                    // Remove single characters that are not numbers (e.g. "x" in "25 x 50")
                    if (t.length === 1 && !/\d/.test(t)) return false;

                    // Keep numbers (25, 100, DN25) even if short
                    if (/\d/.test(t)) return true;
                    // Keep words with length >= 2 (e.g. Te, Su)
                    return t.length >= 2;
                });

                if (terms.length === 0) return null;

                const queryNumbers = terms.filter(t => /\d/.test(t)).map(t => t.replace(/\D/g, ''));
                const queryWords = terms.filter(t => !/\d/.test(t)); // Non-numeric terms

                // Strategy 1: Strict Search (Must contain ALL numeric terms and AT LEAST ONE word term)
                // This prevents "25" matching "50" just because "Boru" matches.
                let candidates = await prisma.product.findMany({
                    where: {
                        isDeleted: false,
                        AND: queryNumbers.map(num => ({
                            OR: [
                                { name: { contains: num } },
                                { code: { contains: num } }
                            ]
                        }))
                    },
                    take: 20 // Limit candidates for performance
                });

                // Strategy 2: Fallback to Popular Products (Loose Search - Match ANY term)
                // Only if strict search failed or returned very few results
                if (candidates.length === 0 && popularProductIds.length > 0) {
                    candidates = await prisma.product.findMany({
                        where: {
                            isDeleted: false,
                            id: { in: popularProductIds as string[] },
                            AND: queryNumbers.map(num => ({
                                name: { contains: num }
                            }))
                        },
                        take: 10
                    });
                }

                // If still no candidates, try a broader search but still require numbers if present
                if (candidates.length === 0 && queryNumbers.length > 0) {
                    candidates = await prisma.product.findMany({
                        where: {
                            isDeleted: false,
                            AND: queryNumbers.map(num => ({ name: { contains: num } }))
                        },
                        take: 20
                    });
                }

                if (candidates.length === 0) return null;

                // Score Candidates in Memory (Better Turkish support & Relevance)
                const scored = candidates.map(p => {
                    let score = 0;
                    const pName = p.name.toLocaleLowerCase('tr-TR');

                    terms.forEach(term => {
                        const t = term.toLocaleLowerCase('tr-TR');

                        // Exact word match in Name gets high points
                        // Regex to find 't' as a whole word (or surrounded by non-word chars)
                        const escapedT = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(^|[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ])${escapedT}([^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ]|$)`, 'i');

                        if (regex.test(pName)) {
                            score += 100;
                        } else if (pName.includes(t)) {
                            score += 10; // Partial match
                        }
                    });

                    // Numeric Match Scoring (Critical for dimensions)
                    queryNumbers.forEach(num => {
                        // Look for the number as a distinct entity (not part of another number)
                        // e.g. "25" matches "Ø25", "DN25", "25mm", " 25 "
                        // but NOT "250" or "125"
                        const numRegex = new RegExp(`(^|[^0-9])${num}([^0-9]|$)`, 'i');
                        if (numRegex.test(pName)) {
                            score += 50; // Big boost for matching the number exactly

                            // Extra boost if it looks like a dimension (preceded by Ø, DN, etc or followed by unit)
                            // Matches: Ø25, DN25, 25mm, 25", 25'
                            const dimRegex = new RegExp(`(Ø|DN|Q|mm|cm|m|inch|'|")${num}|${num}\\s*(mm|cm|m|inch|'|")`, 'i');
                            if (dimRegex.test(pName)) {
                                score += 30; // Huge bonus for dimension match
                            }
                        }
                    });

                    // Penalize name length (prefer shorter, more exact matches)
                    score -= (p.name.length * 0.5);

                    // Boost Popular Products
                    if (popularSet.has(p.id)) {
                        score += 50; // Significant boost for being a frequently used item
                    }

                    return { product: p, score };
                });

                // Sort by score descending
                scored.sort((a, b) => b.score - a.score);

                // STRATEGY CHANGE: High Threshold for Auto-Match
                // Only return as a match if score is sufficiently high
                // This prevents "HAVA DAMPERİ" matching random items
                if (scored[0].score > 150) {
                    return { index, product: scored[0].product };
                }

                return null; // Not sure, leave for manual/suggestion flow
            })
        );

        // Filter out nulls
        const results = matches.filter((m): m is { index: number, product: Product } => m !== null);
        return { success: true, data: results };

    } catch (error) {
        logger.error('Auto-match error:', error);
        return { success: false, error: 'Otomatik eşleştirme sırasında bir hata oluştu.' };
    }
}
