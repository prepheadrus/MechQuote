/**
 * Elasticsearch Personnel Index
 * 
 * Schema definition and sync operations for personnel index.
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

export const PERSONNEL_INDEX_MAPPING = {
  properties: {
    id: { type: 'keyword' },
    
    // Personal info
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
    email: { type: 'keyword' },
    phone: { type: 'keyword' },
    mobile: { type: 'keyword' },
    
    // Job info
    position: {
      type: 'text',
      analyzer: 'turkish_analyzer',
    },
    department: { type: 'keyword' },
    employeeId: { type: 'keyword' },
    
    // Status
    status: { type: 'keyword' }, // active, inactive, on_leave
    
    // Financial
    salary: { type: 'float' },
    currency: { type: 'keyword' },
    
    // Dates
    hireDate: { type: 'date' },
    birthDate: { type: 'date' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' },
    
    // Skills
    skills: { type: 'keyword' },
    certifications: { type: 'keyword' },
    
    // Relations count
    assignmentsCount: { type: 'integer' },
  },
};

// ============================================================================
// INDEX INITIALIZATION
// ============================================================================

export async function initPersonnelIndex(): Promise<boolean> {
  return createIndex('personnel', PERSONNEL_INDEX_MAPPING);
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

export function transformPersonnelToESDocument(personnel: any): Record<string, any> {
  return {
    id: personnel.id,
    
    // Personal info
    name: personnel.name,
    email: personnel.email || '',
    phone: personnel.phone || '',
    mobile: personnel.mobile || '',
    
    // Job info
    position: personnel.position || '',
    department: personnel.department || '',
    employeeId: personnel.employeeId || '',
    
    // Status
    status: personnel.status || 'active',
    
    // Financial
    salary: personnel.salary ? parseFloat(personnel.salary.toString()) : 0,
    currency: personnel.currency || 'TRY',
    
    // Dates
    hireDate: personnel.hireDate ? new Date(personnel.hireDate).toISOString() : null,
    birthDate: personnel.birthDate ? new Date(personnel.birthDate).toISOString() : null,
    createdAt: personnel.createdAt ? new Date(personnel.createdAt).toISOString() : null,
    updatedAt: personnel.updatedAt ? new Date(personnel.updatedAt).toISOString() : null,
    
    // Skills
    skills: personnel.skills || [],
    certifications: personnel.certifications || [],
    
    // Relations count
    assignmentsCount: personnel._count?.assignments || 0,
  };
}

// ============================================================================
// SYNC OPERATIONS
// ============================================================================

export async function syncAllPersonnel(): Promise<{
  success: boolean;
  indexed?: number;
  errors?: any[];
}> {
  try {
    console.log('[Elasticsearch] Starting full personnel sync...');

    const personnel = await prisma.personnel.findMany({ where: { isDeleted: false },
      include: {
        _count: {
          select: {
            assignments: { where: { isDeleted: false } },
            
          },
        },
      },
    });

    console.log('[Elasticsearch] Fetched', personnel.length, 'personnel');

    const documents = personnel.map((item) => ({
      id: item.id,
      document: transformPersonnelToESDocument(item),
    }));

    const result = await bulkIndexDocuments('personnel', documents);

    if (result.success) {
      console.log('[Elasticsearch] Full personnel sync completed:', personnel.length, 'indexed');
    }

    return {
      success: result.success,
      indexed: personnel.length,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Elasticsearch] Full personnel sync failed:', error.message);
    return {
      success: false,
      errors: [error.message],
    };
  }
}

export async function syncPersonnel(personnelId: string): Promise<boolean> {
  try {
    const personnel = await prisma.personnel.findFirst({
      where: { isDeleted: false,  id: personnelId },
      include: {
        _count: {
          select: {
            assignments: { where: { isDeleted: false } },
            
          },
        },
      },
    });

    if (!personnel) {
      console.log('[Elasticsearch] Personnel not found:', personnelId);
      return false;
    }

    const document = transformPersonnelToESDocument(personnel);
    return await indexDocument('personnel', personnel.id, document);
  } catch (error: any) {
    console.error('[Elasticsearch] Sync personnel failed:', error.message);
    return false;
  }
}

export async function unsyncPersonnel(personnelId: string): Promise<boolean> {
  return deleteDocument('personnel', personnelId);
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

export async function searchPersonnel(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; hits?: any[]; total?: number; error?: string }> {
  return searchDocuments('personnel', query, options);
}

export async function searchPersonnelWithFallback(
  query: string,
  options: SearchOptions = {}
): Promise<{ hits: any[]; total: number; source: 'elasticsearch' | 'prisma' }> {
  const esResult = await searchPersonnel(query, options);

  if (esResult.success && esResult.hits && esResult.hits.length > 0) {
    return {
      hits: esResult.hits,
      total: esResult.total || 0,
      source: 'elasticsearch',
    };
  }

  console.log('[Elasticsearch] Fallback to Prisma for personnel:', query);
  
  const personnel = await prisma.personnel.findMany({
    where: { isDeleted: false,
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
        { role: { contains: query } },
      ],
    },
    take: options.size || 20,
  });

  return {
    hits: personnel.map((p) => ({
      ...p,
      score: 1.0,
    })),
    total: personnel.length,
    source: 'prisma',
  };
}
