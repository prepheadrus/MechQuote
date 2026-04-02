/**
 * Elasticsearch Invoices Index
 * 
 * Schema definition and sync operations for invoices index.
 */

import { prisma } from './prisma';
import {
  createIndex,
  bulkIndexDocuments,
  indexDocument,
  updateDocument,
  deleteDocument,
  searchInvoices as esSearchInvoices,
  type SearchOptions,
} from './elasticsearch';

// ============================================================================
// INDEX SCHEMA
// ============================================================================

export const INVOICES_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    
    // Invoice info
    invoiceNumber: { type: 'keyword' },
    eInvoiceId: { type: 'keyword' },
    
    // Customer
    customerId: { type: 'keyword' },
    customerName: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Type & Status
    type: { type: 'keyword' }, // sales, purchase
    status: { type: 'keyword' }, // draft, sent, paid, overdue, cancelled
    
    // Financial
    subtotal: { type: 'float' },
    discount: { type: 'float' },
    tax: { type: 'float' },
    total: { type: 'float' },
    currency: { type: 'keyword' },
    
    // Dates
    invoiceDate: { type: 'date' },
    dueDate: { type: 'date' },
    paidDate: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Items
    itemsCount: { type: 'integer' },
    
    // Payment info
    paymentMethod: { type: 'keyword' },
    paymentStatus: { type: 'keyword' },
    
    // Notes
    notes: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

export async function initInvoicesIndex(): Promise<boolean> {
  return createIndex('invoices', INVOICES_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export function transformInvoiceToESDocument(invoice: any): Record<string, any> {
  return {
    id: invoice.id,
    
    // Invoice info
    invoiceNumber: invoice.invoiceNumber,
    eInvoiceId: invoice.eInvoiceId || '',
    
    // Customer
    customerId: invoice.customerId,
    customerName: invoice.customer?.name || '',
    
    // Type & Status
    type: invoice.type || 'sales',
    status: invoice.status || 'draft',
    
    // Financial
    subtotal: invoice.subtotal ? parseFloat(invoice.subtotal.toString()) : 0,
    discount: invoice.discount ? parseFloat(invoice.discount.toString()) : 0,
    tax: invoice.tax ? parseFloat(invoice.tax.toString()) : 0,
    total: invoice.total ? parseFloat(invoice.total.toString()) : 0,
    currency: invoice.currency || 'TRY',
    
    // Dates
    invoiceDate: invoice.invoiceDate ? new Date(invoice.invoiceDate).toISOString() : null,
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString() : null,
    paidDate: invoice.paidDate ? new Date(invoice.paidDate).toISOString() : null,
    createdAt: invoice.createdAt ? new Date(invoice.createdAt).toISOString() : null,
    updatedAt: invoice.updatedAt ? new Date(invoice.updatedAt).toISOString() : null,
    
    // Items
    itemsCount: invoice._count?.items || 0,
    
    // Payment info
    paymentMethod: invoice.paymentMethod || '',
    paymentStatus: invoice.paymentStatus || 'pending',
    
    // Notes
    notes: invoice.notes || '',
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncAllInvoices(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full invoices sync...');

    const invoices = await prisma.invoice.findMany({ where: { isDeleted: false },
      include: {
        customer: { where: { isDeleted: false } },
        _count: { where: { isDeleted: false },
          select: { items: { where: { isDeleted: false } } },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', invoices.length, 'invoices');

    const documents = invoices.map((invoice) => ({
      id: invoice.id,
      document: transformInvoiceToESDocument(invoice),
    }));

    const result = await bulkIndexDocuments('invoices', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full invoices sync completed:', invoices.length, 'indexed');
    }

    return {
      success: result.success,
      indexed: invoices.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full invoices sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

export async function syncInvoice(invoiceId: string): Promise<boolean> {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { isDeleted: false,  id: invoiceId },
      include: {
        customer: { where: { isDeleted: false } },
        _count: { where: { isDeleted: false },
          select: { items: { where: { isDeleted: false } } },
        },
      },
    });

    if (!invoice) {
      console.log('[Elasticsearch] Invoice not found:', invoiceId);
      return false;
    }

    const document = transformInvoiceToESDocument(invoice);
    return await indexDocument('invoices', invoice.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync invoice failed:', error.message);
    return false;
  }
}

export async function unsyncInvoice(invoiceId: string): Promise<boolean> {
  return deleteDocument('invoices', invoiceId);
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchInvoices(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return esSearchInvoices(query, options);
}

export async function searchInvoicesWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  const esResult = await searchInvoices(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  console.log('[Elasticsearch] Fallback to Prisma for invoices:', query);

  const invoices = await prisma.invoice.findMany({
    where: { isDeleted: false,
      OR: [
        { invoiceNumber: { contains: query } },
        { customer: { name: { contains: query } } },
        { ettsn: { contains: query } },
      ],
    },
    take: options.size || 20,
    include: {
      customer: { where: { isDeleted: false } },
    },
  });

  return {
    hits: invoices.map((i) => ({
      ...i,
      score: 1.0,
    })),
    total: invoices.length,
    source: 'prisma',
  };
}
