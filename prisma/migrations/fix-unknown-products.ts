/**
 * Fix "Unknown Product" in Feedback table
 * Run this once to fix existing records
 */

import { prisma } from '@/lib/prisma';

async function fixUnknownProducts() {
  console.log('[Migration] Starting to fix Unknown Product...');

  // Find all feedback with "Unknown Product"
  const unknownFeedback = await prisma.feedback.findMany({
    where: {
      productName: {
        equals: 'Unknown Product',
      },
    },
    select: {
      id: true,
      productId: true,
    },
  });

  console.log(`[Migration] Found ${unknownFeedback.length} records to fix`);

  let fixed = 0;
  let failed = 0;

  for (const feedback of unknownFeedback) {
    try {
      // Get product name from database
      const product = await prisma.product.findUnique({
        where: { id: feedback.productId },
        select: { name: true },
      });

      if (product && product.name) {
        // Update feedback with correct product name
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: {
            productName: product.name,
          },
        });
        fixed++;
        console.log(`[Migration] Fixed: ${feedback.id} → ${product.name}`);
      } else {
        failed++;
        console.warn(`[Migration] Product not found: ${feedback.productId}`);
      }
    } catch (error) {
      failed++;
      console.error(`[Migration] Error fixing ${feedback.id}:`, error);
    }
  }

  console.log(`[Migration] Complete! Fixed: ${fixed}, Failed: ${failed}`);
  return { fixed, failed };
}

// Run if executed directly
if (require.main === module) {
  fixUnknownProducts()
    .then(() => {
      console.log('[Migration] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Error:', error);
      process.exit(1);
    });
}

export { fixUnknownProducts };
