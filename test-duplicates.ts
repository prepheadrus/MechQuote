
import { findDuplicateProducts } from './src/actions/products.js';
import { logger } from './src/lib/logger';

async function run() {
  const result = await findDuplicateProducts();
  if (result.success) {
    logger.info('Duplicate products found:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    logger.error('Failed to find duplicate products:', result.error);
  }
}

run();
