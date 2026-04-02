import { prisma } from './src/lib/prisma';

async function testSearch() {
  console.log('🔍 Testing search for "kompozit 63"...\n');
  
  // Get all products
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      code: true
    }
  });
  
  console.log(`Total products in DB: ${allProducts.length}\n`);
  
  // Search for "kompozit 63"
  const searchTerm = 'kompozit 63';
  const tokens = searchTerm.toLocaleLowerCase('tr-TR').split(/[\s\-\+\/\*\.]+/).filter(t => t.length > 0);
  
  console.log('Search tokens:', tokens);
  
  const matches = allProducts.filter(p => {
    const productText = `${p.name} ${p.brand} ${p.model || ''} ${p.code || ''}`.toLocaleLowerCase('tr-TR');
    const hasAllTokens = tokens.every(token => productText.includes(token));
    return hasAllTokens;
  });
  
  console.log(`\n✅ Found ${matches.length} matches:\n`);
  matches.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Code: ${p.code || 'N/A'}, Brand: ${p.brand || 'N/A'}`);
  });
  
  await prisma.$disconnect();
}

testSearch().catch(console.error);
