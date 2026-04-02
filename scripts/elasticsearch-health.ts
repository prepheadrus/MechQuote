/**
 * Elasticsearch Health Check Script
 * 
 * Quick script to check Elasticsearch cluster health.
 * 
 * Usage:
 *   npx tsx scripts/elasticsearch-health.ts
 */

import { checkElasticsearchHealth, isElasticsearchAvailable } from '../src/lib/elasticsearch';

async function main() {
  console.log('========================================');
  console.log('🏥 Elasticsearch Health Check');
  console.log('========================================\n');

  const health = await checkElasticsearchHealth();

  if (health.healthy) {
    console.log('✅ Status:', health.status?.toUpperCase());
    console.log('✅ Elasticsearch is healthy!\n');
    
    const available = await isElasticsearchAvailable();
    if (available) {
      console.log('✅ Ready for operations\n');
    } else {
      console.log('⚠️  Available check failed\n');
    }
  } else {
    console.log('❌ Status: UNHEALTHY');
    console.log('❌ Error:', health.error);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if Docker is running');
    console.log('   2. Run: docker-compose up -d');
    console.log('   3. Wait 30 seconds and try again');
    console.log('   4. Check logs: docker-compose logs elasticsearch\n');
  }

  console.log('========================================');
}

main().catch((error) => {
  console.error('💥 Health check failed:');
  console.error(error);
  process.exit(1);
});
