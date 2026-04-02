
import { findDuplicateProducts, getProductList } from '../src/actions/products';
import { logger } from '../src/lib/logger';

async function run() {
  const allProductsResult = await getProductList();
  if (allProductsResult.success && allProductsResult.data) {
    logger.info('All product names:');
    allProductsResult.data.forEach(p => console.log(p.name));
  }


  const result = await findDuplicateProducts();
  if (result.success) {
    logger.info('Duplicate products found:');
    console.log(JSON.stringify(result.data, null, 2));
  } else {
    logger.error('Failed to find duplicate products:', result.error);
  }
}

run();
