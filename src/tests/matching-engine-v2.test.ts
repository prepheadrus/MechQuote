/**
 * Matching Engine Test Suite
 * 
 * Ürün eşleştirme algoritması testleri
 */

import { normalizeText, tokenize, searchProducts } from '@/services/product-search-service';
import { Product } from '@prisma/client';

describe('Matching Engine', () => {
    // Mock product data
    const mockProducts: Product[] = [
        {
            id: '1',
            name: 'Vana Küresel 1" Tam Geçişli',
            brand: 'Kelebek',
            model: 'KG-100',
            code: 'KN-001',
            category: 'Vanalar',
            unitPrice: 150.00,
            basePrice: 100.00,
            unit: 'ADET',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 50,
            minStock: 10,
            createdAt: new Date(),
            updatedAt: new Date(),
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
            unitPrice: 250.00,
            basePrice: 180.00,
            unit: 'ADET',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 30,
            minStock: 5,
            createdAt: new Date(),
            updatedAt: new Date(),
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
            unitPrice: 80.00,
            basePrice: 60.00,
            unit: 'METRE',
            taxRate: 20,
            priceIncludesVat: false,
            stock: 500,
            minStock: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
            isDeleted: false,
            deletedAt: null,
        },
    ];

    describe('normalizeText', () => {
        it('should convert to lowercase', () => {
            expect(normalizeText('VANA')).toBe('vana');
        });

        it('should remove degree symbols', () => {
            expect(normalizeText('Ø63°')).toBe('ø63');
        });

        it('should normalize multiplication signs', () => {
            expect(normalizeText('10×20')).toBe('10x20');
            expect(normalizeText('10*20')).toBe('10x20');
        });

        it('should trim whitespace', () => {
            expect(normalizeText('  test  ')).toBe('test');
        });
    });

    describe('tokenize', () => {
        it('should split by spaces', () => {
            expect(tokenize('Vana Küresel 1"')).toEqual(['vana', 'küresel', '1"']);
        });

        it('should split by special characters', () => {
            expect(tokenize('Vana-1"/2')).toEqual(['vana', '1"', '2']);
        });

        it('should filter empty tokens', () => {
            expect(tokenize('  ')).toEqual([]);
        });
    });

    describe('searchProducts', () => {
        it('should find products by name', () => {
            const results = searchProducts(mockProducts, 'vana küresel');
            
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].product.name).toContain('Vana Küresel');
        });

        it('should find products by brand', () => {
            const results = searchProducts(mockProducts, 'kelebek');
            
            expect(results.length).toBe(2);
            expect(results.every(r => r.product.brand === 'Kelebek')).toBe(true);
        });

        it('should find products by code', () => {
            const results = searchProducts(mockProducts, 'KN-001');
            
            expect(results.length).toBe(1);
            expect(results[0].product.code).toBe('KN-001');
        });

        it('should handle partial matches', () => {
            const results = searchProducts(mockProducts, 'boru');
            
            expect(results.length).toBe(1);
            expect(results[0].product.name).toContain('Boru');
        });

        it('should return empty for no matches', () => {
            const results = searchProducts(mockProducts, 'xyz-nonexistent');
            
            expect(results.length).toBe(0);
        });

        it('should return all products for empty search', () => {
            const results = searchProducts(mockProducts, '');
            
            expect(results.length).toBe(mockProducts.length);
        });

        it('should sort by score', () => {
            const results = searchProducts(mockProducts, 'vana küresel kelebek');
            
            // Results should be sorted by score (descending)
            for (let i = 1; i < results.length; i++) {
                expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
        });
    });
});
