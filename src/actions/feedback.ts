'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export type FeedbackType = 'approved' | 'rejected' | 'corrected';

interface SaveFeedbackInput {
  invoiceItemId: string;
  invoiceItemName: string;
  productId: string;
  productName: string;
  type: FeedbackType;
  originalMatchId?: string;
  originalMatchName?: string;
  confidence?: number;
  method?: string;
}

/**
 * Save user feedback for a matching result
 */
export async function saveFeedback(data: SaveFeedbackInput) {
  try {
    const feedback = await prisma.feedback.create({
      data: {
        invoiceItemId: data.invoiceItemId,
        invoiceItemName: data.invoiceItemName,
        productId: data.productId,
        productName: data.productName,
        type: data.type,
        originalMatchId: data.originalMatchId,
        originalMatchName: data.originalMatchName,
        confidence: data.confidence,
        method: data.method,
      },
    });

    revalidatePath('/invoices');
    revalidatePath('/products');

    return { success: true, data: feedback };
  } catch (error: any) {
    logger.error('[Feedback] Error saving feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save bulk feedback (multiple items at once)
 */
export async function saveBulkFeedback(items: SaveFeedbackInput[]) {
  try {
    const feedbacks = await prisma.$transaction(
      items.map((data) =>
        prisma.feedback.create({
          data: {
            invoiceItemId: data.invoiceItemId,
            invoiceItemName: data.invoiceItemName,
            productId: data.productId,
            productName: data.productName,
            type: data.type,
            originalMatchId: data.originalMatchId,
            originalMatchName: data.originalMatchName,
            confidence: data.confidence,
            method: data.method,
          },
        })
      )
    );

    revalidatePath('/invoices');
    revalidatePath('/products');

    return { success: true, data: feedbacks, count: feedbacks.length };
  } catch (error: any) {
    logger.error('[Feedback] Error saving bulk feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get feedback statistics for an invoice item name
 */
export async function getFeedbackStats(invoiceItemName: string) {
  try {
    const [approved, rejected, corrected] = await Promise.all([
      prisma.feedback.count({
        where: {
          isDeleted: false,
          invoiceItemName,
          type: 'approved',
        },
      }),
      prisma.feedback.count({
        where: {
          isDeleted: false,
          invoiceItemName,
          type: 'rejected',
        },
      }),
      prisma.feedback.count({
        where: {
          isDeleted: false,
          invoiceItemName,
          type: 'corrected',
        },
      }),
    ]);

    // Get most approved product for this item name
    const topMatches = await prisma.feedback.groupBy({
      by: ['productId', 'productName'],
      where: {
        isDeleted: false,
        invoiceItemName,
        type: 'approved',
      },
      _count: true,
      orderBy: {
        _count: {
          productId: 'desc',
        },
      },
      take: 5,
    });

    return {
      success: true,
      data: {
        approved,
        rejected,
        corrected,
        total: approved + rejected + corrected,
        topMatches,
      },
    };
  } catch (error: any) {
    logger.error('[Feedback] Error getting stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get suggested product based on feedback history
 * Returns the most approved product for this item name
 */
export async function getSuggestedProductByFeedback(invoiceItemName: string) {
  try {
    const topMatch = await prisma.feedback.findFirst({
      where: {
        isDeleted: false,
        invoiceItemName,
        type: 'approved',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        productId: { where: { isDeleted: false } },
        productName: { where: { isDeleted: false } },
        confidence: { where: { isDeleted: false } },
      },
    });

    if (topMatch) {
      return {
        success: true,
        data: {
          productId: topMatch.productId,
          productName: topMatch.productName,
          confidence: topMatch.confidence || 0,
          feedbackCount: 1, // Will be enhanced with count query
        },
      };
    }

    return { success: true, data: null };
  } catch (error: any) {
    logger.error('[Feedback] Error getting suggestion:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get feedback history for a specific product
 */
export async function getProductFeedbackHistory(productId: string, limit: number = 50) {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        isDeleted: false,
        productId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      select: {
        id: { where: { isDeleted: false } },
        invoiceItemName: { where: { isDeleted: false } },
        type: { where: { isDeleted: false } },
        confidence: { where: { isDeleted: false } },
        method: { where: { isDeleted: false } },
        createdAt: { where: { isDeleted: false } },
      },
    });

    return { success: true, data: feedbacks };
  } catch (error: any) {
    logger.error('[Feedback] Error getting product feedback:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear old feedback (older than 90 days)
 * Use this for maintenance
 */
export async function cleanupOldFeedback(days: number = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const deleted = await prisma.feedback.updateMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });

    return { success: true, data: { deleted: deleted.count } };
  } catch (error: any) {
    logger.error('[Feedback] Error cleaning up old feedback:', error);
    return { success: false, error: error.message };
  }
}
