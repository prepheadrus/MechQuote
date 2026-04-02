/**
 * Test Verisi Temizleme Script
 * Kullanım: npx tsx scripts/cleanup-test-data.ts
 */

import { prisma } from '../src/lib/prisma';

async function cleanupTestData() {
  console.log('🧹 Test verileri temizleniyor...\n');

  try {
    // 1. Test müşterilerini bul
    const testCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: 'TEST' } },
          { email: { contains: '@test.com' } },
          { notes: { contains: 'END TO END TEST' } }
        ]
      },
      include: {
        proposals: true,
        projects: true,
        invoices: true,
        transactions: true
      }
    });

    console.log(`📋 Bulunan test müşterileri: ${testCustomers.length}`);
    
    for (const customer of testCustomers) {
      console.log(`\n👤 Müşteri: ${customer.name}`);
      console.log(`   - Teklifler: ${customer.proposals.length}`);
      console.log(`   - Projeler: ${customer.projects.length}`);
      console.log(`   - Faturalar: ${customer.invoices.length}`);
      console.log(`   - İşlemler: ${customer.transactions.length}`);

      // 2. İlgili kayıtları sil (Foreign Key constraint'leri nedeniyle sıralı silme)
      
      // Job Assignments (Project'e bağlı)
      for (const project of customer.projects) {
        await prisma.jobAssignment.deleteMany({
          where: { projectId: project.id }
        });
        
        await prisma.projectStatusHistory.deleteMany({
          where: { projectId: project.id }
        });
        
        await prisma.projectExpense.deleteMany({
          where: { projectId: project.id }
        });
      }

      // Invoice Items (Invoice'a bağlı)
      const customerInvoiceIds = customer.invoices.map(inv => inv.id);
      if (customerInvoiceIds.length > 0) {
        await prisma.invoiceItem.deleteMany({
          where: { invoiceId: { in: customerInvoiceIds } }
        });
      }

      // Invoices
      await prisma.invoice.deleteMany({
        where: { 
          OR: [
            { customerId: customer.id },
            { projectId: { in: customer.projects.map(p => p.id) } }
          ]
        }
      });

      // Transactions
      await prisma.customerTransaction.deleteMany({
        where: { customerId: customer.id }
      });

      // Proposal Items
      const proposalIds = customer.proposals.map(p => p.id);
      if (proposalIds.length > 0) {
        await prisma.proposalItem.deleteMany({
          where: { proposalId: { in: proposalIds } }
        });
      }

      // Proposals
      await prisma.proposal.deleteMany({
        where: { customerId: customer.id }
      });

      // Projects
      await prisma.project.deleteMany({
        where: { customerId: customer.id }
      });

      // Customer
      await prisma.customer.delete({
        where: { id: customer.id }
      });

      console.log(`   ✅ Silindi`);
    }

    // 3. Test personellerini temizle
    const testPersonnel = await prisma.personnel.findMany({
      where: {
        OR: [
          { name: { in: ['Mehmet Demir', 'Ali Veli', 'Ayşe Yılmaz', 'Fatma Şahin'] } },
          { role: { contains: 'TEST' } }
        ]
      }
    });

    console.log(`\n👷 Bulunan test personelleri: ${testPersonnel.length}`);
    
    for (const person of testPersonnel) {
      await prisma.jobAssignment.deleteMany({
        where: { personnelId: person.id }
      });
      
      await prisma.personnelTransaction.deleteMany({
        where: { personnelId: person.id }
      });
      
      await prisma.personnel.delete({
        where: { id: person.id }
      });
      
      console.log(`   ✅ ${person.name} silindi`);
    }

    console.log('\n✅ Test verileri temizlendi!');
    console.log('\n📊 Özet:');
    console.log(`   - Müşteri: ${testCustomers.length}`);
    console.log(`   - Teklif: ${testCustomers.reduce((sum, c) => sum + c.proposals.length, 0)}`);
    console.log(`   - Proje: ${testCustomers.reduce((sum, c) => sum + c.projects.length, 0)}`);
    console.log(`   - Fatura: ${testCustomers.reduce((sum, c) => sum + c.invoices.length, 0)}`);
    console.log(`   - Personel: ${testPersonnel.length}`);

  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
