/**
 * ML Training Data Collection & Feature Engineering
 * 
 * Phase 1 of Machine Learning Model for Product Matching
 * 
 * Goals:
 * 1. Collect historical matching data
 * 2. Extract features from product names
 * 3. Create labeled training dataset
 * 4. Analyze feature importance
 */

import { prisma } from '@/lib/prisma';

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

interface ProductFeatures {
  // Text features
  name: string;
  nameLength: number;
  wordCount: number;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  
  // Brand features
  brand: string | null;
  brandConfidence: number;
  
  // Technical features
  hasDimensions: boolean;
  hasSize: boolean;
  hasPressure: boolean;
  hasMaterial: boolean;
  
  // Code features
  hasCode: boolean;
  codePattern: string | null;
  
  // Category features
  category: string | null;
  
  // Numeric features
  numericValues: number[];
}

interface MatchingPair {
  invoiceItemName: string;
  productName: string;
  productId: string;
  label: number; // 1 = match, 0 = no match
  confidence: number;
  method: string;
  features: {
    invoice: ProductFeatures;
    product: ProductFeatures;
  };
  similarity: {
    token: number;
    weighted: number;
    brand: number;
    combined: number;
  };
}

// ============================================================================
// FEATURE EXTRACTORS
// ============================================================================

const KNOWN_BRANDS = [
  'GMV', 'Gree', 'Midea', 'Daikin', 'Firat', 'Vesbo', 'Pilsa',
  'Demirdöküm', 'Eca', 'Grundfos', 'Wilo', 'Bosch', 'Vaillant'
];

const DIMENSION_PATTERNS = [
  /\d+\s*x\s*\d+/i,      // 60x100
  /\d+'\s*lik/i,         // 28'lik
  /Ø\s*\d+/i,            // Ø125
  /DN\s*\d+/i,           // DN80
];

const PRESSURE_PATTERNS = [
  /PN\s*\d+/i,           // PN16
  /\d+\s*BAR/i,          // 10 BAR
];

const MATERIAL_PATTERNS = [
  /çelik/i, /paslanmaz/i, /plastik/i, /bakır/i, /döküm/i, /pvc/i, /pprc/i,
];

function extractFeatures(name: string): ProductFeatures {
  const words = name.split(/[\s\-\+\/]+/).filter(w => w.length > 0);
  const numbers = name.match(/\d+/g)?.map(n => parseInt(n)) || [];
  
  // Brand detection
  const brand = KNOWN_BRANDS.find(b => 
    name.toUpperCase().includes(b.toUpperCase())
  ) || null;
  
  // Pattern detection
  const hasDimensions = DIMENSION_PATTERNS.some(p => p.test(name));
  const hasPressure = PRESSURE_PATTERNS.some(p => p.test(name));
  const hasMaterial = MATERIAL_PATTERNS.some(p => p.test(name));
  const hasSize = /\d+\s*(mm|cm|m|mt|inch|")/i.test(name);
  
  // Code detection
  const codeMatch = name.match(/[A-Z]{2,}-[A-Z0-9]+/i);
  const hasCode = codeMatch !== null;
  
  return {
    name,
    nameLength: name.length,
    wordCount: words.length,
    hasNumbers: numbers.length > 0,
    hasSpecialChars: /[\-\+\/\*]/.test(name),
    brand,
    brandConfidence: brand ? 1.0 : 0.0,
    hasDimensions,
    hasSize,
    hasPressure,
    hasMaterial,
    hasCode,
    codePattern: codeMatch ? codeMatch[0] : null,
    category: null, // Would need category lookup
    numericValues: numbers,
  };
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

async function collectTrainingData(): Promise<MatchingPair[]> {
  console.log('📊 Collecting training data from database...\n');
  
  const trainingPairs: MatchingPair[] = [];
  
  // 1. Collect positive examples (matched items)
  console.log('✅ Collecting positive examples (matched)...');
  const allFeedback = await prisma.feedback.findMany({
    where: { isDeleted: false,
      type: 'approved',
    },
    include: {
      product: { where: { isDeleted: false } },
    },
    take: 1000,
  });

  const matchedItems = allFeedback.filter(f => f.productId !== null && f.product !== null);
  
  for (const feedback of matchedItems) {
    if (!feedback.product) continue;
    
    const invoiceFeatures = extractFeatures(feedback.invoiceItemName);
    const productFeatures = extractFeatures(feedback.product.name);
    
    // Calculate similarities
    const { getTokenSimilarity, getWeightedSimilarity, getBrandAwareSimilarity, getCombinedSimilarity } = 
      await import('@/lib/matching-engine');
    
    const tokenSim = getTokenSimilarity(feedback.invoiceItemName, feedback.product.name);
    const weightedSim = getWeightedSimilarity(feedback.invoiceItemName, feedback.product.name);
    const brandSim = getBrandAwareSimilarity(feedback.invoiceItemName, feedback.product.name);
    const combinedSim = getCombinedSimilarity(
      feedback.invoiceItemName,
      feedback.product.name,
      invoiceFeatures.codePattern || undefined,
      productFeatures.codePattern || undefined
    );
    
    trainingPairs.push({
      invoiceItemName: feedback.invoiceItemName,
      productName: feedback.product.name,
      productId: feedback.productId,
      label: 1, // Positive example
      confidence: feedback.confidence || 1.0,
      method: feedback.method || 'user-approved',
      features: {
        invoice: invoiceFeatures,
        product: productFeatures,
      },
      similarity: {
        token: tokenSim,
        weighted: weightedSim,
        brand: brandSim,
        combined: combinedSim,
      },
    });
  }
  
  console.log(`   Collected ${matchedItems.length} positive examples\n`);
  
  // 2. Collect negative examples (rejected items)
  console.log('❌ Collecting negative examples (rejected)...');
  const allRejected = await prisma.feedback.findMany({
    where: { isDeleted: false,
      type: 'rejected',
    },
    take: 500,
  });

  // For rejected items, we need to find what they WERE matched to
  const rejectedItems = allRejected.filter(f => f.originalMatchId !== null);

  // Batch fetch products for rejected items
  const rejectedProductIds = [...new Set(rejectedItems.map(f => f.originalMatchId).filter(Boolean) as string[])];
  const rejectedProducts = await prisma.product.findMany({
    where: {
      isDeleted: false,
      id: { in: rejectedProductIds }
    }
  });
  const rejectedProductMap = new Map(rejectedProducts.map(p => [p.id, p]));

  for (const feedback of rejectedItems) {
    if (!feedback.originalMatchId) continue;
    
    const originalProduct = rejectedProductMap.get(feedback.originalMatchId);
    
    if (!originalProduct) continue;
    
    const invoiceFeatures = extractFeatures(feedback.invoiceItemName);
    const productFeatures = extractFeatures(originalProduct.name);
    
    const { getTokenSimilarity, getWeightedSimilarity, getBrandAwareSimilarity, getCombinedSimilarity } = 
      await import('@/lib/matching-engine');
    
    trainingPairs.push({
      invoiceItemName: feedback.invoiceItemName,
      productName: originalProduct.name,
      productId: feedback.originalMatchId,
      label: 0, // Negative example
      confidence: feedback.confidence || 0.0,
      method: feedback.method || 'user-rejected',
      features: {
        invoice: invoiceFeatures,
        product: productFeatures,
      },
      similarity: {
        token: getTokenSimilarity(feedback.invoiceItemName, originalProduct.name),
        weighted: getWeightedSimilarity(feedback.invoiceItemName, originalProduct.name),
        brand: getBrandAwareSimilarity(feedback.invoiceItemName, originalProduct.name),
        combined: getCombinedSimilarity(
          feedback.invoiceItemName,
          originalProduct.name,
          invoiceFeatures.codePattern || undefined,
          productFeatures.codePattern || undefined
        ),
      },
    });
  }
  
  console.log(`   Collected ${rejectedItems.length} negative examples\n`);
  
  // 3. Collect corrected examples (user fixed the match)
  console.log('🔧 Collecting corrected examples...');
  const allCorrected = await prisma.feedback.findMany({
    where: { isDeleted: false,
      type: 'corrected',
    },
    include: {
      product: { where: { isDeleted: false } },
    },
    take: 500,
  });

  const correctedItems = allCorrected.filter(f =>
    f.productId !== null &&
    f.originalMatchId !== null &&
    f.product !== null
  );
  
  // Batch fetch products for corrected items
  const correctedProductIds = [...new Set(correctedItems.map(f => f.originalMatchId).filter(Boolean) as string[])];
  const correctedProducts = await prisma.product.findMany({
    where: {
      isDeleted: false,
      id: { in: correctedProductIds }
    }
  });
  const correctedProductMap = new Map(correctedProducts.map(p => [p.id, p]));

  for (const feedback of correctedItems) {
    if (!feedback.product || !feedback.originalMatchId) continue;
    
    // Get the original (wrong) product
    const originalProduct = correctedProductMap.get(feedback.originalMatchId);
    
    if (!originalProduct) continue;
    
    const invoiceFeatures = extractFeatures(feedback.invoiceItemName);
    const correctProductFeatures = extractFeatures(feedback.product.name);
    const wrongProductFeatures = extractFeatures(originalProduct.name);
    
    const { getTokenSimilarity, getWeightedSimilarity, getBrandAwareSimilarity, getCombinedSimilarity } = 
      await import('@/lib/matching-engine');
    
    // Add correct match as positive example
    trainingPairs.push({
      invoiceItemName: feedback.invoiceItemName,
      productName: feedback.product.name,
      productId: feedback.productId,
      label: 1,
      confidence: 1.0,
      method: 'user-corrected',
      features: {
        invoice: invoiceFeatures,
        product: correctProductFeatures,
      },
      similarity: {
        token: getTokenSimilarity(feedback.invoiceItemName, feedback.product.name),
        weighted: getWeightedSimilarity(feedback.invoiceItemName, feedback.product.name),
        brand: getBrandAwareSimilarity(feedback.invoiceItemName, feedback.product.name),
        combined: getCombinedSimilarity(
          feedback.invoiceItemName,
          feedback.product.name,
          invoiceFeatures.codePattern || undefined,
          correctProductFeatures.codePattern || undefined
        ),
      },
    });
    
    // Add wrong match as negative example
    trainingPairs.push({
      invoiceItemName: feedback.invoiceItemName,
      productName: originalProduct.name,
      productId: feedback.originalMatchId,
      label: 0,
      confidence: 0.0,
      method: 'user-corrected-wrong',
      features: {
        invoice: invoiceFeatures,
        product: wrongProductFeatures,
      },
      similarity: {
        token: getTokenSimilarity(feedback.invoiceItemName, originalProduct.name),
        weighted: getWeightedSimilarity(feedback.invoiceItemName, originalProduct.name),
        brand: getBrandAwareSimilarity(feedback.invoiceItemName, originalProduct.name),
        combined: getCombinedSimilarity(
          feedback.invoiceItemName,
          originalProduct.name,
          invoiceFeatures.codePattern || undefined,
          wrongProductFeatures.codePattern || undefined
        ),
      },
    });
  }
  
  console.log(`   Collected ${correctedItems.length * 2} examples (correct + wrong)\n`);
  
  return trainingPairs;
}

// ============================================================================
// DATASET ANALYSIS
// ============================================================================

function analyzeDataset(pairs: MatchingPair[]) {
  console.log('📊 Dataset Analysis:\n');
  console.log('='.repeat(70));
  
  const total = pairs.length;
  const positive = pairs.filter(p => p.label === 1).length;
  const negative = pairs.filter(p => p.label === 0).length;
  
  console.log(`Total Samples: ${total}`);
  console.log(`Positive (Match): ${positive} (${((positive/total)*100).toFixed(1)}%)`);
  console.log(`Negative (No Match): ${negative} (${((negative/total)*100).toFixed(1)}%)`);
  console.log('');
  
  // Similarity distribution
  const avgTokenSim = pairs.reduce((sum, p) => sum + p.similarity.token, 0) / total;
  const avgWeightedSim = pairs.reduce((sum, p) => sum + p.similarity.weighted, 0) / total;
  const avgBrandSim = pairs.reduce((sum, p) => sum + p.similarity.brand, 0) / total;
  const avgCombinedSim = pairs.reduce((sum, p) => sum + p.similarity.combined, 0) / total;
  
  console.log('Average Similarity Scores:');
  console.log(`  Token: ${avgTokenSim.toFixed(4)}`);
  console.log(`  Weighted: ${avgWeightedSim.toFixed(4)}`);
  console.log(`  Brand: ${avgBrandSim.toFixed(4)}`);
  console.log(`  Combined: ${avgCombinedSim.toFixed(4)}`);
  console.log('');
  
  // Feature importance (simple correlation)
  console.log('Feature Analysis:');
  
  const features = [
    { name: 'Has Brand', count: pairs.filter(p => p.features.invoice.brand || p.features.product.brand).length },
    { name: 'Has Dimensions', count: pairs.filter(p => p.features.invoice.hasDimensions || p.features.product.hasDimensions).length },
    { name: 'Has Code', count: pairs.filter(p => p.features.invoice.hasCode || p.features.product.hasCode).length },
    { name: 'Has Numbers', count: pairs.filter(p => p.features.invoice.hasNumbers || p.features.product.hasNumbers).length },
  ];
  
  features.forEach(f => {
    console.log(`  ${f.name}: ${f.count} (${((f.count/total)*100).toFixed(1)}%)`);
  });
  
  console.log('');
  console.log('='.repeat(70));
}

// ============================================================================
// EXPORT DATASET
// ============================================================================

function exportToCSV(pairs: MatchingPair[], filename: string) {
  const fs = require('fs');
  const path = require('path');
  
  const header = [
    'invoice_item_name',
    'product_name',
    'product_id',
    'label',
    'confidence',
    'method',
    'invoice_name_length',
    'invoice_word_count',
    'invoice_has_brand',
    'invoice_has_dimensions',
    'invoice_has_code',
    'product_name_length',
    'product_word_count',
    'product_has_brand',
    'product_has_dimensions',
    'product_has_code',
    'token_similarity',
    'weighted_similarity',
    'brand_similarity',
    'combined_similarity'
  ];
  
  const rows = pairs.map(p => [
    p.invoiceItemName.replace(/,/g, ';'),
    p.productName.replace(/,/g, ';'),
    p.productId,
    p.label,
    p.confidence.toFixed(4),
    p.method,
    p.features.invoice.nameLength,
    p.features.invoice.wordCount,
    p.features.invoice.brand ? 1 : 0,
    p.features.invoice.hasDimensions ? 1 : 0,
    p.features.invoice.hasCode ? 1 : 0,
    p.features.product.nameLength,
    p.features.product.wordCount,
    p.features.product.brand ? 1 : 0,
    p.features.product.hasDimensions ? 1 : 0,
    p.features.product.hasCode ? 1 : 0,
    p.similarity.token.toFixed(4),
    p.similarity.weighted.toFixed(4),
    p.similarity.brand.toFixed(4),
    p.similarity.combined.toFixed(4)
  ]);
  
  const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  const outputPath = path.join(__dirname, '..', '..', '..', 'ml-data', filename);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csv);
  
  console.log(`\n💾 Dataset exported to: ${outputPath}`);
  console.log(`   Size: ${(csv.length / 1024).toFixed(2)} KB`);
  console.log(`   Samples: ${pairs.length}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🤖 ML Training Data Collection\n');
  console.log('='.repeat(70));
  
  try {
    // Collect data
    const pairs = await collectTrainingData();
    
    if (pairs.length === 0) {
      console.log('❌ No training data found. Please add some feedback data first.');
      return;
    }
    
    // Analyze dataset
    analyzeDataset(pairs);
    
    // Export to CSV
    exportToCSV(pairs, 'training_dataset.csv');
    
    // Export positive and negative separately
    const positive = pairs.filter(p => p.label === 1);
    const negative = pairs.filter(p => p.label === 0);
    
    exportToCSV(positive, 'training_positive.csv');
    exportToCSV(negative, 'training_negative.csv');
    
    console.log('\n✅ Data collection complete!');
    console.log('\n📊 Next Steps:');
    console.log('   1. Review ml-data/training_dataset.csv');
    console.log('   2. Analyze feature importance');
    console.log('   3. Train ML model (TensorFlow.js or Python)');
    console.log('   4. Evaluate model performance');
    console.log('   5. Deploy to production');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { collectTrainingData, extractFeatures, analyzeDataset };
