/**
 * Elasticsearch Client Wrapper
 * 
 * Provides a unified interface for Elasticsearch operations with fallback support.
 * 
 * Architecture:
 * - Single client instance for all indices
 * - Health check for monitoring
 * - Error handling with graceful degradation
 * - Type-safe operations
 */

import { Client } from '@elastic/elasticsearch';
import type { Product } from '@prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const USE_ELASTICSEARCH = process.env.USE_ELASTICSEARCH === 'true';

// ============================================================================
// CLIENT INITIALIZATION
// ============================================================================

let esClient: Client | null = null;

/**
 * Get or create Elasticsearch client instance
 */
function getClient(): Client | null {
  if (!USE_ELASTICSEARCH) {
    console.log('[Elasticsearch] Disabled via USE_ELASTICSEARCH=false');
    return null;
  }

  if (!esClient) {
    try {
      esClient = new Client({
        node: ELASTICSEARCH_URL,
        maxRetries: 3,
        requestTimeout: 30000,
      });
      console.log('[Elasticsearch] Client initialized:', ELASTICSEARCH_URL);
    } catch (error) {
      console.error('[Elasticsearch] Failed to initialize client:', error);
      return null;
    }
  }

  return esClient;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check Elasticsearch cluster health
 */
export async function checkElasticsearchHealth(): Promise<{
  healthy: boolean;
  status?: string;
  error?: string;
}> {
  const client = getClient();
  
  if (!client) {
    return { healthy: false, error: 'Elasticsearch disabled or not initialized' };
  }

  try {
    const health = await client.cluster.health();
    const isHealthy = health.status !== 'red';
    
    console.log('[Elasticsearch] Health check:', {
      status: health.status,
      activeShards: health.active_shards,
      numberOfNodes: health.number_of_nodes,
    });

    return {
      healthy: isHealthy,
      status: health.status,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Health check failed:', error.message);
    return {
      healthy: false,
      error: error.message,
    };
  }
}

// ============================================================================
// INDEX OPERATIONS
// ============================================================================

/**
 * Create index with mapping
 */
export async function createIndex(
  indexName: string,
  mapping: Record<string, any>
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    console.log('[Elasticsearch] Skip createIndex - client not available');
    return false;
  }

  try {
    const exists = await client.indices.exists({ index: indexName });

    if ((exists as any).statusCode === 200) {
      console.log('[Elasticsearch] Index already exists:', indexName);
      return true;
    }

    await client.indices.create({
      index: indexName,
      settings: {
        analysis: {
          analyzer: {
            turkish_analyzer: {
              type: 'custom',
              tokenizer: 'standard',
              filter: [
                'lowercase',
                'turkish_stemmer',
                'asciifolding',
              ],
            },
          },
          filter: {
            turkish_stemmer: {
              type: 'stemmer',
              language: 'turkish',
            },
          },
        },
      },
      mappings: mapping,
    });

    console.log('[Elasticsearch] Index created:', indexName);
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to create index:', error.message);
    return false;
  }
}

/**
 * Delete index
 */
export async function deleteIndex(indexName: string): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    await client.indices.delete({ index: indexName });
    console.log('[Elasticsearch] Index deleted:', indexName);
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete index:', error.message);
    return false;
  }
}

/**
 * Check if index exists
 */
export async function indexExists(indexName: string): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    const exists = await client.indices.exists({ index: indexName });
    return (exists as any).statusCode === 200;
  } catch {
    return false;
  }
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

/**
 * Index a single document
 */
export async function indexDocument(
  indexName: string,
  id: string,
  document: Record<string, any>
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    await client.index({
      index: indexName,
      id,
      document,
    });
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to index document:', error.message);
    return false;
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  indexName: string,
  id: string,
  document: Partial<Record<string, any>>
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    await client.update({
      index: indexName,
      id,
      doc: document,
    });
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to update document:', error.message);
    return false;
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(
  indexName: string,
  id: string
): Promise<boolean> {
  const client = getClient();
  
  if (!client) {
    return false;
  }

  try {
    await client.delete({
      index: indexName,
      id,
    });
    return true;
  } catch (error: any) {
    console.error('[Elasticsearch] Failed to delete document:', error.message);
    return false;
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk index documents
 */
export async function bulkIndexDocuments(
  indexName: string,
  documents: Array<{ id: string; document: Record<string, any> }>
): Promise<{ success: boolean; errors?: any[] }> {
  const client = getClient();
  
  if (!client) {
    return { success: false, errors: ['Client not available'] };
  }

  try {
    const operations: any[] = [];

    for (const doc of documents) {
      operations.push(
        { index: { _index: indexName, _id: doc.id } },
        doc.document
      );
    }

    const result = await client.bulk({ operations });

    if ((result as any).errors) {
      const errors = (result as any).items
        .filter((item: any) => item.index.error)
        .map((item: any) => item.index.error);

      console.error('[Elasticsearch] Bulk index errors:', errors);
      return { success: false, errors };
    }

    console.log('[Elasticsearch] Bulk indexed:', documents.length, 'documents');
    return { success: true };
  } catch (error: any) {
    console.error('[Elasticsearch] Bulk index failed:', error.message);
    return { success: false, errors: [error.message] };
  }
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export interface SearchOptions {
  filters?: Record<string, any>;
  fuzzy?: boolean;
  synonyms?: boolean;
  highlight?: boolean;
  from?: number;
  size?: number;
  sort?: Record<string, any>;
}

/**
 * Search documents with full-text search
 */
export async function searchDocuments(
  indexName: string,
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  const client = getClient();
  
  if (!client) {
    return { success: false, error: 'Client not available' };
  }

  try {
    const {
      filters = {},
      fuzzy = true,
      synonyms = true,
      highlight = true,
      from = 0,
      size = 20,
      sort,
    } = options;

    // Build query
    const must: any[] = [];

    // Multi-match query for full-text search
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['name^3', 'brand^2', 'model^2', 'code^2', 'description', 'category'],
          fuzziness: fuzzy ? 'AUTO' : 0,
          type: 'best_fields',
          operator: 'and',
        },
      });
    }

    // Add filters
    const filter: any[] = [];
    
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        filter.push({
          terms: {
            [key]: value,
          },
        });
      } else {
        filter.push({
          term: {
            [key]: value,
          },
        });
      }
    }

    // Build final query
    const esQuery: any = {
      bool: {},
    };

    if (must.length > 0) {
      esQuery.bool.must = must;
    }

    if (filter.length > 0) {
      esQuery.bool.filter = filter;
    }

    // Execute search
    const result = await client.search({
      index: indexName,
      from,
      size,
      query: esQuery,
      sort,
      highlight: highlight
        ? {
            fields: {
              name: {},
              brand: {},
              model: {},
            },
          }
        : undefined,
    });

    const hits = (result as any).hits?.hits?.map((hit: any) => ({
      id: hit._id,
      ...hit._source,
      score: hit._score,
      highlight: hit.highlight,
    }));

    const total = (result as any).hits?.total?.value || 0;

    return {
      success: true,
      hits,
      total,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Search failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Suggest search terms (autocomplete)
 */
export async function suggestSearchTerms(
  indexName: string,
  query: string,
  field: string = 'name'
): Promise<string[]> {
  const client = getClient();
  
  if (!client) {
    return [];
  }

  try {
    const result = await client.search({
      index: indexName,
      size: 0,
      suggest: {
        [field]: {
          prefix: query,
          completion: {
            field: `${field}.suggest`,
            size: 5,
          },
        },
      },
    });

    const suggestions = (result as any).suggest?.[field]?.[0]?.options?.map(
      (opt: any) => opt.text
    ) || [];

    return suggestions;
  } catch {
    return [];
  }
}

// ============================================================================
// INDEX-SPECIFIC HELPERS
// ============================================================================

/**
 * Product-specific search
 */
export async function searchProducts(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('products', query, {
    ...options,
    size: options.size || 50,
  });
}

/**
 * Customer-specific search
 */
export async function searchCustomers(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('customers', query, {
    ...options,
    size: options.size || 20,
  });
}

/**
 * Proposal-specific search
 */
export async function searchProposals(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('proposals', query, {
    ...options,
    size: options.size || 20,
  });
}

/**
 * Invoice-specific search
 */
export async function searchInvoices(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('invoices', query, {
    ...options,
    size: options.size || 20,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if Elasticsearch is available and healthy
 */
export async function isElasticsearchAvailable(): Promise<boolean> {
  const result = await checkElasticsearchHealth();
  return result.healthy;
}

/**
 * Get client instance (for advanced operations)
 */
export function getClientInstance(): Client | null {
  return getClient();
}

// Export client directly for advanced usage
export const client = getClient();
