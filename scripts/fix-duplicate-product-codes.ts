/**
 * Duplicate Ürün Kodları Temizleme Scripti
 * 
 * Kullanım: npx tsx scripts/fix-duplicate-product-codes.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Duplicate Ürün Kodları Tespit Ediliyor...\n');

    // 1. Duplicate kodları bul
    const duplicates: any[] = await prisma.$queryRaw`
        SELECT code, COUNT(*) as count
        FROM Product
        WHERE code IS NOT NULL
        GROUP BY code
        HAVING COUNT(*) > 1
        ORDER BY count DESC
    `;

    console.log('⚠️ Toplam ' + duplicates.length + ' duplicate kod tespit edildi!\n');

    if (duplicates.length === 0) {
        console.log('✅ Duplicate kod bulunamadı!');
        return;
    }

    // 2. Her duplicate grubu göster
    for (const dup of duplicates) {
        console.log('\n📌 Kod: "' + dup.code + '" (' + dup.count + ' ürün)');
        console.log('─'.repeat(60));

        const products: any[] = await prisma.product.findMany({
            where: { code: dup.code },
            select: {
                id: true,
                name: true,
                brand: true,
                model: true,
                category: true,
            },
        });

        products.forEach((p, idx) => {
            console.log('  ' + (idx + 1) + '. ' + p.name);
            console.log('     ID: ' + p.id);
            console.log('     Marka: ' + (p.brand || '-') + ' | Model: ' + (p.model || '-'));
        });
    }

    console.log('\n\n💡 ÇÖZÜM ÖNERİLERİ:');
    console.log('─'.repeat(60));
    console.log('1. Her ürüne UNIQUE kod ver (örn: UUID ekle)');
    console.log('2. Varyasyonlar için: KOD-VARYANT (örn: DB-15-001-500MT)');
    console.log('3. Aynı ürün farklı boyutlarsa: Ana Ürün + Varyant sistemi kur');

    // 3. Raporu kaydet (BigInt handle etmek için replacer)
    const report = {
        timestamp: new Date().toISOString(),
        totalDuplicates: duplicates.length,
        duplicates: duplicates.map(d => ({
            code: d.code,
            count: Number(d.count),
        })),
    };

    fs.writeFileSync(
        'duplicate-products-report.json',
        JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Rapor kaydedildi: duplicate-products-report.json');
}

main()
    .catch((e) => {
        console.error('❌ Hata:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
