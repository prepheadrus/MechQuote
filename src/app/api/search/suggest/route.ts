/**
 * Search Suggestions API
 * 
 * POST /api/search/suggest
 * 
 * Request:
 * {
 *   "index": "products",
 *   "query": "63mm",
 *   "field": "name"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "index": "products",
 *   "query": "63mm",
 *   "suggestions": ["63mm PPRC Boru", "63mm Vana", ...]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductSuggestions } from '@/lib/elasticsearch-products';
import { getCustomerSuggestions } from '@/lib/elasticsearch-customers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { index, query, field = 'name' } = body;

    if (!index || !query) {
      return NextResponse.json(
        { error: 'Index and query are required' },
        { status: 400 }
      );
    }

    let suggestions: string[] = [];

    switch (index) {
      case 'products':
        suggestions = await getProductSuggestions(query);
        break;
      case 'customers':
        suggestions = await getCustomerSuggestions(query);
        break;
      default:
        suggestions = [];
    }

    return NextResponse.json({
      success: true,
      index,
      query,
      suggestions,
    });
  } catch (error: any) {
    console.error('[Search Suggest API] Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
