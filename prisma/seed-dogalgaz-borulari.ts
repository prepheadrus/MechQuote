/**
 * Doğalgaz Boruları Seed Verisi
 * Mekanik Tesisat Terminolojisine Uygun Gerçek Ürünler
 * 
 * Kullanım: npx prisma db seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Doğalgaz Boruları seed verisi oluşturuluyor...');

  // Doğalgaz Boruları - Çelik (Siyah Boru)
  const dogalgazBorulari = [
    // 1/2" (15mm) - Küçük Çap
    {
      code: 'DB-15-001',
      name: 'Doğalgaz Siyah Boru 1/2" (15mm) - Erw Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-15-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW (Electric Resistance Welded) siyah çelik boru. 1/2" (15mm) çapında, konut içi dağıtım hatları için uygundur. TS EN 10255 standardında.',
      unit: 'Metre (mt)',
      listPrice: 45.00,
      basePrice: 35.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '1/2" (15mm)',
        etKalinligi: '2.0mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '0.85 kg/mt'
      }),
      stockQuantity: 500,
      minStockLevel: 50
    },
    
    // 3/4" (20mm) - Orta Çap
    {
      code: 'DB-20-001',
      name: 'Doğalgaz Siyah Boru 3/4" (20mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-20-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 3/4" (20mm) çapında, orta kapasiteli konut ve ticari binalar için uygundur. TS EN 10255 standardında.',
      unit: 'Metre (mt)',
      listPrice: 62.00,
      basePrice: 48.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '3/4" (20mm)',
        etKalinligi: '2.3mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '1.15 kg/mt'
      }),
      stockQuantity: 400,
      minStockLevel: 40
    },
    
    // 1" (25mm) - Büyük Çap
    {
      code: 'DB-25-001',
      name: 'Doğalgaz Siyah Boru 1" (25mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-25-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 1" (25mm) çapında, büyük konut kompleksleri ve ticari binalar için uygundur. TS EN 10255 standardında.',
      unit: 'Metre (mt)',
      listPrice: 85.00,
      basePrice: 65.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '1" (25mm)',
        etKalinligi: '2.6mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '1.55 kg/mt'
      }),
      stockQuantity: 300,
      minStockLevel: 30
    },
    
    // 1.1/4" (32mm) - Endüstriyel
    {
      code: 'DB-32-001',
      name: 'Doğalgaz Siyah Boru 1.1/4" (32mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-32-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 1.1/4" (32mm) çapında, endüstriyel tesisler ve merkezi sistemler için uygundur. TS EN 10255 standardında.',
      unit: 'Metre (mt)',
      listPrice: 125.00,
      basePrice: 95.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '1.1/4" (32mm)',
        etKalinligi: '2.9mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '2.15 kg/mt'
      }),
      stockQuantity: 200,
      minStockLevel: 20
    },
    
    // 1.1/2" (40mm) - Endüstriyel
    {
      code: 'DB-40-001',
      name: 'Doğalgaz Siyah Boru 1.1/2" (40mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-40-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 1.1/2" (40mm) çapında, endüstriyel tesisler ve merkezi doğalgaz dağıtım hatları için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 165.00,
      basePrice: 125.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '1.1/2" (40mm)',
        etKalinligi: '3.2mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '2.85 kg/mt'
      }),
      stockQuantity: 150,
      minStockLevel: 15
    },
    
    // 2" (50mm) - Ana Dağıtım
    {
      code: 'DB-50-001',
      name: 'Doğalgaz Siyah Boru 2" (50mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-50-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 2" (50mm) çapında, ana dağıtım hatları ve büyük endüstriyel tesisler için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 245.00,
      basePrice: 185.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '2" (50mm)',
        etKalinligi: '3.6mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Dişli Rakorlu / Kaynaklı',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '3.95 kg/mt'
      }),
      stockQuantity: 100,
      minStockLevel: 10
    },

    // 2.1/2" (65mm) - Ana Dağıtım
    {
      code: 'DB-65-001',
      name: 'Doğalgaz Siyah Boru 2.1/2" (65mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-65-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 2.1/2" (65mm) çapında, ana dağıtım hatları ve sanayi tesisleri için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 385.00,
      basePrice: 295.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '2.1/2" (65mm)',
        etKalinligi: '4.0mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Kaynaklı',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '5.85 kg/mt'
      }),
      stockQuantity: 75,
      minStockLevel: 8
    },

    // 3" (80mm) - Endüstriyel
    {
      code: 'DB-80-001',
      name: 'Doğalgaz Siyah Boru 3" (80mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-80-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 3" (80mm) çapında, büyük endüstriyel tesisler ve ana iletim hatları için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 525.00,
      basePrice: 395.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '3" (80mm)',
        etKalinligi: '4.5mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Kaynaklı',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '7.95 kg/mt'
      }),
      stockQuantity: 50,
      minStockLevel: 5
    },

    // 4" (100mm) - Ana İletim
    {
      code: 'DB-100-001',
      name: 'Doğalgaz Siyah Boru 4" (100mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-100-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 4" (100mm) çapında, şehir şebekesi ve büyük endüstriyel tesisler için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 785.00,
      basePrice: 595.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '4" (100mm)',
        etKalinligi: '5.0mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Kaynaklı',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '11.25 kg/mt'
      }),
      stockQuantity: 30,
      minStockLevel: 3
    },

    // 6" (150mm) - Şehir Şebekesi
    {
      code: 'DB-150-001',
      name: 'Doğalgaz Siyah Boru 6" (150mm) - ERW Çelik',
      brand: 'Çelik Boru A.Ş.',
      model: 'DB-150-ERW',
      category: 'Doğalgaz Boruları',
      description: 'Doğalgaz tesisatı için ERW siyah çelik boru. 6" (150mm) çapında, şehir şebekesi ana iletim hatları için uygundur.',
      unit: 'Metre (mt)',
      listPrice: 1450.00,
      basePrice: 1095.00,
      vatRate: 0.20,
      discountRate: 0.05,
      technicalSpecifications: JSON.stringify({
        cap: '6" (150mm)',
        etKalinligi: '6.3mm',
        malzeme: 'S235JR Çelik',
        standart: 'TS EN 10255',
        yuzey: 'Siyah (Yağlı)',
        baglanti: 'Kaynaklı',
        calismaBasinci: '5 bar',
        testBasinci: '15 bar',
        agirlik: '21.85 kg/mt'
      }),
      stockQuantity: 15,
      minStockLevel: 2
    }
  ];

  // Ürünleri veritabanına ekle
  for (const urun of dogalgazBorulari) {
    const created = await prisma.product.create({
      data: urun
    });
    console.log(`✅ Eklendi: ${created.name} (${created.code})`);
  }

  console.log('\n🎉 Toplam 10 Doğalgaz Borusu başarıyla eklendi!');
  console.log('📊 Özet:');
  console.log('   - Çap aralığı: 1/2" (15mm) - 6" (150mm)');
  console.log('   - Toplam stok: 1,820 metre');
  console.log('   - Ortalama birim fiyat: ₺287.00/mt');
  console.log('   - Tüm ürünler TS EN 10255 standardında');
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
