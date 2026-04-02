/**
 * ML Training Stats API
 * Get training data statistics and recent samples
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/ml/training-stats
 * Get training data statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Get all stats
    const totalFeedback = await prisma.feedback.count({ where: { isDeleted: false } });
    const approvedCount = await prisma.feedback.count({
      where: { isDeleted: false,  type: 'approved' },
    });
    const correctedCount = await prisma.feedback.count({
      where: { isDeleted: false,  type: 'corrected' },
    });
    const rejectedCount = await prisma.feedback.count({
      where: { isDeleted: false,  type: 'rejected' },
    });

    // Get recent feedback
    const recentFeedback = await prisma.feedback.findMany({ where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        invoiceItemName: true,
        productName: true,
        type: true,
        confidence: true,
        method: true,
        createdAt: true,
      },
    });

    // Get feedback by method
    const feedbackByMethod = await prisma.feedback.groupBy({
      by: ['method'],
      _count: true,
      orderBy: {
        _count: {
          method: 'desc',
        },
      },
    });

    // Check if ready for training
    const readyForTraining = totalFeedback >= 100;

    return NextResponse.json({
      stats: {
        total: totalFeedback,
        approved: approvedCount,
        corrected: correctedCount,
        rejected: rejectedCount,
        byMethod: feedbackByMethod,
      },
      recent: recentFeedback,
      readyForTraining,
      trainingThreshold: 100,
      progress: Math.min(100, (totalFeedback / 100) * 100),
    });
  } catch (error) {
    console.error('[ML API] Error getting training stats:', error);
    return NextResponse.json(
      { error: 'Failed to get training stats' },
      { status: 500 }
    );
  }
}
