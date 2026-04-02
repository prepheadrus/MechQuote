/**
 * Kasa Defteri Test
 * Kullanım: npx tsx scripts/test-cash-book.ts
 */

import { prisma } from '@/lib/prisma';

async function testCashBook() {
  console.log('🧾 KASA DEFTERİ TEST\n');

  try {
    // 1. Raw data from DB
    console.log('📊 VERİTABANI KAYITLARI:\n');
    
    const customerTx = await prisma.customerTransaction.findMany({
      where: { customer: { name: { contains: 'Ahmet Yılmaz' } } },
      include: { customer: true }
    });
    console.log(`Müşteri İşlemleri: ${customerTx.length}`);
    customerTx.forEach(tx => {
      console.log(`  ${tx.type} | ${tx.category} | ₺${tx.amount.toLocaleString('tr-TR')} | ${tx.description}`);
    });
    console.log('');

    const personnelTx = await prisma.personnelTransaction.findMany({
      where: { personnel: { name: { in: ['Mehmet Demir', 'Ali Veli', 'Ayşe Yılmaz', 'Fatma Şahin'] } } },
      include: { personnel: true }
    });
    console.log(`Personel İşlemleri: ${personnelTx.length}`);
    personnelTx.forEach(tx => {
      console.log(`  ${tx.type} | ${tx.category} | ₺${tx.amount.toLocaleString('tr-TR')} | ${tx.description}`);
    });
    console.log('');

    const projectExp = await prisma.projectExpense.findMany({
      where: { project: { name: { contains: 'TEST' } } },
      include: { project: true }
    });
    console.log(`Proje Giderleri: ${projectExp.length}`);
    projectExp.forEach(tx => {
      console.log(`  ${tx.type} | ${tx.category} | ₺${tx.amount.toLocaleString('tr-TR')} | ${tx.description}`);
    });
    console.log('');

    // 2. Calculate totals
    console.log('\n💰 TOPLAMLAR:\n');
    
    const totalCustomerIn = customerTx.filter(tx => tx.type === 'Payment').reduce((sum, tx) => sum + tx.amount, 0);
    const totalCustomerOut = customerTx.filter(tx => tx.type === 'Debt').reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalPersonnel = personnelTx.reduce((sum, tx) => sum + tx.amount, 0);
    const totalProjectExp = projectExp.filter(tx => tx.type !== 'Income').reduce((sum, tx) => sum + tx.amount, 0);
    
    console.log(`Müşteri Tahsilatları:  ₺${totalCustomerIn.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`Müşteri Borçları:      ₺${totalCustomerOut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`Personel Ödemeleri:   ₺${totalPersonnel.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`Proje Giderleri:      ₺${totalProjectExp.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log('');
    
    const totalIn = totalCustomerIn;
    const totalOut = totalCustomerOut + totalPersonnel + totalProjectExp;
    
    console.log(`TOPLAM GİRİŞ:   ₺${totalIn.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`TOPLAM ÇIKIŞ:   ₺${totalOut.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`NET KASA:       ₺${(totalIn - totalOut).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCashBook();
