/**
 * ML Training Data Collector
 * Otomatik olarak eşleşmeleri training data'ya dönüştürür
 * 
 * KULLANIM:
 * - Kullanıcı fatura eşleştirmesi yaptığında otomatik çalışır
 * - Her eşleşme database'e kaydedilir
 * - 100+ eşleşme olduğunda otomatik retraining tetiklenir
 */

import { prisma } from '@/lib/prisma';

interface TrainingSample {
  invoiceItemName: string;
  productId: string;
  productName: string;
  confidence: number;
  method: string;
}

/**
 * Kaydedilen her eşleşmeyi training data olarak işaretle
 */
export async function collectTrainingData(
  invoiceItemId: string,
  productId: string,
  invoiceItemName: string,
  productName: string,
  confidence: number,
  method: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Eğer productName "Unknown Product" ise, database'den çek
    let finalProductName = productName;
    if (productName === 'Unknown Product' || !productName) {
      const product = await prisma.product.findFirst({
        where: { isDeleted: false,  id: productId },
        select: { name: true }
      });
      if (product) {
        finalProductName = product.name;
      }
    }

    // Eşleşmeyi Feedback tablosuna kaydet
    const feedback = await prisma.feedback.create({
      data: {
        invoiceItemId,
        invoiceItemName,
        productId,
        productName: finalProductName,
        type: 'approved', // Kullanıcı onayladı
        confidence,
        method,
      },
    });

    console.log(`[ML Training] Training data collected: ${invoiceItemName} → ${finalProductName}`);

    // 100+ eşleşme var mı kontrol et
    const totalFeedback = await prisma.feedback.count({
      where: { isDeleted: false,
        type: { in: ['approved', 'corrected'] },
      },
    });

    if (totalFeedback >= 100) {
      console.log(`[ML Training] Threshold reached! ${totalFeedback} samples collected.`);
      // Otomatik retraining için endpoint'i çağır
      triggerAutoTraining();
    }

    return {
      success: true,
      message: `Training data collected. Total samples: ${totalFeedback}`,
    };
  } catch (error) {
    console.error('[ML Training] Error collecting training data:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Otomatik retraining'i tetikle
 */
async function triggerAutoTraining() {
  try {
    // Node.js internal API'yi çağır
    const response = await fetch('http://localhost:9002/api/ml/auto-train', {
      method: 'GET',
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[ML Training] Auto-training triggered:', result);
    } else {
      console.warn('[ML Training] Auto-training endpoint returned:', response.status);
    }
  } catch (error) {
    console.error('[ML Training] Failed to trigger auto-training:', error);
  }
}

/**
 * Mevcut eşleşmeleri training data'ya dönüştür (backfill)
 */
export async function backfillTrainingData(): Promise<{ success: boolean; count: number }> {
  try {
    // Tüm onaylanmış eşleşmeleri bul
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { isDeleted: false,
        linkedProductId: {
          not: null,
        },
      },
      include: {
        invoice: true,
        product: { where: { isDeleted: false } },
      },
      take: 1000,
    });

    let count = 0;

    for (const item of invoiceItems) {
      if (!item.linkedProductId || !item.product) continue;

      // Zaten feedback var mı kontrol et
      const existingFeedback = await prisma.feedback.findFirst({
        where: { isDeleted: false,
          invoiceItemId: item.id,
        },
      });

      if (existingFeedback) continue; // Zaten var

      // Feedback oluştur
      await prisma.feedback.create({
        data: {
          invoiceItemId: item.id,
          invoiceItemName: item.name,
          productId: item.linkedProductId,
          productName: item.product.name,
          type: 'approved',
          confidence: 1.0,
          method: 'backfill',
        },
      });

      count++;
    }

    console.log(`[ML Training] Backfilled ${count} training samples`);

    return {
      success: true,
      count,
    };
  } catch (error) {
    console.error('[ML Training] Error backfilling training data:', error);
    return {
      success: false,
      count: 0,
    };
  }
}

/**
 * Training istatistiklerini al
 */
export async function getTrainingStats() {
  try {
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

    const recentFeedback = await prisma.feedback.findMany({ where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      total: totalFeedback,
      approved: approvedCount,
      corrected: correctedCount,
      rejected: rejectedCount,
      recent: recentFeedback,
      readyForTraining: totalFeedback >= 100,
    };
  } catch (error) {
    console.error('[ML Training] Error getting stats:', error);
    return null;
  }
}
