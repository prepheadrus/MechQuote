/**
 * Unified Search API
 * 
 * Single endpoint for all Elasticsearch searches with fallback to Prisma.
 * 
 * Usage:
 *   POST /api/search
 *   {
 *     "index": "products",
 *     "query": "63mm PPRC boru",
 *     "options": {
 *       "filters": { "category": "Boru" },
 *       "size": 50
 *     }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  searchProductsWithFallback,
  getProductSuggestions,
} from '@/lib/elasticsearch-products';
import {
  searchCustomersWithFallback,
  getCustomerSuggestions,
} from '@/lib/elasticsearch-customers';
import {
  searchProposalsWithFallback,
} from '@/lib/elasticsearch-proposals';
import {
  searchInvoicesWithFallback,
} from '@/lib/elasticsearch-invoices';
import { checkElasticsearchHealth } from '@/lib/elasticsearch';

// ============================================================================
// POST /api/search
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { index, query, options = {} } = body;

    if (!index) {
      return NextResponse.json(
        { error: 'Index is required (products, customers, proposals, invoices)' },
        { status: 400 }
      );
    }

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query string is required' },
        { status: 400 }
      );
    }

    console.log('[Search API] Searching:', { index, query, options });

    let result;

    switch (index) {
      case 'products':
        result = await searchProductsWithFallback(query, options);
        break;
      case 'customers':
        result = await searchCustomersWithFallback(query, options);
        break;
      case 'proposals':
        result = await searchProposalsWithFallback(query, options);
        break;
      case 'invoices':
        result = await searchInvoicesWithFallback(query, options);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown index: ${index}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      index,
      query,
      ...result,
    });
  } catch (error: any) {
    console.error('[Search API] Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET /api/search/health
// ============================================================================

export async function GET() {
  try {
    const health = await checkElasticsearchHealth();

    return NextResponse.json({
      success: health.healthy,
      status: health.status,
      error: health.error,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
