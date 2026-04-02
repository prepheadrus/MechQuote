/**
 * Product Recommendations API
 * 
 * POST /api/recommendations/products
 * 
 * Request:
 * {
 *   "customerId": "xxx",
 *   "searchText": "63mm PPRC boru",
 *   "category": "Boru",
 *   "limit": 20
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "recommendations": [...],
 *   "count": 20
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductRecommendations, type ProductRecommendationRequest } from '@/lib/smart-proposal-recommendations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      customerId,
      searchText,
      category,
      brand,
      minPrice,
      maxPrice,
      limit,
    } = body as ProductRecommendationRequest;

    if (!searchText) {
      return NextResponse.json(
        { error: 'searchText is required' },
        { status: 400 }
      );
    }

    const recommendations = await getProductRecommendations({
      customerId,
      searchText,
      category,
      brand,
      minPrice,
      maxPrice,
      limit,
    });

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error: any) {
    console.error('[Recommendations API] Error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
