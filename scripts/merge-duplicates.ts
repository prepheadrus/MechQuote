
import { findDuplicateProducts, mergeProducts } from '../src/actions/products';
import { logger } from '../src/lib/logger';

async function run() {
  const result = await findDuplicateProducts();
  if (result.success && result.data) {
    for (const group of result.data) {
      if (group.products.length > 1) {
        // Sort by createdAt to find the oldest product
        group.products.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const master = group.products[0];
        const duplicates = group.products.slice(1);
        const duplicateIds = duplicates.map(d => d.id);

        logger.info(`Merging ${duplicateIds.length} duplicates into master product ${master.name} (${master.id})`);

        const mergeResult = await mergeProducts(master.id, duplicateIds);
        if (mergeResult.success) {
          logger.info(`Successfully merged duplicates for ${master.name}`);
        } else {
          logger.error(`Failed to merge duplicates for ${master.name}: ${mergeResult.error}`);
        }
      }
    }
  } else {
    logger.error('Failed to find duplicate products:', result.error);
  }
}

run();
