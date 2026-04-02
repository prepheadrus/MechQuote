/**
 * Elasticsearch Projects Index
 * 
 * Schema definition and sync operations for projects index.
 */

import { prisma } from './prisma';
import {
  createIndex,
  bulkIndexDocuments,
  indexDocument,
  updateDocument,
  deleteDocument,
  searchDocuments,
  type SearchOptions,
} from './elasticsearch';

// ============================================================================
// INDEX SCHEMA
// ============================================================================

export const PROJECTS_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    
    // Project info
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
    description: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    projectNumber: { type: 'keyword' },
    
    // Customer
    customerId: { type: 'keyword' },
    customerName: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    
    // Status & Priority
    status: { type: 'keyword' }, // planning, in_progress, on_hold, completed, cancelled
    priority: { type: 'keyword' }, // low, medium, high, urgent
    
    // Financial
    budget: { type: 'float' },
    actualCost: { type: 'float' },
    currency: { type: 'keyword' },
    
    // Dates
    startDate: { type: 'date' },
    endDate: { type: 'date' },
    deadline: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Location
    location: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    city: { type: 'keyword' },
    address: { type: 'text' },
    
    // Team
    managerId: { type: 'keyword' },
    managerName: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    teamSize: { type: 'integer' },
    
    // Progress
    progress: { type: 'float' }, // 0-100 percentage

    // Relations count
    proposalsCount: { type: 'integer' },
    invoicesCount: { type: 'integer' },
    jobAssignmentsCount: { type: 'integer' },
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

export async function initProjectsIndex(): Promise<boolean> {
  return createIndex('projects', PROJECTS_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export function transformProjectToESDocument(project: any): Record<string, any> {
  return {
    id: project.id,
    
    // Project info
    name: project.name,
    description: project.description || '',
    projectNumber: project.projectNumber || '',
    
    // Customer
    customerId: project.customerId,
    customerName: project.customer?.name || '',
    
    // Status & Priority
    status: project.status || 'planning',
    priority: project.priority || 'medium',
    
    // Financial
    budget: project.budget ? parseFloat(project.budget.toString()) : 0,
    actualCost: project.actualCost ? parseFloat(project.actualCost.toString()) : 0,
    currency: project.currency || 'TRY',
    
    // Dates
    startDate: project.startDate ? new Date(project.startDate).toISOString() : null,
    endDate: project.endDate ? new Date(project.endDate).toISOString() : null,
    deadline: project.deadline ? new Date(project.deadline).toISOString() : null,
    createdAt: project.createdAt ? new Date(project.createdAt).toISOString() : null,
    updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,
    
    // Location
    location: project.location || '',
    city: project.city || '',
    address: project.address || '',
    
    // Team
    managerId: project.managerId || '',
    managerName: '',
    teamSize: project._count?.jobAssignments || 0,

    // Progress
    progress: project.progress || 0,

    // Relations count
    proposalsCount: project._count?.proposals || 0,
    invoicesCount: project._count?.invoices || 0,
    jobAssignmentsCount: project._count?.jobAssignments || 0,
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncAllProjects(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full projects sync...');

    const projects = await prisma.project.findMany({ where: { isDeleted: false },
      include: {
        customer: true,
        
        _count: {
          select: {
            proposals: { where: { isDeleted: false } },
            invoices: { where: { isDeleted: false } },
            jobAssignments: { where: { isDeleted: false } },
          },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', projects.length, 'projects');

    const documents = projects.map((project) => ({
      id: project.id,
      document: transformProjectToESDocument(project),
    }));

    const result = await bulkIndexDocuments('projects', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full projects sync completed:', projects.length, 'indexed');
    }

    return {
      success: result.success,
      indexed: projects.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full projects sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

export async function syncProject(projectId: string): Promise<boolean> {
  try {
    const project = await prisma.project.findFirst({
      where: { isDeleted: false,  id: projectId },
      include: {
        customer: true,
        
        _count: {
          select: {
            proposals: { where: { isDeleted: false } },
            invoices: { where: { isDeleted: false } },
            jobAssignments: { where: { isDeleted: false } },
          },
        },
      },
    });

    if (!project) {
      console.log('[Elasticsearch] Project not found:', projectId);
      return false;
    }

    const document = transformProjectToESDocument(project);
    return await indexDocument('projects', project.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync project failed:', error.message);
    return false;
  }
}

export async function unsyncProject(projectId: string): Promise<boolean> {
  return deleteDocument('projects', projectId);
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchProjects(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('projects', query, options);
}

export async function searchProjectsWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  const esResult = await searchProjects(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  console.log('[Elasticsearch] Fallback to Prisma for projects:', query);
  
  const projects = await prisma.project.findMany({
    where: { isDeleted: false,
      OR: [
        { name: { contains: query } },
        { customer: { name: { contains: query } } },
      ],
    },
    take: options.size || 20,
    include: {
      customer: true,
    },
  });

  return {
    hits: projects.map((p) => ({
      ...p,
      score: 1.0,
    })),
    total: projects.length,
    source: 'prisma',
  };
}
