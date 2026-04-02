/**
 * Ürün Duplicate Analizi
 * Birbirine Benzeyen Ürünleri Tespit Et
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDuplicates() {
  console.log('🔍 Ürün duplicate analizi başlatılıyor...\n');

  const allProducts = await prisma.product.findMany({
    where: { isDeleted: false }
  });

  console.log(`📊 Toplam ${allProducts.length} ürün taranıyor...\n`);

  // 1. Aynı Code'a Sahip Ürünler
  const codeGroups: { [key: string]: any[] } = {};
  allProducts.forEach(p => {
    if (p.code) {
      const key = p.code.toUpperCase().trim();
      if (!codeGroups[key]) codeGroups[key] = [];
      codeGroups[key].push(p);
    }
  });

  const duplicateCodes = Object.entries(codeGroups)
    .filter(([_, products]) => products.length > 1);

  if (duplicateCodes.length > 0) {
    console.log('🔴 AYNI KOD (DUPLICATE):\n');
    duplicateCodes.forEach(([code, products]) => {
      console.log(`Kod: ${code} (${products.length} ürün)`);
      products.forEach(p => {
        console.log(`  - ID: ${p.id}, İsim: ${p.name}, Marka: ${p.brand || 'Belirsiz'}`);
      });
      console.log('');
    });
  }

  // 2. Aynı İsim (Case-Insensitive)
  const nameGroups: { [key: string]: any[] } = {};
  allProducts.forEach(p => {
    const key = p.name.toLowerCase().trim();
    if (!nameGroups[key]) nameGroups[key] = [];
    nameGroups[key].push(p);
  });

  const duplicateNames = Object.entries(nameGroups)
    .filter(([_, products]) => products.length > 1);

  if (duplicateNames.length > 0) {
    console.log('🟠 AYNI İSİM (CASE-INSENSITIVE):\n');
    duplicateNames.forEach(([name, products]) => {
      console.log(`İsim: "${name}" (${products.length} ürün)`);
      products.forEach(p => {
        console.log(`  - ID: ${p.id}, Kod: ${p.code || 'YOK'}, Marka: ${p.brand || 'Belirsiz'}`);
      });
      console.log('');
    });
  }

  // 3. Benzer İsimler (Token-Based)
  console.log('🟡 BENZER İSİMLER (TOKEN-BASED):\n');
  
  const similarGroups: { [key: string]: any[] } = {};
  
  allProducts.forEach((p, idx) => {
    const tokens = p.name.toLowerCase()
      .replace(/["']/g, '')
      .split(/[\s\/\(\)]+/)
      .filter(t => t.length > 2)
      .sort()
      .join('_');
    
    if (!similarGroups[tokens]) similarGroups[tokens] = [];
    similarGroups[tokens].push(p);
  });

  const similarNames = Object.entries(similarGroups)
    .filter(([_, products]) => products.length > 1);

  if (similarNames.length > 0) {
    console.log('⚠️ Potansiyel Duplicates:\n');
    similarNames.forEach(([tokens, products]) => {
      console.log(`Token: ${tokens} (${products.length} ürün)`);
      products.forEach(p => {
        console.log(`  - ID: ${p.id}, İsim: "${p.name}", Kod: ${p.code || 'YOK'}`);
      });
      console.log('');
    });
  }

  // 4. Aynı Marka + Model Kombinasyonu
  const brandModelGroups: { [key: string]: any[] } = {};
  allProducts.forEach(p => {
    if (p.brand && p.model) {
      const key = `${p.brand.toLowerCase()}_${p.model.toLowerCase()}`;
      if (!brandModelGroups[key]) brandModelGroups[key] = [];
      brandModelGroups[key].push(p);
    }
  });

  const duplicateBrandModel = Object.entries(brandModelGroups)
    .filter(([_, products]) => products.length > 1);

  if (duplicateBrandModel.length > 0) {
    console.log('🔵 AYNI MARKA + MODEL:\n');
    duplicateBrandModel.forEach(([key, products]) => {
      const [brand, model] = key.split('_');
      console.log(`Marka: ${brand}, Model: ${model} (${products.length} ürün)`);
      products.forEach(p => {
        console.log(`  - ID: ${p.id}, İsim: "${p.name}", Kod: ${p.code || 'YOK'}`);
      });
      console.log('');
    });
  }

  // 5. Kategori + Birim + Fiyat Kombinasyonu
  console.log('\n🟣 AYNI ÖZELLİKLER (KATEGORİ + BİRİM + FİYAT):\n');
  
  const specGroups: { [key: string]: any[] } = {};
  allProducts.forEach(p => {
    const key = `${(p.category || '').toLowerCase()}_${(p.unit || '').toLowerCase()}_${p.listPrice}`;
    if (!specGroups[key]) specGroups[key] = [];
    specGroups[key].push(p);
  });

  const duplicateSpecs = Object.entries(specGroups)
    .filter(([_, products]) => products.length > 1 && products[0].category);

  if (duplicateSpecs.length > 0) {
    console.log('⚠️ Potansiyiel Duplicates:\n');
    duplicateSpecs.forEach(([key, products]) => {
      const [category, unit, price] = key.split('_');
      console.log(`Kategori: ${category}, Birim: ${unit}, Fiyat: ₺${price} (${products.length} ürün)`);
      products.forEach(p => {
        console.log(`  - ID: ${p.id}, İsim: "${p.name}", Marka: ${p.brand || 'Belirsiz'}`);
      });
      console.log('');
    });
  }

  // Özet
  console.log('\n📊 ÖZET:\n');
  console.log(`Toplam Ürün: ${allProducts.length}`);
  console.log(`Aynı Kod: ${duplicateCodes.length} grup`);
  console.log(`Aynı İsim: ${duplicateNames.length} grup`);
  console.log(`Benzer İsim: ${similarNames.length} grup`);
  console.log(`Aynı Marka+Model: ${duplicateBrandModel.length} grup`);
  console.log(`Aynı Özellik: ${duplicateSpecs.length} grup`);
  
  const totalDuplicates = duplicateCodes.length + duplicateNames.length + similarNames.length + duplicateBrandModel.length + duplicateSpecs.length;
  
  if (totalDuplicates === 0) {
    console.log('\n✅ DUPLICATE TESPİT EDİLMEDİ!');
  } else {
    console.log(`\n⚠️ TOPLAM ${totalDuplicates} POTANSİYEL DUPLICATE TESPİT EDİLDİ!`);
  }

  await prisma.$disconnect();
}

analyzeDuplicates()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  });
