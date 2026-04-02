/**
 * Auto ML Training API
 * Server-side endpoint for automatic model training
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mlService } from '@/ml/ml-service-client';

const TRAINING_THRESHOLD = 100;
let lastTrainingCount = 0;

/**
 * Extract features from product name
 */
function extractFeatures(name: string) {
  const words = name.split(/[\s\-\+\/]+/).filter(w => w.length > 0);
  const numbers = name.match(/\d+/g)?.map(n => parseInt(n)) || [];
  
  const KNOWN_BRANDS = ['GMV', 'Gree', 'Firat', 'Vesbo', 'Eca', 'Grundfos', 'Wilo', 'Bosch'];
  const brand = KNOWN_BRANDS.find(b => name.toUpperCase().includes(b.toUpperCase())) || null;
  
  return {
    nameLength: name.length,
    wordCount: words.length,
    hasNumbers: numbers.length > 0,
    hasSpecialChars: /[\-\+\/\*]/.test(name),
    brandConfidence: brand ? 1.0 : 0.0,
    hasDimensions: /[xX\*]/.test(name),
    hasSize: /'/.test(name) || /lik/.test(name.toLowerCase()),
    hasPressure: /PN|BAR/i.test(name),
    hasMaterial: /çelik|paslanmaz|plastik|bakır|pvc|pprc/i.test(name),
    hasCode: /[A-Z]{2,}-[A-Z0-9]+/i.test(name),
    numericValues: numbers
  };
}

/**
 * GET /api/ml/auto-train
 * Check and train model automatically
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get('force') === 'true';
    
    // Count total feedback samples
    const totalFeedback = await prisma.feedback.count({
      where: { isDeleted: false,
        type: { in: ['approved', 'corrected'] }
      }
    });

    console.log(`[Auto Train] Total feedback samples: ${totalFeedback}`);

    // Check if we have enough samples
    if (!force && totalFeedback < lastTrainingCount + TRAINING_THRESHOLD) {
      return NextResponse.json({
        trained: false,
        reason: `Need ${TRAINING_THRESHOLD - (totalFeedback - lastTrainingCount)} more samples`,
        current: totalFeedback,
        threshold: TRAINING_THRESHOLD
      });
    }

    console.log(`[Auto Train] Threshold reached! Training with ${totalFeedback} samples...`);

    // Collect training data
    const feedbackData = await prisma.feedback.findMany({
      where: { isDeleted: false,
        type: { in: ['approved', 'corrected'] },
      },
      include: {
        product: { where: { isDeleted: false } },
      },
      take: 1000,
    });

    // Filter out entries without productId
    const validFeedbackData = feedbackData.filter(f => f.productId !== null && f.product !== null);

    if (validFeedbackData.length === 0) {
      return NextResponse.json({
        trained: false,
        reason: 'No training data found'
      });
    }

    // Prepare training data
    const trainingData = validFeedbackData.map(f => ({
      invoiceFeatures: extractFeatures(f.invoiceItemName),
      productFeatures: extractFeatures(f.product?.name || ''),
      label: 1,
      confidence: 1.0
    }));

    // Train model (call Python ML service)
    try {
      const response = await fetch('http://localhost:8001/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingData)
      });

      if (!response.ok) {
        throw new Error(`Python ML service error: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        lastTrainingCount = totalFeedback;
        console.log(`[Auto Train] ✅ Model trained successfully! Accuracy: ${result.accuracy}`);

        return NextResponse.json({
          trained: true,
          reason: `Trained with ${trainingData.length} samples`,
          accuracy: result.accuracy,
          samples: trainingData.length
        });
      } else {
        return NextResponse.json({
          trained: false,
          reason: result.reason || 'Training failed'
        });
      }
    } catch (error) {
      console.error('[Auto Train] Python ML service error:', error);
      return NextResponse.json({
        trained: false,
        reason: error instanceof Error ? error.message : 'Python ML service unavailable'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Auto Train] Error:', error);
    return NextResponse.json({
      trained: false,
      reason: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
