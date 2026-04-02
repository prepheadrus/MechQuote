import { searchProducts } from './src/services/product-search-service';

// Mock products from database
const mockProducts = [
  { id: 'PRD-PPRC-165', name: 'PPRC Kompozit Boru PN25 Ø63', code: 'PRD-PPRC-165', brand: '-', model: null },
  { id: '7B00023063', name: '63 mm PPRC PN25 Kompozit Boru (Beyaz)', code: '7B00023063', brand: 'Fırat', model: null },
  { id: 'PRD-PPRC-164', name: 'PPRC Kompozit Boru PN25 Ø50', code: 'PRD-PPRC-164', brand: '-', model: null },
];

console.log('🔍 Testing search for "63 kompozit boru"\n');

const results = searchProducts(mockProducts as any, '63 kompozit boru');

console.log(`\n✅ Found ${results.length} matches:\n`);
results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.product.name}`);
  console.log(`   Score: ${r.score}, Reason: ${r.matchReason}`);
});
