/**
 * Otopsi Verisi Test Script
 * Kullanım: npx tsx scripts/test-autopsy.ts
 */

import { prisma } from '@/lib/prisma';
import { getProjectAutopsy } from '@/actions/project-autopsy';

async function testAutopsy() {
  console.log('🔍 Otopsi verisi test ediliyor...\n');

  try {
    // 1. Test projesini bul
    const project = await prisma.project.findFirst({
      where: {
        name: { contains: 'TEST' }
      },
      include: {
        invoices: {
          include: { items: true }
        },
        transactions: true,
        jobAssignments: {
          include: { personnel: true }
        }
      }
    });

    if (!project) {
      console.log('❌ Test projesi bulunamadı!');
      return;
    }

    console.log(`📋 Proje: ${project.name}`);
    console.log(`   ID: ${project.id}`);
    console.log(`   Sözleşme: ₺${project.contractAmount?.toLocaleString('tr-TR')}`);
    console.log('');

    // 2. Faturaları göster
    console.log('📄 Faturalar:');
    for (const invoice of project.invoices) {
      console.log(`   ${invoice.type} | ${invoice.invoiceNumber} | ${invoice.currency} ${invoice.totalAmount.toLocaleString('tr-TR')} | Status: ${invoice.status}`);
    }
    console.log('');

    // 3. Otopsi API'sini çağır
    console.log('🧪 Otopsi API çağrılıyor...\n');
    const result = await getProjectAutopsy(project.id);

    if (result.success && result.data) {
      const { estimated, actual, deviation, details } = result.data;

      console.log('📊 OTOPSİ SONUÇLARI:\n');
      
      console.log('TAHMİNİ (Planlanan):');
      console.log(`   Malzeme: ₺${estimated.materials.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   İşçilik: ₺${estimated.labor.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Toplam: ₺${estimated.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Marj: %${estimated.margin.toFixed(2)}`);
      console.log('');

      console.log('GERÇEKLEŞEN (Actual):');
      console.log(`   Malzeme: ₺${actual.materials.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   İşçilik: ₺${actual.labor.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Giderler: ₺${actual.expenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Toplam: ₺${actual.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Marj: %${actual.margin.toFixed(2)}`);
      console.log('');

      console.log('SAPMA:');
      console.log(`   Miktar: ₺${deviation.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Yüzde: %${deviation.percentage.toFixed(2)}`);
      console.log(`   Durum: ${deviation.status === 'under' ? '🟢 Bütçe altı' : '🔴 Bütçe üstü'}`);
      console.log('');

      console.log('DETAYLAR:');
      console.log(`   Sözleşme: ₺${details.contractAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Faturalanan: ₺${details.invoicedRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Kâr Farkı: ₺${details.profitDifference.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log('');

      // 4. Beklenen değerleri kontrol et
      console.log('✅ DOĞRULAMA:');
      const expectedMaterial = 488962.50 + 480 + 18900 + 8895; // Mitsubishi + ECA + Bakır + Armaflex
      const expectedLabor = 243000; // 4 personel
      const expectedExpenses = 23000; // 3 gider
      const expectedTotal = expectedMaterial + expectedLabor + expectedExpenses;

      console.log(`   Malzeme beklenen: ₺${expectedMaterial.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Malzeme gerçekleşen: ₺${actual.materials.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   ${Math.abs(actual.materials - expectedMaterial) < 1 ? '✅ MALZEME DOĞRU' : '❌ MALZEME YANLIŞ'}`);
      console.log('');

      console.log(`   İşçilik beklenen: ₺${expectedLabor.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   İşçilik gerçekleşen: ₺${actual.labor.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   ${Math.abs(actual.labor - expectedLabor) < 1 ? '✅ İŞÇİLİK DOĞRU' : '❌ İŞÇİLİK YANLIŞ'}`);
      console.log('');

      console.log(`   Toplam beklenen: ₺${expectedTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   Toplam gerçekleşen: ₺${actual.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      console.log(`   ${Math.abs(actual.total - expectedTotal) < 1 ? '✅ TOPLAM DOĞRU' : '❌ TOPLAM YANLIŞ'}`);

    } else {
      console.log('❌ Otopsi verisi alınamadı:', result.error);
    }

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAutopsy();
