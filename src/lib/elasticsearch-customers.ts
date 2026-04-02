/**
 * Elasticsearch Customers Index
 * 
 * Schema definition and sync operations for customers index.
 */

import { prisma } from './prisma';
import {
  createIndex,
  bulkIndexDocuments,
  indexDocument,
  updateDocument,
  deleteDocument,
  searchCustomers as esSearchCustomers,
  type SearchOptions,
} from './elasticsearch';

// ============================================================================
// INDEX SCHEMA
// ============================================================================

export const CUSTOMERS_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    
    // Company info
    name: {
      type: 'text',
      analyzer: 'turkish_analyzer',
      fields: {
        keyword: { type: 'keyword' },
        suggest: {
          type: 'completion',
          analyzer: 'turkish_analyzer',
        },
      },
    },
    taxId: { type: 'keyword' },
    taxOffice: { type: 'keyword' },
    
    // Contact info
    email: { type: 'keyword' },
    phone: { type: 'keyword' },
    mobile: { type: 'keyword' },
    website: { type: 'keyword' },
    
    // Address
    address: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    city: { type: 'keyword' },
    country: { type: 'keyword' },
    
    // Type
    type: { type: 'keyword' }, // customer, supplier, both
    
    // Status
    status: { type: 'keyword' }, // active, inactive
    
    // Financial
    creditLimit: { type: 'float' },
    currentBalance: { type: 'float' },
    
    // Metadata
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Relations count
    proposalsCount: { type: 'integer' },
    invoicesCount: { type: 'integer' },
    projectsCount: { type: 'integer' },
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

export async function initCustomersIndex(): Promise<boolean> {
  return createIndex('customers', CUSTOMERS_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export function transformCustomerToESDocument(customer: any): Record<string, any> {
  return {
    id: customer.id,
    
    // Company info
    name: customer.name,
    taxId: customer.taxId || '',
    taxOffice: customer.taxOffice || '',
    
    // Contact info
    email: customer.email || '',
    phone: customer.phone || '',
    mobile: customer.mobile || '',
    website: customer.website || '',
    
    // Address
    address: customer.address || '',
    city: customer.city || '',
    country: customer.country || 'Turkey',
    
    // Type
    type: customer.type || 'customer',
    
    // Status
    status: customer.status || 'active',
    
    // Financial
    creditLimit: customer.creditLimit ? parseFloat(customer.creditLimit.toString()) : 0,
    currentBalance: customer.currentBalance ? parseFloat(customer.currentBalance.toString()) : 0,
    
    // Metadata
    createdAt: customer.createdAt ? new Date(customer.createdAt).toISOString() : null,
    updatedAt: customer.updatedAt ? new Date(customer.updatedAt).toISOString() : null,
    
    // Relations count
    proposalsCount: customer._count?.proposals || 0,
    invoicesCount: customer._count?.invoices || 0,
    projectsCount: customer._count?.projects || 0,
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncAllCustomers(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full customers sync...');

    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: {
            proposals: true,
            invoices: true,
            projects: true,
          },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', customers.length, 'customers');

    const documents = customers.map((customer) => ({
      id: customer.id,
      document: transformCustomerToESDocument(customer),
    }));

    const result = await bulkIndexDocuments('customers', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full customers sync completed:', customers.length, 'indexed');
    }

    return {
      success: result.success,
      indexed: customers.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full customers sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

export async function syncCustomer(customerId: string): Promise<boolean> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        _count: {
          select: {
            proposals: true,
            invoices: true,
            projects: true,
          },
        },
      },
    });

    if (!customer) {
      console.log('[Elasticsearch] Customer not found:', customerId);
      return false;
    }

    const document = transformCustomerToESDocument(customer);
    return await indexDocument('customers', customer.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync customer failed:', error.message);
    return false;
  }
}

export async function unsyncCustomer(customerId: string): Promise<boolean> {
  return deleteDocument('customers', customerId);
}

export async function updateCustomerRelations(
  customerId: string,
  counts: { proposals?: number; invoices?: number; projects?: number }
): Promise<boolean> {
  return updateDocument('customers', customerId, counts);
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchCustomers(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return esSearchCustomers(query, options);
}

export async function searchCustomersWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  const esResult = await searchCustomers(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  console.log('[Elasticsearch] Fallback to Prisma for customers:', query);
  
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { taxId: { contains: query } },
        { email: { contains: query } },
      ],
    },
    take: options.size || 20,
    include: {
      _count: {
        select: {
          proposals: true,
          invoices: true,
          projects: true,
        },
      },
    },
  });

  return {
    hits: customers.map((c) => ({
      ...c,
      score: 1.0,
    })),
    total: customers.length,
    source: 'prisma',
  };
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

export async function getCustomerSuggestions(query: string): Promise<string[]> {
  const { getClientInstance } = await import('./elasticsearch');
  const client = getClientInstance();
  
  if (!client) {
    return [];
  }

  try {
    const result = await client.search({
      index: 'customers',
      size: 0,
      suggest: {
        customerSuggestions: {
          prefix: query,
          completion: {
            field: 'name.suggest',
            size: 10,
            skip_duplicates: true,
          },
        },
      },
    });

    return (result as any).suggest?.customerSuggestions?.[0]?.options?.map((opt: any) => opt.text) || [];
  } catch {
    return [];
  }
}
