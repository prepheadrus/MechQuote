/**
 * Elasticsearch Proposals Index
 * 
 * Schema definition and sync operations for proposals index.
 */

import { prisma } from './prisma';
import {
  createIndex,
  bulkIndexDocuments,
  indexDocument,
  updateDocument,
  deleteDocument,
  searchProposals as esSearchProposals,
  type SearchOptions,
} from './elasticsearch';

// ============================================================================
// INDEX SCHEMA
// ============================================================================

export const PROPOSALS_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    
    // Proposal info
    proposalNumber: { type: 'keyword' },
    title: {
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
    description: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Customer
    customerId: { type: 'keyword' },
    customerName: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Status & Priority
    status: { type: 'keyword' }, // draft, sent, accepted, rejected
    priority: { type: 'keyword' }, // low, medium, high, urgent
    
    // Financial
    totalAmount: { type: 'float' },
    totalCost: { type: 'float' },
    margin: { type: 'float' },
    currency: { type: 'keyword' },
    
    // Dates
    proposalDate: { type: 'date' },
    expiryDate: { type: 'date' },
    acceptedDate: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Items count
    itemsCount: { type: 'integer' },

    // Tags
    tags: { type: 'keyword' },
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

export async function initProposalsIndex(): Promise<boolean> {
  return createIndex('proposals', PROPOSALS_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export function transformProposalToESDocument(proposal: any): Record<string, any> {
  return {
    id: proposal.id,
    
    // Proposal info
    proposalNumber: proposal.proposalNumber,
    title: proposal.title || '',
    description: proposal.description || '',
    
    // Customer
    customerId: proposal.customerId,
    customerName: proposal.customer?.name || '',
    
    // Status & Priority
    status: proposal.status || 'draft',
    priority: proposal.priority || 'medium',
    
    // Financial
    totalAmount: proposal.totalAmount ? parseFloat(proposal.totalAmount.toString()) : 0,
    totalCost: proposal.totalCost ? parseFloat(proposal.totalCost.toString()) : 0,
    margin: proposal.margin ? parseFloat(proposal.margin.toString()) : 0,
    currency: proposal.currency || 'TRY',
    
    // Dates
    proposalDate: proposal.proposalDate ? new Date(proposal.proposalDate).toISOString() : null,
    expiryDate: proposal.expiryDate ? new Date(proposal.expiryDate).toISOString() : null,
    acceptedDate: proposal.acceptedDate ? new Date(proposal.acceptedDate).toISOString() : null,
    createdAt: proposal.createdAt ? new Date(proposal.createdAt).toISOString() : null,
    updatedAt: proposal.updatedAt ? new Date(proposal.updatedAt).toISOString() : null,
    
    // Items count
    itemsCount: proposal._count?.items || 0,

    // Tags
    tags: proposal.tags || [],
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncAllProposals(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full proposals sync...');

    const proposals = await prisma.proposal.findMany({
      include: {
        customer: true,
        
        _count: {
          select: { items: true },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', proposals.length, 'proposals');

    const documents = proposals.map((proposal) => ({
      id: proposal.id,
      document: transformProposalToESDocument(proposal),
    }));

    const result = await bulkIndexDocuments('proposals', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full proposals sync completed:', proposals.length, 'indexed');
    }

    return {
      success: result.success,
      indexed: proposals.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full proposals sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

export async function syncProposal(proposalId: string): Promise<boolean> {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        customer: true,
        
        _count: {
          select: { items: true },
        },
      },
    });

    if (!proposal) {
      console.log('[Elasticsearch] Proposal not found:', proposalId);
      return false;
    }

    const document = transformProposalToESDocument(proposal);
    return await indexDocument('proposals', proposal.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync proposal failed:', error.message);
    return false;
  }
}

export async function unsyncProposal(proposalId: string): Promise<boolean> {
  return deleteDocument('proposals', proposalId);
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchProposals(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return esSearchProposals(query, options);
}

export async function searchProposalsWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  const esResult = await searchProposals(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  console.log('[Elasticsearch] Fallback to Prisma for proposals:', query);
  
  const proposals = await prisma.proposal.findMany({
    where: {
      OR: [
        { quoteNumber: { contains: query } },
        { customer: { name: { contains: query } } },
      ],
    },
    take: options.size || 20,
    include: {
      customer: true,
    },
  });

  return {
    hits: proposals.map((p) => ({
      ...p,
      score: 1.0,
    })),
    total: proposals.length,
    source: 'prisma',
  };
}
