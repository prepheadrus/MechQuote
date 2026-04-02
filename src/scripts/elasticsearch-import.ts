/**
 * Elasticsearch Bulk Import Script
 * 
 * Run this script to import all existing data from Prisma to Elasticsearch.
 * 
 * Usage:
 *   npx tsx src/scripts/elasticsearch-import.ts
 * 
 * Or with npm script:
 *   npm run es-import
 */

import { prisma } from '../lib/prisma';
import {
  checkElasticsearchHealth,
  isElasticsearchAvailable,
} from '../lib/elasticsearch';
import {
  initProductsIndex,
  syncAllProducts,
} from '../lib/elasticsearch-products';
import {
  initCustomersIndex,
  syncAllCustomers,
} from '../lib/elasticsearch-customers';
import {
  initProposalsIndex,
  syncAllProposals,
} from '../lib/elasticsearch-proposals';
import {
  initInvoicesIndex,
  syncAllInvoices,
} from '../lib/elasticsearch-invoices';
import {
  initPersonnelIndex,
  syncAllPersonnel,
} from '../lib/elasticsearch-personnel';
import {
  initProjectsIndex,
  syncAllProjects,
} from '../lib/elasticsearch-projects';

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('🚀 Elasticsearch Bulk Import');
  console.log('========================================\n');

  // Step 1: Check Elasticsearch health
  console.log('📊 Step 1: Checking Elasticsearch health...');
  const health = await checkElasticsearchHealth();

  if (!health.healthy) {
    console.error('❌ Elasticsearch is not healthy!');
    console.error('   Status:', health.status);
    console.error('   Error:', health.error);
    console.error('\n💡 Make sure Docker is running and Elasticsearch is started:');
    console.error('   docker-compose up -d\n');
    process.exit(1);
  }

  console.log('✅ Elasticsearch is healthy:', health.status);
  console.log('');

  // Step 2: Check availability
  console.log('📊 Step 2: Checking availability...');
  const available = await isElasticsearchAvailable();
  
  if (!available) {
    console.error('❌ Elasticsearch is not available');
    process.exit(1);
  }
  
  console.log('✅ Elasticsearch is available\n');

  // Step 3: Initialize indices
  console.log('📊 Step 3: Initializing indices...');
  
  const indices = [
    { name: 'products', init: initProductsIndex },
    { name: 'customers', init: initCustomersIndex },
    { name: 'proposals', init: initProposalsIndex },
    { name: 'invoices', init: initInvoicesIndex },
    { name: 'personnel', init: initPersonnelIndex },
    { name: 'projects', init: initProjectsIndex },
  ];

  for (const { name, init } of indices) {
    console.log(`  Creating ${name} index...`);
    const success = await init();
    if (success) {
      console.log(`  ✅ ${name} index ready`);
    } else {
      console.log(`  ⚠️  ${name} index creation skipped (already exists?)`);
    }
  }
  
  console.log('');

  // Step 4: Bulk import data
  console.log('📊 Step 4: Bulk importing data...\n');

  // Products
  console.log('📦 Importing products...');
  const productsResult = await syncAllProducts();
  if (productsResult.success) {
    console.log(`  ✅ ${productsResult.indexed} products indexed\n`);
  } else {
    console.log(`  ❌ Products import failed:`, productsResult.errors);
  }

  // Customers
  console.log('👥 Importing customers...');
  const customersResult = await syncAllCustomers();
  if (customersResult.success) {
    console.log(`  ✅ ${customersResult.indexed} customers indexed\n`);
  } else {
    console.log(`  ❌ Customers import failed:`, customersResult.errors);
  }

  // Proposals
  console.log('📝 Importing proposals...');
  const proposalsResult = await syncAllProposals();
  if (proposalsResult.success) {
    console.log(`  ✅ ${proposalsResult.indexed} proposals indexed\n`);
  } else {
    console.log(`  ❌ Proposals import failed:`, proposalsResult.errors);
  }

  // Invoices
  console.log('🧾 Importing invoices...');
  const invoicesResult = await syncAllInvoices();
  if (invoicesResult.success) {
    console.log(`  ✅ ${invoicesResult.indexed} invoices indexed\n`);
  } else {
    console.log(`  ❌ Invoices import failed:`, invoicesResult.errors);
  }

  // Personnel
  console.log('👥 Importing personnel...');
  const personnelResult = await syncAllPersonnel();
  if (personnelResult.success) {
    console.log(`  ✅ ${personnelResult.indexed} personnel indexed\n`);
  } else {
    console.log(`  ❌ Personnel import failed:`, personnelResult.errors);
  }

  // Projects
  console.log('📁 Importing projects...');
  const projectsResult = await syncAllProjects();
  if (projectsResult.success) {
    console.log(`  ✅ ${projectsResult.indexed} projects indexed\n`);
  } else {
    console.log(`  ❌ Projects import failed:`, projectsResult.errors);
  }

  // Summary
  console.log('========================================');
  console.log('✅ Import Complete!');
  console.log('========================================');
  console.log('');
  console.log('📊 Summary:');
  console.log(`  Products:  ${productsResult.success ? '✅' : '❌'} ${productsResult.indexed || 0}`);
  console.log(`  Customers: ${customersResult.success ? '✅' : '❌'} ${customersResult.indexed || 0}`);
  console.log(`  Proposals: ${proposalsResult.success ? '✅' : '❌'} ${proposalsResult.indexed || 0}`);
  console.log(`  Invoices:  ${invoicesResult.success ? '✅' : '❌'} ${invoicesResult.indexed || 0}`);
  console.log(`  Personnel: ${personnelResult.success ? '✅' : '❌'} ${personnelResult.indexed || 0}`);
  console.log(`  Projects:  ${projectsResult.success ? '✅' : '❌'} ${projectsResult.indexed || 0}`);
  console.log('');
  console.log('🔍 Test search:');
  console.log('  curl http://localhost:9200/products/_search?q=boru');
  console.log('');
  console.log('📊 Kibana Dashboard:');
  console.log('  http://localhost:5601');
  console.log('');
}

// Run the script
main().catch((error) => {
  console.error('💥 Import script failed:');
  console.error(error);
  process.exit(1);
});
