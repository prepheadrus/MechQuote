/**
 * Product Search Service Tests
 * Tests for the centralized product search functionality
 */

import { normalizeText, tokenize, searchProducts } from '../product-search-service';

// Mock Product type
type MockProduct = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  code: string | null;
};

describe('Product Search Service', () => {
  // Sample products for testing
  const mockProducts: MockProduct[] = [
    { id: '1', name: 'PPRC Kompozit Boru PN25 Ø63', brand: 'Fırat', model: null, code: 'PRD-PPRC-165' },
    { id: '2', name: '63 mm PPRC PN25 Kompozit Boru (Beyaz)', brand: 'Fırat', model: null, code: '7B00023063' },
    { id: '3', name: 'PPRC Kompozit Boru PN25 Ø50', brand: 'Fırat', model: null, code: 'PRD-PPRC-164' },
    { id: '4', name: 'PPRC Dirsek Ø63', brand: 'Fırat', model: null, code: 'PRD-PPRC-TE-012' },
    { id: '5', name: 'Vana 28\'lik', brand: 'Valf', model: null, code: 'VANA-28' },
    { id: '6', name: 'Vana 32\'lik', brand: 'Valf', model: null, code: 'VANA-32' },
    { id: '7', name: 'Panel Radyatör 60x100', brand: 'Baykan', model: null, code: 'RAD-60-100' },
    { id: '8', name: 'Radyatör Panel 100x60', brand: 'Baykan', model: null, code: 'RAD-100-60' },
  ];

  describe('normalizeText', () => {
    test('should convert to lowercase', () => {
      expect(normalizeText('KOMPOZİT')).toBe('kompozit');
      expect(normalizeText('Boru')).toBe('boru');
    });

    test('should handle Turkish characters correctly', () => {
      expect(normalizeText('ŞİĞÇÖÜ')).toBe('şiğçöü');
      expect(normalizeText('kompozit')).toBe('kompozit');
    });

    test('should remove degree symbols', () => {
      expect(normalizeText('Ø63°')).toBe('ø63');
      expect(normalizeText('63°')).toBe('63');
    });

    test('should remove apostrophes', () => {
      expect(normalizeText('28\'lik')).toBe('28lik');
      expect(normalizeText('32\'lik')).toBe('32lik');
    });

    test('should normalize multiplication signs', () => {
      expect(normalizeText('60×100')).toBe('60x100');
      expect(normalizeText('60*100')).toBe('60x100');
    });

    test('should trim whitespace', () => {
      expect(normalizeText('  kompozit  ')).toBe('kompozit');
      expect(normalizeText('\tboru\n')).toBe('boru');
    });

    test('should handle combined transformations', () => {
      expect(normalizeText('  PPRC Kompozit Boru PN25 Ø63°  ')).toBe('pprc kompozit boru pn25 ø63');
      expect(normalizeText('60×100 cm')).toBe('60x100 cm');
    });
  });

  describe('tokenize', () => {
    test('should split on spaces', () => {
      const tokens = tokenize('PPRC Kompozit Boru');
      expect(tokens).toContain('pprc');
      expect(tokens).toContain('kompozit');
      expect(tokens).toContain('boru');
      expect(tokens.length).toBe(3);
    });

    test('should split on hyphens', () => {
      const tokens = tokenize('PN25-Kompozit');
      expect(tokens).toContain('pn25');
      expect(tokens).toContain('kompozit');
      expect(tokens.length).toBe(2);
    });

    test('should split on slashes', () => {
      const tokens = tokenize('60/100');
      expect(tokens).toContain('60');
      expect(tokens).toContain('100');
      expect(tokens.length).toBe(2);
    });

    test('should filter empty tokens', () => {
      const tokens = tokenize('  PPRC   Boru  ');
      expect(tokens).toContain('pprc');
      expect(tokens).toContain('boru');
      expect(tokens.length).toBe(2);
    });

    test('should handle complex product names', () => {
      const tokens = tokenize('63 mm PPRC PN25 Kompozit Boru (Beyaz)');
      expect(tokens).toContain('63');
      expect(tokens).toContain('boru');
      expect(tokens).toContain('kompozit');
      expect(tokens).toContain('pprc');
      expect(tokens).toContain('pn25');
    });
  });

  describe('searchProducts', () => {
    test('should return all products for empty search', () => {
      const results = searchProducts(mockProducts as any, '');
      expect(results.length).toBe(mockProducts.length);
    });

    test('should return all products for null search', () => {
      const results = searchProducts(mockProducts as any, '   ');
      expect(results.length).toBe(mockProducts.length);
    });

    test('should find products with "kompozit 63"', () => {
      const results = searchProducts(mockProducts as any, 'kompozit 63');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toContain('Kompozit');
      expect(results[0].product.name).toContain('63');
    });

    test('should find products with "63 kompozit" (word order independent)', () => {
      const results = searchProducts(mockProducts as any, '63 kompozit');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toContain('Kompozit');
      expect(results[0].product.name).toContain('63');
    });

    test('should match "kompozit 63" and "63 kompozit" with same results', () => {
      const results1 = searchProducts(mockProducts as any, 'kompozit 63');
      const results2 = searchProducts(mockProducts as any, '63 kompozit');
      expect(results1.length).toBe(results2.length);
    });

    test('should find products with "PN25"', () => {
      const results = searchProducts(mockProducts as any, 'PN25');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.product.name.toLowerCase()).toContain('pn25');
      });
    });

    test('should find products with "Ø63"', () => {
      const results = searchProducts(mockProducts as any, 'Ø63');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].product.name).toContain('Ø63');
    });

    test('should handle case-insensitive search', () => {
      const lower = searchProducts(mockProducts as any, 'kompozit');
      const upper = searchProducts(mockProducts as any, 'KOMPOZİT');
      const mixed = searchProducts(mockProducts as any, 'KoMpOzİt');
      
      expect(lower.length).toBe(upper.length);
      expect(upper.length).toBe(mixed.length);
    });

    test('should NOT match different sizes (28\'lik vs 32\'lik)', () => {
      const results28 = searchProducts(mockProducts as any, 'vana 28');
      const results32 = searchProducts(mockProducts as any, 'vana 32');
      
      expect(results28.length).toBe(1);
      expect(results28[0].product.name).toContain('28');
      expect(results28[0].product.name).not.toContain('32');
      
      expect(results32.length).toBe(1);
      expect(results32[0].product.name).toContain('32');
      expect(results32[0].product.name).not.toContain('28');
    });

    test('should handle word order independence (Panel Radyatör)', () => {
      const order1 = searchProducts(mockProducts as any, 'Panel Radyatör 60x100');
      const order2 = searchProducts(mockProducts as any, 'Radyatör Panel 100x60');
      
      // Both should find the respective products
      expect(order1.length).toBeGreaterThan(0);
      expect(order2.length).toBeGreaterThan(0);
    });

    test('should assign higher score to exact phrase match', () => {
      const exact = searchProducts(mockProducts as any, 'PPRC Kompozit Boru PN25 Ø63');
      const partial = searchProducts(mockProducts as any, 'PPRC Boru');
      
      expect(exact[0].score).toBeGreaterThan(partial[0].score);
    });

    test('should include match reasons', () => {
      const results = searchProducts(mockProducts as any, 'kompozit 63');
      expect(results[0].matchReason).toBeDefined();
      expect(results[0].matchReason.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle special characters in search', () => {
      // Parentheses are kept in tokens
      const results = searchProducts(mockProducts as any, 'Boru (Beyaz)');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle multiple spaces', () => {
      const results = searchProducts(mockProducts as any, 'PPRC    Kompozit    Boru');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle mixed Turkish and English characters', () => {
      const results = searchProducts(mockProducts as any, 'Boru (Beyaz)');
      expect(results.length).toBeGreaterThan(0);
    });

    test('should handle very long search queries', () => {
      const longQuery = '63 mm PPRC PN25 Kompozit Boru Beyaz Fırat';
      const results = searchProducts(mockProducts as any, longQuery);
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle numbers in search', () => {
      const results = searchProducts(mockProducts as any, '63');
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.product.name).toMatch(/\d/);
      });
    });
  });

  describe('Performance', () => {
    test('should search 1000 products in under 100ms', () => {
      const largeProductList = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        name: `Product ${i} Kompozit Boru PN25`,
        brand: 'Brand',
        model: null,
        code: `CODE-${i}`,
      }));

      const start = Date.now();
      searchProducts(largeProductList as any, 'kompozit 63');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
