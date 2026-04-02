/**
 * Elasticsearch Integration Test Script
 *
 * Tests all Elasticsearch functionality with fallback verification.
 *
 * Usage:
 *   npx tsx src/scripts/test-elasticsearch.ts
 */

import { logger } from '@/lib/logger';
import { prisma } from '../lib/prisma';
import {
  checkElasticsearchHealth,
  isElasticsearchAvailable,
  searchDocuments,
} from '../lib/elasticsearch';
import {
  searchProductsWithFallback,
  syncAllProducts,
  initProductsIndex,
} from '../lib/elasticsearch-products';
import {
  searchCustomersWithFallback,
} from '../lib/elasticsearch-customers';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_QUERIES = {
  products: [
    'boru',
    '63mm',
    'PPRC',
    'vana',
    'GMV',
  ],
  customers: [
    'tesisat',
    'mühendislik',
    'inşaat',
  ],
};

// ============================================================================
// TEST HELPERS
// ============================================================================

function printHeader(text: string) {
  logger.info('\n' + '='.repeat(60));
  logger.info(`  ${text}`);
  logger.info('='.repeat(60) + '\n');
}

function printSubHeader(text: string) {
  logger.info(`\n📋 ${text}\n`);
}

function printSuccess(text: string) {
  logger.info(`✅ ${text}`);
}

function printError(text: string) {
  logger.error(`❌ ${text}`);
}

function printInfo(text: string) {
  logger.info(`ℹ️  ${text}`);
}

// ============================================================================
// TESTS
// ============================================================================

async function testHealthCheck() {
  printSubHeader('Test 1: Elasticsearch Health Check');

  const health = await checkElasticsearchHealth();
  
  if (health.healthy) {
    printSuccess(`Elasticsearch is healthy: ${health.status}`);
    return true;
  } else {
    printError(`Elasticsearch is unhealthy: ${health.error}`);
    return false;
  }
}

async function testAvailability() {
  printSubHeader('Test 2: Elasticsearch Availability');

  const available = await isElasticsearchAvailable();
  
  if (available) {
    printSuccess('Elasticsearch is available');
    return true;
  } else {
    printError('Elasticsearch is not available');
    printInfo('Will use Prisma fallback for all searches');
    return false;
  }
}

async function testIndexInitialization() {
  printSubHeader('Test 3: Index Initialization');

  const initialized = await initProductsIndex();
  
  if (initialized) {
    printSuccess('Products index initialized');
    return true;
  } else {
    printError('Products index initialization failed or already exists');
    return false;
  }
}

async function testProductSearch() {
  printSubHeader('Test 4: Product Search with Fallback');

  let successCount = 0;

  for (const query of TEST_QUERIES.products) {
    logger.info(`\n  Searching for: "${query}"`);

    const result = await searchProductsWithFallback(query, { size: 5 });

    if (result.hits.length > 0) {
      printSuccess(`Found ${result.hits.length} results from ${result.source}`);
      logger.info(`     Top result: ${result.hits[0].name}`);
      successCount++;
    } else {
      printInfo(`No results for "${query}"`);
    }
  }

  printInfo(`Product search success rate: ${successCount}/${TEST_QUERIES.products.length}`);
  return successCount > 0;
}

async function testCustomerSearch() {
  printSubHeader('Test 5: Customer Search with Fallback');

  let successCount = 0;

  for (const query of TEST_QUERIES.customers) {
    logger.info(`\n  Searching for: "${query}"`);

    const result = await searchCustomersWithFallback(query, { size: 5 });

    if (result.hits.length > 0) {
      printSuccess(`Found ${result.hits.length} results from ${result.source}`);
      logger.info(`     Top result: ${result.hits[0].companyName}`);
      successCount++;
    } else {
      printInfo(`No results for "${query}"`);
    }
  }

  printInfo(`Customer search success rate: ${successCount}/${TEST_QUERIES.customers.length}`);
  return successCount > 0;
}

async function testFallbackMechanism() {
  printSubHeader('Test 6: Fallback Mechanism Verification');

  // Temporarily disable Elasticsearch
  const originalEnv = process.env.USE_ELASTICSEARCH;
  process.env.USE_ELASTICSEARCH = 'false';

  try {
    logger.info('\n  Testing with Elasticsearch disabled...');

    const result = await searchProductsWithFallback('boru', { size: 5 });

    if (result.source === 'prisma' && result.hits.length >= 0) {
      printSuccess('Fallback to Prisma works correctly');
      logger.info(`     Source: ${result.source}`);
      logger.info(`     Results: ${result.hits.length}`);
      return true;
    } else {
      printError('Fallback mechanism failed');
      return false;
    }
  } catch (error: any) {
    printError(`Fallback test error: ${error.message}`);
    return false;
  } finally {
    process.env.USE_ELASTICSEARCH = originalEnv;
  }
}

async function testBulkSync() {
  printSubHeader('Test 7: Bulk Sync Performance');

  logger.info('\n  Syncing all products to Elasticsearch...');

  const startTime = Date.now();
  const result = await syncAllProducts();
  const duration = Date.now() - startTime;

  if (result.success) {
    printSuccess(`Bulk sync completed in ${duration}ms`);
    logger.info(`     Indexed: ${result.indexed} products`);
    return true;
  } else {
    printError(`Bulk sync failed: ${result.errors?.join(', ')}`);
    return false;
  }
}

async function testDirectSearch() {
  printSubHeader('Test 8: Direct Elasticsearch Search');

  if (!await isElasticsearchAvailable()) {
    printInfo('Skipping - Elasticsearch not available');
    return true;
  }

  try {
    const result = await searchDocuments('products', 'boru', { size: 5 });

    if (result.success) {
      printSuccess(`Direct search works`);
      logger.info(`     Results: ${result.hits?.length || 0}`);
      logger.info(`     Total: ${result.total || 0}`);
      return true;
    } else {
      printError(`Direct search failed: ${result.error}`);
      return false;
    }
  } catch (error: any) {
    printError(`Direct search error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  printHeader('🧪 Elasticsearch Integration Tests');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests
  results.push({ name: 'Health Check', passed: await testHealthCheck() });
  results.push({ name: 'Availability', passed: await testAvailability() });
  results.push({ name: 'Index Init', passed: await testIndexInitialization() });
  results.push({ name: 'Product Search', passed: await testProductSearch() });
  results.push({ name: 'Customer Search', passed: await testCustomerSearch() });
  results.push({ name: 'Fallback Mechanism', passed: await testFallbackMechanism() });
  results.push({ name: 'Bulk Sync', passed: await testBulkSync() });
  results.push({ name: 'Direct Search', passed: await testDirectSearch() });

  // Summary
  printHeader('📊 Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  logger.info('\n');
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    logger.info(`${icon} ${result.name}`);
  }

  logger.info('\n' + '-'.repeat(60));
  logger.info(`Total: ${passed}/${total} tests passed (${percentage}%)`);
  logger.info('-'.repeat(60) + '\n');

  if (passed === total) {
    printSuccess('All tests passed! 🎉');
  } else {
    printError('Some tests failed. Check the logs above.');
  }

  return passed === total;
}

// ============================================================================
// RUN
// ============================================================================

runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    logger.error('💥 Test runner failed:');
    logger.error(error);
    process.exit(1);
  });
