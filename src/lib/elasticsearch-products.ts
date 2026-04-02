/**
 * Elasticsearch Products Index
 * 
 * Schema definition and sync operations for products index.
 * 
 * Features:
 * - Turkish language analyzer
 * - Full-text search on name, brand, model, code
 * - Fuzzy matching for typos
 * - Synonym support
 * - Autocomplete suggestions
 */

import { prisma } from './prisma';
import {
  createIndex,
  bulkIndexDocuments,
  indexDocument,
  updateDocument,
  deleteDocument,
  searchProducts as esSearchProducts,
  type SearchOptions,
} from './elasticsearch';

// ============================================================================
// INDEX SCHEMA
// ============================================================================

export const PRODUCTS_INDEX_MAPPING = {
  properties: {
    // Core fields
    id: { type: 'keyword' },
    name: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
          preserve_separators: true,
          preserve_position_increments: true,
          max_input_length: 50,
        },
      },
    },
    
    // Brand & Model
    brand: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    model: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    
    // Product code
    code: {
      type: 'keyword',
    },
    
    // Pricing
    price: { type: 'float' },
    purchasePrice: { type: 'float' },
    currency: { type: 'keyword' },
    
    // Inventory
    stock: { type: 'integer' },
    unit: { type: 'keyword' },
    
    // Categorization
    category: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    subcategory: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    
    // Supplier info
    supplierId: { type: 'keyword' },
    supplierName: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Description
    description: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Metadata
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Search boosters
    popularity: { type: 'integer' }, // Based on usage count
    matchScore: { type: 'float' }, // Historical match success rate
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

/**
 * Initialize products index
 */
export async function initProductsIndex(): Promise<boolean> {
  return createIndex('products', PRODUCTS_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

/**
 * Transform Prisma product to Elasticsearch document
 */
export function transformProductToESDocument(product: any): Record<string, any> {
  return {
    // Core fields
    id: product.id,
    name: product.name,
    
    // Brand & Model
    brand: product.brand || '',
    model: product.model || '',
    
    // Product code
    code: product.code || '',
    
    // Pricing
    price: product.price ? parseFloat(product.price.toString()) : 0,
    purchasePrice: product.purchasePrice ? parseFloat(product.purchasePrice.toString()) : 0,
    currency: product.currency || 'TRY',
    
    // Inventory
    stock: product.stock || 0,
    unit: product.unit || 'Adet',
    
    // Categorization
    category: product.category || '',
    subcategory: product.subcategory || '',
    
    // Supplier info
    supplierId: product.supplierId || '',
    supplierName: '',
    
    // Description
    description: product.description || '',
    
    // Metadata
    createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : null,
    updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : null,
    
    // Search boosters
    popularity: product._count?.invoiceItems || 0,
    matchScore: 1.0, // Default, updated based on feedback
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

/**
 * Bulk import all products from Prisma to Elasticsearch
 */
export async function syncAllProducts(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full products sync...');

    // Fetch all products with relations
    const products = await prisma.product.findMany({
      include: {
        _count: {
          select: { invoiceItems: true },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', products.length, 'products');

    // Transform to ES documents
    const documents = products.map((product) => ({
      id: product.id,
      document: transformProductToESDocument(product),
    }));

    // Bulk index
    const result = await bulkIndexDocuments('products', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full sync completed:', products.length, 'products indexed');
    }

    return {
      success: result.success,
      indexed: products.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

/**
 * Sync a single product (create/update)
 */
export async function syncProduct(productId: string): Promise<boolean> {
  try {
    // Fetch product with relations
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        _count: {
          select: { invoiceItems: true },
        },
      },
    });

    if (!product) {
      console.log('[Elasticsearch] Product not found:', productId);
      return false;
    }

    // Transform and index
    const document = transformProductToESDocument(product);
    return await indexDocument('products', product.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync product failed:', error.message);
    return false;
  }
}

/**
 * Delete a product from Elasticsearch
 */
export async function unsyncProduct(productId: string): Promise<boolean> {
  return deleteDocument('products', productId);
}

/**
 * Update product popularity (based on usage)
 */
export async function updateProductPopularity(
  productId: string,
  invoiceItemCount: number
): Promise<boolean> {
  return updateDocument('products', productId, {
    popularity: invoiceItemCount,
  });
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Search products with Elasticsearch
 */
export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return esSearchProducts(query, options);
}

/**
 * Search products with fallback to Prisma
 */
export async function searchProductsWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  // Try Elasticsearch first
  const esResult = await searchProducts(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  // Fallback to Prisma
  console.log('[Elasticsearch] Fallback to Prisma for query:', query);
  
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { brand: { contains: query } },
        { model: { contains: query } },
        { code: { contains: query } },
      ],
    },
    take: options.size || 50,
    include: {
      
    },
  });

  return {
    hits: products.map((p) => ({
      ...p,
      score: 1.0,
    })),
    total: products.length,
    source: 'prisma',
  };
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

/**
 * Get product name suggestions (autocomplete)
 */
export async function getProductSuggestions(query: string): Promise<string[]> {
  const client = (await import('./elasticsearch')).getClientInstance();
  
  if (!client) {
    return [];
  }

  try {
    const result = await client.search({
      index: 'products',
      size: 0,
      suggest: {
        productSuggestions: {
          prefix: query,
          completion: {
            field: 'name.suggest',
            size: 10,
            skip_duplicates: true,
          },
        },
      },
    });

    const suggestions =
      (result as any).suggest?.productSuggestions?.[0]?.options?.map(
        (opt: any) => opt.text
      ) || [];

    return suggestions;
  } catch {
    return [];
  }
}
