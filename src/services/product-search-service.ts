/**
 * Centralized Product Search Service
 * Used across the entire application for consistent search behavior
 */

import { Product } from '@prisma/client';
import { logger } from '@/lib/logger';

/**
 * Normalize text for search
 * Handles Turkish characters and special symbols
 */
export function normalizeText(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into searchable words
 */
export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[\s\-\+\/\*\.]+/)
    .filter(t => t.length > 0);
}

/**
 * Search products with flexible matching
 * Returns scored and sorted results
 */
export function searchProducts(
  products: Product[],
  searchTerm: string
): { product: Product; score: number; matchReason: string }[] {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return products.map(p => ({ product: p, score: 0, matchReason: 'all' }));
  }

  const normalizedSearch = normalizeText(searchTerm);
  const searchTokens = tokenize(searchTerm);

  logger.debug('[searchProducts] Searching for:', searchTerm);
  logger.debug('[searchProducts] Normalized:', normalizedSearch);
  logger.debug('[searchProducts] Tokens:', searchTokens);

  // SIMPLE FILTER: Product must contain ALL tokens
  const filtered = products
    .filter(product => {
      const productText = normalizeText(
        `${product.name} ${product.brand} ${product.model || ''} ${product.code || ''}`
      );

      // ALL tokens must be found in product text
      const hasAllTokens = searchTokens.every(token =>
        productText.includes(token)
      );

      return hasAllTokens;
    })
    .map(product => {
      const productText = normalizeText(
        `${product.name} ${product.brand} ${product.model || ''} ${product.code || ''}`
      );

      // Simple score: more matches = higher score
      let score = searchTokens.length * 10;
      const reasons = [`tokens:${searchTokens.length}`];

      // Bonus for exact phrase match
      if (productText.includes(normalizedSearch)) {
        score += 50;
        reasons.push('exact-phrase');
      }

      return {
        product,
        score,
        matchReason: reasons.join(', ')
      };
    })
    .sort((a, b) => {
      // Sort by score (descending)
      if (b.score !== a.score) return b.score - a.score;

      // If same score, prefer shorter names (more relevant)
      return a.product.name.length - b.product.name.length;
    });

  logger.debug(`[searchProducts] Filtered ${filtered.length} products from ${products.length}`);
  if (filtered.length > 0) {
    logger.debug(`[searchProducts] Top ${Math.min(5, filtered.length)} matches:`);
    filtered.slice(0, 5).forEach(r => {
      logger.debug(`  ✅ ${r.product.name} - Score: ${r.score}`);
    });
  }

  return filtered;
}

/**
 * Find best match for a single product name
 * Used for AI matching and invoice parsing
 */
export function findBestProductMatch(
  targetName: string,
  products: Product[],
  threshold: number = 10
): { product: Product; score: number; confidence: 'high' | 'medium' | 'low' } | null {
  const results = searchProducts(products, targetName);

  if (results.length === 0 || results[0].score < threshold) {
    return null;
  }

  const topResult = results[0];
  const confidence: 'high' | 'medium' | 'low' =
    topResult.score >= 100 ? 'high' :
    topResult.score >= 50 ? 'medium' : 'low';

  return {
    product: topResult.product,
    score: topResult.score,
    confidence
  };
}

/**
 * Bulk match multiple product names
 * Used for invoice item matching
 */
export function bulkMatchProducts(
  names: string[],
  products: Product[],
  threshold: number = 10
): Array<{
  originalName: string;
  matchedProduct: Product | null;
  score: number;
  confidence: 'high' | 'medium' | 'low' | 'none'
}> {
  return names.map(name => {
    const result = findBestProductMatch(name, products, threshold);
    return {
      originalName: name,
      matchedProduct: result?.product || null,
      score: result?.score || 0,
      confidence: result?.confidence || 'none'
    };
  });
}
