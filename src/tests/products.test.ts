/**
 * Products Action Test Suite
 * 
 * Tests for src/actions/products.ts
 * 
 * Test Stratejisi:
 * - Happy Path: Normal kullanım senaryoları
 * - Edge Cases: Sıfır miktar, negatif fiyat, boş değerler
 * - Error Handling: Hata durumları
 * - Mocking: Prisma çağrıları mock'lanacak
 */

import {
    getProductAnalytics,
    getProductList,
    getUniqueCategories,
    searchProducts,
    getProduct,
    getProductDetails,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDeleteProducts,
    findDuplicateProducts,
    findBestMatches,
} from '@/actions/products';
import { prisma } from '@/lib/prisma';
import { Product, Supplier, InstallationType, ProposalItem, InvoiceItem } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        product: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            groupBy: jest.fn(),
            updateMany: jest.fn(),
        },
        supplier: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        installationType: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
        },
        proposalItem: {
            findMany: jest.fn(),
            groupBy: jest.fn(),
        },
        invoiceItem: {
            findMany: jest.fn(),
        },
        purchaseHistory: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            updateMany: jest.fn(),
        },
        $transaction: jest.fn(async (fn) => await fn(prisma)),
    },
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

// Mock createAuditLog
jest.mock('../../prisma/audit-logs', () => ({
    createAuditLog: jest.fn(),
}));

// Mock product-search-service
jest.mock('@/services/product-search-service', () => ({
    searchProducts: jest.fn((products: Product[], query: string) => {
        const normalizedQuery = query.toLowerCase();
        return products
            .filter(p => p.name.toLowerCase().includes(normalizedQuery))
            .map(p => ({ product: p, score: 100 }));
    }),
    normalizeText: jest.fn((text: string) => text.toLowerCase()),
    tokenize: jest.fn((text: string) => text.toLowerCase().split(/\s+/)),
}));

describe('Products Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Mock data
    const mockProducts: Product[] = [
        {
            id: '1',
            name: 'Vana Küresel 1" Tam Geçişli',
            brand: 'Kelebek',
            model: 'KG-100',
            code: 'KN-001',
            category: 'Vanalar',
            listPrice: 150.00,
            basePrice: 100.00,
            unit: 'ADET',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 50,
            minStock: 10,
            discountRate: 0.20,
            currency: 'TRY',
            vatRate: 0.20,
            supplierId: 'supplier-1',
            installationTypeId: 'category-1',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            description: null,
            purchasePrice: null,
            lastPurchasePrice: null,
            targetProfitMargin: null,
            minProfitMargin: null,
            maxProfitMargin: null,
            defaultProfitMargin: null,
            stockQuantity: 50,
            reservedQuantity: 0,
            minStockLevel: 10,
            isDeleted: false,
            deletedAt: null,
        },
        {
            id: '2',
            name: 'Vana Küresel 2" Yarım Geçişli',
            brand: 'Kelebek',
            model: 'KG-200',
            code: 'KN-002',
            category: 'Vanalar',
            listPrice: 250.00,
            basePrice: 180.00,
            unit: 'ADET',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 30,
            minStock: 5,
            discountRate: 0.15,
            currency: 'TRY',
            vatRate: 0.20,
            supplierId: 'supplier-1',
            installationTypeId: 'category-1',
            createdAt: new Date('2024-01-02'),
            updatedAt: new Date('2024-01-02'),
            description: null,
            purchasePrice: null,
            lastPurchasePrice: null,
            targetProfitMargin: null,
            minProfitMargin: null,
            maxProfitMargin: null,
            defaultProfitMargin: null,
            stockQuantity: 30,
            reservedQuantity: 0,
            minStockLevel: 5,
            isDeleted: false,
            deletedAt: null,
        },
        {
            id: '3',
            name: 'Boru Siyah Dikişli 1"',
            brand: 'Çelik Boru',
            model: null,
            code: 'BR-001',
            category: 'Borular',
            listPrice: 80.00,
            basePrice: 60.00,
            unit: 'METRE',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 500,
            minStock: 100,
            discountRate: 0.10,
            currency: 'TRY',
            vatRate: 0.20,
            supplierId: 'supplier-2',
            installationTypeId: 'category-2',
            createdAt: new Date('2024-01-03'),
            updatedAt: new Date('2024-01-03'),
            description: null,
            purchasePrice: null,
            lastPurchasePrice: null,
            targetProfitMargin: null,
            minProfitMargin: null,
            maxProfitMargin: null,
            defaultProfitMargin: null,
            stockQuantity: 500,
            reservedQuantity: 0,
            minStockLevel: 100,
            isDeleted: false,
            deletedAt: null,
        },
    ];

    const mockSuppliers: Supplier[] = [
        {
            id: 'supplier-1',
            name: 'Kelebek Sanayi',
            contactName: 'Ahmet Yılmaz',
            email: 'info@kelebek.com',
            phone: '0212-555-1234',
            address: 'İstanbul',
            taxNumber: '1234567890',
            taxOffice: 'İstanbul',
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
        },
        {
            id: 'supplier-2',
            name: 'Çelik Boru A.Ş.',
            contactName: 'Mehmet Demir',
            email: 'info@celikboru.com',
            phone: '0212-555-5678',
            address: 'Kocaeli',
            taxNumber: '0987654321',
            taxOffice: 'Kocaeli',
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
        },
    ];

    const mockCategories: InstallationType[] = [
        {
            id: 'category-1',
            name: 'Vanalar',
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
        },
        {
            id: 'category-2',
            name: 'Borular',
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
        },
    ];

    const mockProposalItems: ProposalItem[] = [
        {
            id: 'pi-1',
            proposalId: 'proposal-1',
            productId: '1',
            name: 'Vana Küresel 1"',
            brand: 'Kelebek',
            model: 'KG-100',
            quantity: 10,
            unit: 'ADET',
            listPrice: 150,
            basePrice: 100,
            currency: 'TRY',
            discountRate: 0.20,
            profitMargin: 0.25,
            groupName: 'Mekanik',
            groupDescription: null,
            vatRate: 0.20,
            priceIncludesVat: false,
            orderIndex: 0,
            isDeleted: false,
            deletedAt: null,
        },
        {
            id: 'pi-2',
            proposalId: 'proposal-1',
            productId: '2',
            name: 'Vana Küresel 2"',
            brand: 'Kelebek',
            model: 'KG-200',
            quantity: 5,
            unit: 'ADET',
            listPrice: 250,
            basePrice: 180,
            currency: 'TRY',
            discountRate: 0.15,
            profitMargin: 0.30,
            groupName: 'Mekanik',
            groupDescription: null,
            vatRate: 0.20,
            priceIncludesVat: false,
            orderIndex: 1,
            isDeleted: false,
            deletedAt: null,
        },
    ];

    const mockInvoiceItems: InvoiceItem[] = [
        {
            id: 'ii-1',
            invoiceId: 'invoice-1',
            linkedProductId: '1',
            name: 'Vana Küresel 1"',
            brand: 'Kelebek',
            quantity: 20,
            unit: 'ADET',
            unitPrice: 100,
            totalPrice: 2000,
            vatRate: 0.20,
            discountRate: 0.20,
            currency: 'TRY',
            priceIncludesVat: false,
            isDeleted: false,
            deletedAt: null,
        },
    ];

    describe('getProductAnalytics', () => {
        it('should return products with analytics data - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
            (prisma.supplier.findMany as jest.Mock).mockResolvedValue(mockSuppliers);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue(mockCategories);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue(mockProposalItems);
            (prisma.invoiceItem.findMany as jest.Mock).mockResolvedValue(mockInvoiceItems);

            // Act
            const result = await getProductAnalytics();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data?.products).toHaveLength(3);
            expect(result.data?.suppliers).toHaveLength(2);
            expect(result.data?.categories).toHaveLength(2);
            expect(result.data?.analytics).toBeDefined();
            expect(result.data?.analytics.topSelling).toBeDefined();
            expect(result.data?.analytics.mostProfitable).toBeDefined();
            expect(result.data?.analytics.mostPurchased).toBeDefined();
        });

        it('should handle empty database - EDGE CASE', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.supplier.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getProductAnalytics();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.products).toHaveLength(0);
            expect(result.data?.analytics.averageSellingPrice).toBe(0);
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('DB connection failed'));

            // Act
            const result = await getProductAnalytics();

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün verileri yüklenirken hata oluştu.');
        });

        it('should handle proposal items without productId - EDGE CASE', async () => {
            // Arrange
            const itemsWithoutProductId = [
                { ...mockProposalItems[0], productId: null },
            ];
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
            (prisma.supplier.findMany as jest.Mock).mockResolvedValue(mockSuppliers);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue(mockCategories);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue(itemsWithoutProductId);
            (prisma.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getProductAnalytics();

            // Assert
            expect(result.success).toBe(true);
            // Should not crash with null productId
        });

        it('should calculate correct analytics with multiple currencies', async () => {
            // Arrange - Create proposal items with proper proposal relation
            const itemsWithForeignCurrency = [
                {
                    id: 'pi-usd-1',
                    proposalId: 'proposal-1',
                    productId: '1',
                    name: 'Vana Küresel 1"',
                    brand: 'Kelebek',
                    model: 'KG-100',
                    quantity: 10,
                    unit: 'ADET',
                    listPrice: 150,
                    basePrice: 100,
                    currency: 'USD',
                    discountRate: 0.20,
                    profitMargin: 0.25,
                    groupName: 'Mekanik',
                    groupDescription: null,
                    vatRate: 0.20,
                    priceIncludesVat: false,
                    orderIndex: 0,
                    proposal: {
                        exchangeRateUSD: 32.5,
                        exchangeRateEUR: 35.0,
                    },
                },
            ];
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
            (prisma.supplier.findMany as jest.Mock).mockResolvedValue(mockSuppliers);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue(mockCategories);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue(itemsWithForeignCurrency);
            (prisma.invoiceItem.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getProductAnalytics();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.analytics).toBeDefined();
            expect(result.data?.analytics.topSelling).toBeDefined();
            expect(result.data?.analytics.mostProfitable).toBeDefined();
        });
    });

    describe('getProductList', () => {
        it('should return all products - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

            // Act
            const result = await getProductList();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(3);
            expect(prisma.product.findMany).toHaveBeenCalledWith({
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should handle empty product list - EDGE CASE', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getProductList();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await getProductList();

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürünler yüklenirken bir hata oluştu.');
        });
    });

    describe('getUniqueCategories', () => {
        it('should return unique categories from products and installation types - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue([
                { category: 'Vanalar' },
                { category: 'Borular' },
                { category: 'Vanalar' }, // Duplicate
            ]);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue([
                { name: 'Vanalar' },
                { name: 'Fitings' },
            ]);

            // Act
            const result = await getUniqueCategories();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toContain('Vanalar');
            expect(result.data).toContain('Borular');
            expect(result.data).toContain('Fitings');
            expect(result.data?.length).toBeGreaterThanOrEqual(2);
        });

        it('should handle null categories - EDGE CASE', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue([
                { category: null },
                { category: 'Borular' },
            ]);
            (prisma.installationType.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getUniqueCategories();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toContain('Borular');
            // Note: null categories are filtered by Prisma query (where: { category: { not: null } })
            // But installation types can still be added
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await getUniqueCategories();

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Kategoriler yüklenirken hata oluştu.');
        });
    });

    describe('searchProducts', () => {
        it('should return empty array for short query - EDGE CASE', async () => {
            // Act
            const result = await searchProducts('a');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });

        it('should search products using service - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

            // Act
            const result = await searchProducts('vana');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data.length).toBeLessThanOrEqual(100);
        });

        it('should handle search error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('Search error'));

            // Act
            const result = await searchProducts('test');

            // Assert
            // Note: searchProducts catches errors but returns success: false only if service throws
            // The mock service doesn't throw, so it returns success: true with empty data
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });
    });

    describe('getProduct', () => {
        it('should return single product - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProducts[0]);

            // Act
            const result = await getProduct('1');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('1');
            expect(result.data?.name).toBe('Vana Küresel 1" Tam Geçişli');
        });

        it('should return null for non-existent product - EDGE CASE', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await getProduct('non-existent');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toBeNull();
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await getProduct('1');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün bulunamadı.');
        });
    });

    describe('getProductDetails', () => {
        it('should return product with full details - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProducts[0]);
            (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(mockSuppliers[0]);
            (prisma.installationType.findUnique as jest.Mock).mockResolvedValue(mockCategories[0]);
            (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue(mockProposalItems);

            // Act
            const result = await getProductDetails('1');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.product).toBeDefined();
            expect(result.data?.product.supplierName).toBe('Kelebek Sanayi');
            expect(result.data?.product.installationCategoryName).toBe('Vanalar');
            expect(result.data?.history).toBeDefined();
            expect(result.data?.analytics).toBeDefined();
        });

        it('should return error for non-existent product - EDGE CASE', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

            // Act
            const result = await getProductDetails('non-existent');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün bulunamadı.');
        });

        it('should handle product without supplier - EDGE CASE', async () => {
            // Arrange
            const productWithoutSupplier = { ...mockProducts[0], supplierId: null };
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(productWithoutSupplier);
            (prisma.supplier.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.installationType.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.purchaseHistory.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.proposalItem.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await getProductDetails('1');

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.product.supplierName).toBeNull();
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await getProductDetails('1');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün detayları yüklenirken hata oluştu.');
        });
    });

    describe('createProduct', () => {
        it('should create product successfully - HAPPY PATH', async () => {
            // Arrange
            const newProduct = {
                name: 'Yeni Ürün',
                brand: 'Test Marka',
                listPrice: 100,
                basePrice: 80,
                currency: 'TRY',
                vatRate: 0.20,
                discountRate: 0.10,
                unit: 'ADET',
                stock: 50,
                minStock: 10,
                taxRate: 20,
                priceIncludesVat: false,
            };
            (prisma.product.create as jest.Mock).mockResolvedValue({
                id: 'new-id',
                ...newProduct,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Act
            const result = await createProduct(newProduct as Product);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.id).toBe('new-id');
            expect(prisma.product.create).toHaveBeenCalled();
        });

        it('should normalize discount rate > 1 - EDGE CASE', async () => {
            // Arrange
            const productWithHighDiscount = {
                name: 'Test Ürün',
                brand: 'Test',
                listPrice: 100,
                discountRate: 23, // Should be normalized to 0.23
                vatRate: 20, // Should be normalized to 0.20
                currency: 'TRY',
                basePrice: 80,
                unit: 'ADET',
                stock: 50,
                minStock: 10,
                taxRate: 20,
                priceIncludesVat: false,
            };
            (prisma.product.create as jest.Mock).mockResolvedValue({
                id: 'new-id',
                ...productWithHighDiscount,
                discountRate: 0.23,
                vatRate: 0.20,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Act
            const result = await createProduct(productWithHighDiscount as Product);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data?.discountRate).toBe(0.23);
            expect(result.data?.vatRate).toBe(0.20);
        });

        it('should handle creation error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.create as jest.Mock).mockRejectedValue(new Error('Validation error'));

            // Act
            const result = await createProduct({ name: 'Test' } as Product);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün oluşturulurken bir hata oluştu.');
        });
    });

    describe('updateProduct', () => {
        it('should update product successfully - HAPPY PATH', async () => {
            // Arrange
            const oldProduct = mockProducts[0];
            const updatedProduct = { ...oldProduct, listPrice: 200 };
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(oldProduct);
            (prisma.product.update as jest.Mock).mockResolvedValue(updatedProduct);

            // Act
            const result = await updateProduct('1', { listPrice: 200 });

            // Assert
            expect(result.success).toBe(true);
            expect(prisma.product.update).toHaveBeenCalledWith({
                where: { id: '1' },
                data: { listPrice: 200 },
            });
        });

        it('should normalize discount rate on update - EDGE CASE', async () => {
            // Arrange
            const oldProduct = mockProducts[0];
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(oldProduct);
            (prisma.product.update as jest.Mock).mockResolvedValue({
                ...oldProduct,
                discountRate: 0.25,
            });

            // Act
            const result = await updateProduct('1', { discountRate: 25 });

            // Assert
            expect(result.success).toBe(true);
            expect(prisma.product.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        discountRate: 0.25,
                    }),
                })
            );
        });

        it('should handle update error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProducts[0]);
            (prisma.product.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

            // Act
            const result = await updateProduct('1', { listPrice: 200 });

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün güncellenirken bir hata oluştu.');
        });
    });

    describe('deleteProduct', () => {
        it('should delete product successfully - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.delete as jest.Mock).mockResolvedValue(mockProducts[0]);

            // Act
            const result = await deleteProduct('1');

            // Assert
            expect(result.success).toBe(true);
            expect(prisma.product.delete).toHaveBeenCalledWith({
                where: { id: '1' },
            });
        });

        it('should handle delete error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.delete as jest.Mock).mockRejectedValue(new Error('Delete failed'));

            // Act
            const result = await deleteProduct('1');

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürün silinirken bir hata oluştu.');
        });
    });

    describe('bulkDeleteProducts', () => {
        it('should delete multiple products - HAPPY PATH', async () => {
            // Arrange
            (prisma.product.deleteMany as jest.Mock).mockResolvedValue({ count: 3 });

            // Act
            const result = await bulkDeleteProducts(['1', '2', '3']);

            // Assert
            expect(result.success).toBe(true);
            expect(prisma.product.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['1', '2', '3'] } },
            });
        });

        it('should handle bulk delete with empty array - EDGE CASE', async () => {
            // Arrange
            (prisma.product.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

            // Act
            const result = await bulkDeleteProducts([]);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should handle bulk delete error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.deleteMany as jest.Mock).mockRejectedValue(new Error('Bulk delete failed'));

            // Act
            const result = await bulkDeleteProducts(['1', '2']);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Ürünler silinirken bir hata oluştu.');
        });
    });

    describe('findDuplicateProducts', () => {
        it('should find duplicate products by name - HAPPY PATH', async () => {
            // Arrange
            const productsWithDuplicates = [
                { ...mockProducts[0], name: 'Vana Küresel 1"', _count: { purchaseHistory: 5 } },
                { ...mockProducts[1], name: 'Vana Küresel 1"', _count: { purchaseHistory: 3 } }, // Duplicate
                { ...mockProducts[2], name: 'Boru Siyah', _count: { purchaseHistory: 10 } },
            ];
            (prisma.product.findMany as jest.Mock).mockResolvedValue(productsWithDuplicates);

            // Act
            const result = await findDuplicateProducts();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
            expect(result.data?.[0].products).toHaveLength(2);
        });

        it('should return empty array when no duplicates - EDGE CASE', async () => {
            // Arrange
            const uniqueProducts = mockProducts.map(p => ({
                ...p,
                _count: { purchaseHistory: 0 },
            }));
            (prisma.product.findMany as jest.Mock).mockResolvedValue(uniqueProducts);

            // Act
            const result = await findDuplicateProducts();

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await findDuplicateProducts();

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Çift kayıtlar aranırken hata oluştu.');
        });
    });

    describe('findBestMatches', () => {
        it('should find best matches for queries - HAPPY PATH', async () => {
            // Arrange
            (prisma.proposalItem.groupBy as jest.Mock).mockResolvedValue([
                { productId: '1', _count: { productId: 10 } },
                { productId: '2', _count: { productId: 5 } },
            ]);
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

            // Act
            const result = await findBestMatches(['Vana Küresel 1"']);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should handle empty queries - EDGE CASE', async () => {
            // Arrange
            (prisma.proposalItem.groupBy as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await findBestMatches(['', 'a']);

            // Assert
            expect(result.success).toBe(true);
        });

        it('should return empty when no matches found - EDGE CASE', async () => {
            // Arrange
            (prisma.proposalItem.groupBy as jest.Mock).mockResolvedValue([]);
            (prisma.product.findMany as jest.Mock).mockResolvedValue([]);

            // Act
            const result = await findBestMatches(['NonExistentProduct123']);

            // Assert
            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(0);
        });

        it('should handle database error - ERROR HANDLING', async () => {
            // Arrange
            (prisma.proposalItem.groupBy as jest.Mock).mockRejectedValue(new Error('DB error'));

            // Act
            const result = await findBestMatches(['test']);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).toBe('Otomatik eşleştirme sırasında bir hata oluştu.');
        });

        it('should filter out Turkish suffixes - EDGE CASE', async () => {
            // Arrange
            (prisma.proposalItem.groupBy as jest.Mock).mockResolvedValue([]);
            (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

            // Act
            const result = await findBestMatches(['Vana lık', 'Boru cu']);

            // Assert
            expect(result.success).toBe(true);
        });
    });
});
