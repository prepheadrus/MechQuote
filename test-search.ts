import { prisma } from './src/lib/prisma';

async function testSearch() {
  console.log('🔍 Searching for products with "Kompozit"...');
  
  const products = await prisma.product.findMany({
    where: {
      name: { contains: 'Kompozit' }
    },
    select: {
      id: true,
      name: true,
      code: true,
      brand: true,
      model: true
    },
    take: 20
  });
  
  console.log(`\n✅ Found ${products.length} products:\n`);
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Code: ${p.code || 'N/A'}, Brand: ${p.brand || 'N/A'}, Model: ${p.model || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

testSearch().catch(console.error);
