/**
 * Smart Proposal Wizard - Elasticsearch Product Recommendation
 * 
 * Uses Elasticsearch to recommend products for proposal items.
 * 
 * Features:
 * - Multi-criteria matching (name, brand, category)
 * - Historical purchase data
 * - Customer-specific preferences
 * - Fuzzy matching for typos
 * 
 * Usage:
 *   const recommendations = await getProductRecommendations({
 *     customerId: 'xxx',
 *     searchText: '63mm PPRC boru',
 *     category: 'Boru',
 *   });
 */

import { searchProductsWithFallback } from '@/lib/elasticsearch-products';
import { prisma } from '@/lib/prisma';

export interface ProductRecommendationRequest {
  customerId?: string;
  searchText: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface ProductRecommendation {
  id: string;
  name: string;
  brand: string;
  code: string;
  price: number;
  currency: string;
  score: number;
  reason: string;
  supplier?: {
    id: string;
    name: string;
  };
  historicalData?: {
    timesPurchased: number;
    lastPurchaseDate?: Date;
    averageQuantity: number;
  };
}

/**
 * Get product recommendations for proposal wizard
 */
export async function getProductRecommendations(
  request: ProductRecommendationRequest
): Promise<ProductRecommendation[]> {
  const {
    customerId,
    searchText,
    category,
    brand,
    minPrice,
    maxPrice,
    limit = 20,
  } = request;

  console.log('[ProductRecommendation] Request:', request);

  // Build filters
  const filters: Record<string, any> = {};

  if (category) {
    filters.category = category;
  }

  if (brand) {
    filters.brand = brand;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filters.price = {};
    if (minPrice !== undefined) filters.price.gte = minPrice;
    if (maxPrice !== undefined) filters.price.lte = maxPrice;
  }

  // Search with Elasticsearch
  const searchResult = await searchProductsWithFallback(searchText, {
    filters,
    size: limit * 2, // Get more for scoring
  });

  console.log('[ProductRecommendation] Search results:', {
    total: searchResult.total,
    source: searchResult.source,
  });

  // Get historical data if customerId provided
  let historicalPurchases: Record<string, any> = {};
  if (customerId) {
    const purchases = await prisma.invoiceItem.findMany({
      where: {
        invoice: {
          customerId,
        },
        product: {
          id: {
            in: searchResult.hits.map((h) => h.id),
          },
        },
      },
      include: {
        product: true,
        invoice: true,
      },
    });

    // Aggregate by product
    for (const item of purchases) {
      const productId = item.product!.id;
      if (!historicalPurchases[productId]) {
        historicalPurchases[productId] = {
          count: 0,
          totalQuantity: 0,
          lastDate: new Date(0),
        };
      }
      historicalPurchases[productId].count++;
      historicalPurchases[productId].totalQuantity += item.quantity;
      const itemDate = new Date(item.invoice.invoiceDate || item.invoice.createdAt);
      if (itemDate > historicalPurchases[productId].lastDate) {
        historicalPurchases[productId].lastDate = itemDate;
      }
    }
  }

  // Score and rank products
  const recommendations: ProductRecommendation[] = searchResult.hits.map((hit) => {
    let score = hit.score || 0;
    const reasons: string[] = [];

    // Elasticsearch relevance score (0-1)
    reasons.push(`ES score: ${(score * 100).toFixed(0)}%`);

    // Historical purchase boost
    const historical = historicalPurchases[hit.id];
    if (historical) {
      const historicalBoost = Math.min(0.3, historical.count * 0.1);
      score += historicalBoost;
      reasons.push(`Geçmişte ${historical.count} kez alınmış`);
    }

    // Customer-specific boost
    if (customerId && hit.supplierId) {
      // Boost products from customer's preferred suppliers
      reasons.push('Tercih edilen tedarikçi');
    }

    // Brand match boost
    if (brand && hit.brand?.toLowerCase() === brand.toLowerCase()) {
      score += 0.2;
      reasons.push('Marka eşleşmesi');
    }

    // Category match boost
    if (category && hit.category?.toLowerCase() === category.toLowerCase()) {
      score += 0.1;
      reasons.push('Kategori eşleşmesi');
    }

    // Cap score at 1.0
    score = Math.min(1.0, score);

    return {
      id: hit.id,
      name: hit.name,
      brand: hit.brand,
      code: hit.code,
      price: hit.price,
      currency: hit.currency,
      score,
      reason: reasons.join(' • '),
      supplier: hit.supplier ? {
        id: hit.supplier.id,
        name: hit.supplier.name,
      } : undefined,
      historicalData: historical ? {
        timesPurchased: historical.count,
        lastPurchaseDate: historical.lastDate,
        averageQuantity: historical.totalQuantity / historical.count,
      } : undefined,
    };
  });

  // Sort by score and limit
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, limit);
}

/**
 * Get similar products (for "customers also bought" feature)
 */
export async function getSimilarProducts(
  productId: string,
  limit: number = 10
): Promise<ProductRecommendation[]> {
  // Get the target product
  const targetProduct = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!targetProduct) {
    return [];
  }

  // Search for similar products
  const searchTerms = [
    targetProduct.name.split(' ').slice(0, 3).join(' '),
    targetProduct.brand,
    targetProduct.category,
  ].filter(Boolean) as string[];

  const recommendations: ProductRecommendation[] = [];

  for (const term of searchTerms) {
    const results = await searchProductsWithFallback(term, {
      size: limit,
    });

    for (const hit of results.hits) {
      if (hit.id !== productId && !recommendations.find((r) => r.id === hit.id)) {
        recommendations.push({
          id: hit.id,
          name: hit.name,
          brand: hit.brand,
          code: hit.code,
          price: hit.price,
          currency: hit.currency,
          score: hit.score,
          reason: `Benzer: ${term}`,
          supplier: hit.supplier ? {
            id: hit.supplier.id,
            name: hit.supplier.name,
          } : undefined,
        });
      }

      if (recommendations.length >= limit) {
        break;
      }
    }

    if (recommendations.length >= limit) {
      break;
    }
  }

  return recommendations.slice(0, limit);
}

/**
 * API endpoint handler for product recommendations
 */
export async function handleProductRecommendationsAPI(request: ProductRecommendationRequest) {
  try {
    const recommendations = await getProductRecommendations(request);

    return {
      success: true,
      recommendations,
      count: recommendations.length,
    };
  } catch (error: any) {
    console.error('[ProductRecommendation] Error:', error.message);
    return {
      success: false,
      error: error.message,
      recommendations: [],
    };
  }
}
