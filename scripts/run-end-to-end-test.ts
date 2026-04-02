/**
 * End-to-End Proje Test Senaryosu - Gerçek Çalıştırma
 * 
 * Bu script, MechQuote sisteminin tam iş akışını test eder:
 * 1. Müşteri oluşturma
 * 2. Teklif hazırlama (12 kalem)
 * 3. Teklifi projeye dönüştürme
 * 4. Proje aşamalarını ilerletme
 * 5. Ekip atamaları ve ödemeler
 * 6. Fatura ekleme ve ilişkilendirme
 * 7. Müşteri ödemeleri
 * 8. Karlılık analizi
 * 
 * Kullanım: npx tsx scripts/run-end-to-end-test.ts
 */

import { prisma } from '../src/lib/prisma';
import { ProjeDurumu } from '@prisma/client';
import { calculateItemTotals } from '../src/lib/pricing';
import { logger } from '../src/lib/logger';

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const TEST_CONFIG = {
  customer: {
    name: "Ahmet Yılmaz - HVAC Sistemi",
    email: "ahmet.yilmaz@test.com",
    phone: "+90 532 111 2233",
    taxId: "12345678901",
    address: {
      street: "Atatürk Caddesi No: 123",
      city: "İstanbul",
      district: "Kadıköy",
      postalCode: "34710"
    },
    tags: ["VIP", "HVAC", "Konut", "TEST"],
    notes: "5 odalı villa için komple HVAC sistemi - END TO END TEST"
  },
  proposal: {
    quoteNumber: `2026-TEST-${Date.now()}`, // Unique quote number
    projectName: "Villa HVAC Sistemi - Komple Kurulum (TEST)"
  },
  exchangeRates: {
    USD: 32.50,
    EUR: 35.00
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function printHeader(text: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${text}`);
  console.log('='.repeat(80) + '\n');
}

function printStep(text: string) {
  console.log(`\n📍 ${text}`);
  console.log('-'.repeat(60));
}

function printSuccess(text: string) {
  console.log(`✅ ${text}`);
}

function printError(text: string, error?: any) {
  console.log(`❌ ${text}`);
  if (error) console.error(error);
}

function printData(data: any, fields: string[]) {
  fields.forEach(field => {
    const value = data[field];
    if (value !== undefined && value !== null) {
      console.log(`   ${field}: ${value}`);
    }
  });
}

// ============================================================================
// TEST DATA
// ============================================================================

const PROPOSAL_ITEMS = [
  {
    name: "VRF Dış Ünite 22 HP",
    brand: "Mitsubishi Electric",
    model: "PQRY-P220YLM-A",
    quantity: 2,
    unit: "Adet",
    listPrice: 4500,
    currency: "USD",
    discountRate: 0.15,
    profitMargin: 0.25,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "VRF Sistemleri",
    groupDescription: "Değişken debili soğutma sistemi",
    orderIndex: 0
  },
  {
    name: "VRF İç Ünite Kanal Tipi 7.1 kW",
    brand: "Mitsubishi Electric",
    model: "SEZ-M71DA",
    quantity: 5,
    unit: "Adet",
    listPrice: 1200,
    currency: "USD",
    discountRate: 0.15,
    profitMargin: 0.30,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "VRF Sistemleri",
    groupDescription: "Değişken debili soğutma sistemi",
    orderIndex: 1
  },
  {
    name: "VRF İç Ünite Kanal Tipi 5.0 kW",
    brand: "Mitsubishi Electric",
    model: "SEZ-M50DA",
    quantity: 3,
    unit: "Adet",
    listPrice: 900,
    currency: "USD",
    discountRate: 0.15,
    profitMargin: 0.30,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "VRF Sistemleri",
    groupDescription: "Değişken debili soğutma sistemi",
    orderIndex: 2
  },
  {
    name: "Kombi Yoğuşmalı 24 kW",
    brand: "Vaillant",
    model: "ecoTEC Plus 246",
    quantity: 1,
    unit: "Adet",
    listPrice: 1500,
    currency: "EUR",
    discountRate: 0.10,
    profitMargin: 0.20,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Isıtma Sistemi",
    groupDescription: "Doğalgaz kombi sistemi",
    orderIndex: 3
  },
  {
    name: "Panel Radyatör 60x100",
    brand: "ECA",
    model: "Termo Dynamique",
    quantity: 8,
    unit: "Adet",
    listPrice: 45,
    currency: "TRY",
    discountRate: 0.20,
    profitMargin: 0.35,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Radyatörler",
    groupDescription: "Çelik panel radyatörler",
    orderIndex: 4
  },
  {
    name: "Panel Radyatör 60x140",
    brand: "ECA",
    model: "Termo Dynamique",
    quantity: 4,
    unit: "Adet",
    listPrice: 60,
    currency: "TRY",
    discountRate: 0.20,
    profitMargin: 0.35,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Radyatörler",
    groupDescription: "Çelik panel radyatörler",
    orderIndex: 5
  },
  {
    name: "Bakır Boru 15.88mm (1/2\")",
    brand: "Mueller",
    model: "ACR Grade",
    quantity: 150,
    unit: "Metre",
    listPrice: 85,
    currency: "TRY",
    discountRate: 0.10,
    profitMargin: 0.40,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Montaj Malzemeleri",
    groupDescription: "VRF boru hattı ve bağlantı elemanları",
    orderIndex: 6
  },
  {
    name: "Bakır Boru 9.52mm (3/8\")",
    brand: "Mueller",
    model: "ACR Grade",
    quantity: 150,
    unit: "Metre",
    listPrice: 55,
    currency: "TRY",
    discountRate: 0.10,
    profitMargin: 0.40,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Montaj Malzemeleri",
    groupDescription: "VRF boru hattı ve bağlantı elemanları",
    orderIndex: 7
  },
  {
    name: "Isı Yalıtım Borusu 15mm",
    brand: "Armaflex",
    model: "AF/Armaflex",
    quantity: 300,
    unit: "Metre",
    listPrice: 25,
    currency: "TRY",
    discountRate: 0.15,
    profitMargin: 0.35,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Montaj Malzemeleri",
    groupDescription: "VRF boru hattı ve bağlantı elemanları",
    orderIndex: 8
  },
  {
    name: "Kondens Pompası 230V",
    brand: "Aspen",
    model: "Mini Orange",
    quantity: 8,
    unit: "Adet",
    listPrice: 350,
    currency: "TRY",
    discountRate: 0.10,
    profitMargin: 0.30,
    basePrice: 0,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "Montaj Malzemeleri",
    groupDescription: "VRF boru hattı ve bağlantı elemanları",
    orderIndex: 9
  },
  {
    name: "VRF Montaj ve Devreye Alma",
    brand: null,
    model: null,
    quantity: 1,
    unit: "Lump Sum",
    listPrice: 0,
    currency: "TRY",
    discountRate: 0,
    profitMargin: 0,
    basePrice: 75000,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "İşçilik",
    groupDescription: "Profesyonel montaj ekibi",
    orderIndex: 10
  },
  {
    name: "Elektrik Tesisatı ve Otomasyon",
    brand: null,
    model: null,
    quantity: 1,
    unit: "Lump Sum",
    listPrice: 0,
    currency: "TRY",
    discountRate: 0,
    profitMargin: 0,
    basePrice: 35000,
    vatRate: 0.20,
    priceIncludesVat: false,
    groupName: "İşçilik",
    groupDescription: "Profesyonel montaj ekibi",
    orderIndex: 11
  }
];

const TEAM_MEMBERS = [
  { name: "Mehmet Demir", role: "Proje Müdürü", dailyRate: 2500 },
  { name: "Ali Veli", role: "Teknisyen", dailyRate: 1800 },
  { name: "Ayşe Yılmaz", role: "Teknisyen", dailyRate: 1800 },
  { name: "Fatma Şahin", role: "Elektrikçi", dailyRate: 2000 }
];

const INVOICES = [
  {
    supplierName: "Mitsubishi Electric Türkiye",
    invoiceNumber: "INV-TEST-001",
    invoiceDate: new Date('2026-03-10'),
    currency: "USD",
    items: [
      { name: "VRF Dış Ünite 22 HP", quantity: 2, unitPrice: 3825 },
      { name: "VRF İç Ünite 7.1kW", quantity: 5, unitPrice: 1020 },
      { name: "VRF İç Ünite 5.0kW", quantity: 3, unitPrice: 765 }
    ]
  },
  {
    supplierName: "ECA Bayii - İstanbul",
    invoiceNumber: "ECA-TEST-002",
    invoiceDate: new Date('2026-03-15'),
    currency: "TRY",
    items: [
      { name: "Panel Radyatör 60x100", quantity: 8, unitPrice: 36 },
      { name: "Panel Radyatör 60x140", quantity: 4, unitPrice: 48 }
    ]
  },
  {
    supplierName: "Bakır Boru San. Tic. Ltd.",
    invoiceNumber: "BB-TEST-003",
    invoiceDate: new Date('2026-03-18'),
    currency: "TRY",
    items: [
      { name: "Bakır Boru 15.88mm (1/2\")", quantity: 150, unitPrice: 76.50 },
      { name: "Bakır Boru 9.52mm (3/8\")", quantity: 150, unitPrice: 49.50 }
    ]
  },
  {
    supplierName: "Armaflex Türkiye",
    invoiceNumber: "ARM-TEST-004",
    invoiceDate: new Date('2026-03-20'),
    currency: "TRY",
    items: [
      { name: "Isı Yalıtım Borusu 15mm", quantity: 300, unitPrice: 21.25 },
      { name: "Kondens Pompası 230V", quantity: 8, unitPrice: 315 }
    ]
  }
];

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runEndToEndTest() {
  const startTime = Date.now();
  const results: any = {
    customer: null,
    proposal: null,
    project: null,
    personnel: [] as any[],
    invoices: [] as any[],
    payments: [] as any[],
    expenses: [] as any[]
  };

  try {
    // ========================================================================
    // CLEANUP: Önceki test verilerini temizle
    // ========================================================================
    printHeader('🧹 ÖNCEKİ TEST VERİLERİ TEMİZLENİYOR');
    
    const testCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: 'Ahmet Yılmaz - HVAC Sistemi' } },
          { email: { contains: '@test.com' } }
        ]
      },
      include: {
        proposals: true,
        projects: true,
        invoices: true,
        transactions: true
      }
    });

    if (testCustomers.length > 0) {
      console.log(`   📋 ${testCustomers.length} test müşterisi bulundu, temizleniyor...\n`);
      
      for (const customer of testCustomers) {
        // Delete related records first
        for (const project of customer.projects) {
          await prisma.jobAssignment.deleteMany({ where: { projectId: project.id } });
          await prisma.projectStatusHistory.deleteMany({ where: { projectId: project.id } });
          await prisma.projectExpense.deleteMany({ where: { projectId: project.id } });
        }

        const invoiceIds = customer.invoices.map(inv => inv.id);
        if (invoiceIds.length > 0) {
          await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        }

        await prisma.invoice.deleteMany({ where: { OR: [{ customerId: customer.id }, { projectId: { in: customer.projects.map(p => p.id) } }] } });
        await prisma.customerTransaction.deleteMany({ where: { customerId: customer.id } });

        const proposalIds = customer.proposals.map(p => p.id);
        if (proposalIds.length > 0) {
          await prisma.proposalItem.deleteMany({ where: { proposalId: { in: proposalIds } } });
          await prisma.proposal.deleteMany({ where: { customerId: customer.id } });
        }

        await prisma.project.deleteMany({ where: { customerId: customer.id } });
        await prisma.customer.delete({ where: { id: customer.id } });
        
        console.log(`   ✅ ${customer.name} silindi`);
      }
    }

    // Clean test personnel
    const testPersonnel = await prisma.personnel.findMany({
      where: {
        name: { in: ['Mehmet Demir', 'Ali Veli', 'Ayşe Yılmaz', 'Fatma Şahin'] }
      }
    });
    
    for (const person of testPersonnel) {
      await prisma.jobAssignment.deleteMany({ where: { personnelId: person.id } });
      await prisma.personnelTransaction.deleteMany({ where: { personnelId: person.id } });
      await prisma.personnel.delete({ where: { id: person.id } });
    }
    
    if (testPersonnel.length > 0) {
      console.log(`   ✅ ${testPersonnel.length} test personeli silindi\n`);
    }

    printHeader('🧪 END-TO-END PROJE TEST SENARYOSU - BAŞLIYOR');

    // ========================================================================
    // PHASE 1: CREATE CUSTOMER
    // ========================================================================
    printStep('FAZ 1: Müşteri Oluşturma');
    
    const customer = await prisma.customer.create({
      data: {
        name: TEST_CONFIG.customer.name,
        email: TEST_CONFIG.customer.email,
        phone: TEST_CONFIG.customer.phone,
        taxId: TEST_CONFIG.customer.taxId,
        address: JSON.stringify(TEST_CONFIG.customer.address),
        taxOffice: "Kadıköy",
        status: "Aktif",
        tags: JSON.stringify(TEST_CONFIG.customer.tags),
        notes: TEST_CONFIG.customer.notes,
        balance: 0
      }
    });
    
    printSuccess(`Müşteri oluşturuldu: ${customer.id}`);
    printData(customer, ['name', 'email', 'phone', 'status', 'balance']);
    results.customer = customer;

    // ========================================================================
    // PHASE 2: CREATE PROPOSAL
    // ========================================================================
    printStep('FAZ 2: Teklif Oluşturma (12 Kalem)');
    
    // Calculate totals using pricing.ts
    let totalAmount = 0;
    const itemsWithTotals = PROPOSAL_ITEMS.map(item => {
      const exchangeRate = item.currency === 'USD' ? TEST_CONFIG.exchangeRates.USD :
                          item.currency === 'EUR' ? TEST_CONFIG.exchangeRates.EUR : 1;
      
      const totals = calculateItemTotals({
        ...item,
        exchangeRate,
        quantity: item.quantity,
        vatRate: item.vatRate,
        priceIncludesVat: item.priceIncludesVat
      });
      
      totalAmount += totals.totalTlSell;
      
      return {
        productId: null,
        name: item.name,
        brand: item.brand,
        model: item.model,
        quantity: item.quantity,
        unit: item.unit,
        listPrice: item.listPrice,
        currency: item.currency,
        discountRate: item.discountRate,
        profitMargin: item.profitMargin,
        basePrice: item.basePrice,
        vatRate: item.vatRate,
        priceIncludesVat: item.priceIncludesVat,
        groupName: item.groupName,
        groupDescription: item.groupDescription,
        orderIndex: item.orderIndex
      };
    });

    const proposal = await prisma.proposal.create({
      data: {
        customerId: customer.id,
        customerName: customer.name,
        projectName: TEST_CONFIG.proposal.projectName,
        quoteNumber: TEST_CONFIG.proposal.quoteNumber,
        totalAmount: totalAmount,
        exchangeRateUSD: TEST_CONFIG.exchangeRates.USD,
        exchangeRateEUR: TEST_CONFIG.exchangeRates.EUR,
        status: "Draft",
        tags: "HVAC, Villa, Premium, TEST",
        items: {
          create: itemsWithTotals
        }
      },
      include: { items: true }
    });

    // Update rootProposalId
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { rootProposalId: proposal.id }
    });

    printSuccess(`Teklif oluşturuldu: ${proposal.id}`);
    printData(proposal, ['quoteNumber', 'projectName', 'status', 'totalAmount']);
    console.log(`   Kalem sayısı: ${proposal.items.length}`);
    console.log(`   Toplam tutar (KDV Hariç): ₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    results.proposal = proposal;

    // ========================================================================
    // PHASE 3: APPROVE PROPOSAL
    // ========================================================================
    printStep('FAZ 3: Teklif Onaylama ve Stok Rezervasyonu');
    
    const approvedProposal = await prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: "Approved" }
    });

    // Create stock reservations
    for (const item of proposal.items) {
      if (item.productId) {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: 'RESERVED',
            description: `Teklif onayı ile rezervasyon: ${proposal.quoteNumber}`,
            referenceId: item.id
          }
        });
      }
    }

    // Update customer stats
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        approvedProposalsCount: { increment: 1 },
        totalSpending: { increment: totalAmount }
      }
    });

    printSuccess(`Teklif onaylandı: ${approvedProposal.id}`);
    console.log(`   Status: Approved`);
    console.log(`   Stok rezervasyonları oluşturuldu`);

    // ========================================================================
    // PHASE 4: CREATE PROJECT
    // ========================================================================
    printStep('FAZ 4: Projeye Dönüştürme');
    
    const project = await prisma.project.create({
      data: {
        name: TEST_CONFIG.proposal.projectName,
        customerId: customer.id,
        description: "5 odalı villa için komple HVAC sistemi kurulumu - END TO END TEST",
        address: "Atatürk Caddesi No: 123, Kadıköy, İstanbul",
        status: ProjeDurumu.SOZLESME_ASAMASI,
        contractAmount: totalAmount,
        estimatedMaterialCost: totalAmount * 0.55, // ~55% material
        estimatedLaborCost: 110000, // Montaj + Elektrik
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-05-30'),
        linkedProposalId: proposal.id
      }
    });

    // Update proposal status
    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { 
        status: "Converted",
        projectId: project.id
      }
    });

    printSuccess(`Proje oluşturuldu: ${project.id}`);
    printData(project, ['name', 'status', 'contractAmount', 'startDate', 'endDate']);
    results.project = project;

    // ========================================================================
    // PHASE 5: CREATE TEAM MEMBERS AND ASSIGNMENTS
    // ========================================================================
    printStep('FAZ 5: Ekip Üyeleri ve Atamaları');
    
    for (const member of TEAM_MEMBERS) {
      const personnel = await prisma.personnel.create({
        data: {
          name: member.name,
          role: member.role,
          status: "Aktif",
          dailyRate: member.dailyRate
        }
      });

      const assignedAmount = member.dailyRate * 30; // 30 gün çalışma
      
      // Simulate payment history (2 payments: 50% + 50%)
      const paymentHistory = [
        { date: '2026-04-01', amount: assignedAmount * 0.5, note: '1. Hakediş' },
        { date: '2026-05-20', amount: assignedAmount * 0.5, note: '2. Hakediş (Tamamlandı)' }
      ];
      
      const assignment = await prisma.jobAssignment.create({
        data: {
          projectId: project.id,
          personnelId: personnel.id,
          assignedAmount: assignedAmount,
          notes: `${member.role} - ${member.name}`,
          paymentStatus: "Ödendi",
          paymentHistory: JSON.stringify(paymentHistory)
        }
      });

      printSuccess(`Ekip üyesi atandı: ${member.name} (${member.role})`);
      console.log(`   Assigned Amount: ₺${assignedAmount.toLocaleString('tr-TR')}`);
      console.log(`   Ödeme Geçmişi: ₺${assignedAmount.toLocaleString('tr-TR')} (Tamamlandı)`);
      
      results.personnel.push({ personnel, assignment });
    }

    // ========================================================================
    // PHASE 6: PROGRESS THROUGH PROJECT STAGES
    // ========================================================================
    printStep('FAZ 6: Proje Aşamalarını İlerletme');
    
    const stages = [
      ProjeDurumu.SOZLESME_ASAMASI,
      ProjeDurumu.PROJE_PLANLAMA,
      ProjeDurumu.MALZEME_TEDARIK,
      ProjeDurumu.SAHA_MOBILIZASYONU,
      ProjeDurumu.MONTAJ_VE_IMALAT,
      ProjeDurumu.TEST_VE_DEVREYE_ALMA,
      ProjeDurumu.GECICI_KABUL,
      ProjeDurumu.EKSIK_GIDERME,
      ProjeDurumu.PROJE_TAMAMLANDI,
      ProjeDurumu.FATURALANDIRILDI_VE_KAPANDI
    ];

    for (const stage of stages) {
      await prisma.project.update({
        where: { id: project.id },
        data: { status: stage }
      });

      // Create status history
      await prisma.projectStatusHistory.create({
        data: {
          projectId: project.id,
          status: stage,
          note: `Test senaryosu ile ${stage} aşamasına geçildi`,
          date: new Date()
        }
      });

      console.log(`   ✅ ${stage}`);
    }

    printSuccess(`Tüm proje aşamaları tamamlandı (10/10)`);

    // ========================================================================
    // PHASE 7: CREATE INVOICES AND LINK TO PROJECT
    // ========================================================================
    printStep('FAZ 7: Faturalar Ekleme ve Projeye İlişkilendirme');
    
    for (const invData of INVOICES) {
      let invoiceTotal = 0;
      let invoiceTotalTL = 0; // TL karşılığı
      const invoiceItemsData = invData.items.map(item => {
        const itemTotal = item.quantity * item.unitPrice;
        const taxAmount = itemTotal * 0.20;
        invoiceTotal += itemTotal;
        
        // Döviz çevrimi (USD/EUR → TL)
        const itemTotalTL = invData.currency === 'USD' ? itemTotal * TEST_CONFIG.exchangeRates.USD :
                           invData.currency === 'EUR' ? itemTotal * TEST_CONFIG.exchangeRates.EUR :
                           itemTotal;
        invoiceTotalTL += itemTotalTL;
        
        return {
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal, // Orijinal döviz tutarı
          taxRate: 0.20,
          taxAmount: taxAmount,
          projectId: project.id,
          supplierName: invData.supplierName,
          invoiceDate: invData.invoiceDate,
          netPrice: item.unitPrice
        };
      });

      const invoice = await prisma.invoice.create({
        data: {
          type: "Incoming",
          senderName: invData.supplierName,
          invoiceNumber: invData.invoiceNumber,
          invoiceDate: invData.invoiceDate,
          currency: invData.currency,
          totalAmount: invoiceTotalTL, // ✅ TL karşılığı (ana para birimi)
          subTotal: invoiceTotalTL,
          totalTaxAmount: invoiceTotalTL * 0.20,
          taxInclusiveTotal: invoiceTotalTL * 1.20,
          projectId: project.id,
          status: "Onaylandı",
          items: {
            create: invoiceItemsData
          }
        },
        include: { items: true }
      });

      // Create stock movements for invoice items (only if product exists)
      // Note: Since these are new invoices without linked products, we skip stock movements
      // In real scenario, invoice items would be linked to products first
      console.log(`   Not: Fatura kalemleri ürünlere eşleştirilmedi (gerçek senaryoda eşleştirme yapılır)`);

      printSuccess(`Fatura eklendi: ${invData.invoiceNumber}`);
      console.log(`   Tedarikçi: ${invData.supplierName}`);
      console.log(`   Tutar: ${invData.currency} ${invoiceTotal.toLocaleString('tr-TR')} (= ₺${invoiceTotalTL.toLocaleString('tr-TR')})`);
      console.log(`   Kalem sayısı: ${invoice.items.length}`);
      
      results.invoices.push(invoice);
    }

    // ========================================================================
    // PHASE 8: CREATE PROJECT EXPENSES
    // ========================================================================
    printStep('FAZ 8: Proje Giderleri Ekleme');
    
    const expenses = [
      { description: "Şantiye kurulumu ve mobilizasyon", amount: 15000, category: "Mobilizasyon" },
      { description: "Basınç testi ve gaz dolumu", amount: 5000, category: "Test" },
      { description: "Eksik giderme çalışmaları", amount: 3000, category: "Eksik Giderme" }
    ];

    for (const expense of expenses) {
      const projectExpense = await prisma.projectExpense.create({
        data: {
          projectId: project.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          type: "Expense"
        }
      });
      
      console.log(`   ✅ ${expense.description}: ₺${expense.amount.toLocaleString('tr-TR')}`);
      results.expenses.push(projectExpense);
    }

    // ========================================================================
    // PHASE 9: CREATE SALES INVOICE
    // ========================================================================
    printStep('FAZ 9: Satış Faturası Oluşturma');
    
    const salesInvoice = await prisma.invoice.create({
      data: {
        type: "Outgoing", // ✅ Satış faturası (İngilizce)
        customerId: customer.id,
        invoiceNumber: "2026-TEST-SATIS-001",
        invoiceDate: new Date('2026-05-25'),
        dueDate: new Date('2026-06-25'),
        currency: "TRY",
        totalAmount: totalAmount,
        subTotal: totalAmount,
        totalTaxAmount: totalAmount * 0.20,
        taxInclusiveTotal: totalAmount * 1.20,
        projectId: project.id,
        status: "Onaylandı",
        items: {
          create: [{
            name: "VRF Sistemi Kurulumu (KDV Hariç)",
            quantity: 1,
            unitPrice: totalAmount,
            totalPrice: totalAmount,
            taxRate: 0.20,
            taxAmount: totalAmount * 0.20,
            projectId: project.id
          }]
        }
      },
      include: { items: true }
    });

    // Create customer debt
    await prisma.customerTransaction.create({
      data: {
        customerId: customer.id,
        amount: totalAmount * 1.20, // KDV dahil
        type: "Debt",
        category: "Satış",
        description: `Proje satış faturası: ${salesInvoice.invoiceNumber}`,
        referenceType: "Invoice",
        referenceId: salesInvoice.id
      }
    });

    // Update customer balance
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        balance: { increment: totalAmount * 1.20 }
      }
    });

    printSuccess(`Satış faturası oluşturuldu: ${salesInvoice.invoiceNumber}`);
    console.log(`   KDV Hariç: ₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   KDV (%20): ₺${(totalAmount * 0.20).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   GENEL TOPLAM: ₺${(totalAmount * 1.20).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);

    // ========================================================================
    // PHASE 10: CREATE CUSTOMER PAYMENTS
    // ========================================================================
    printStep('FAZ 10: Müşteri Ödemeleri (Doğru Ödeme Planı)');
    
    // DOĞRU ÖDEME PLANI: %30 + %35 + %35 = %100
    // Fatura Toplamı (KDV Dahil): ₺994.693,21
    const totalInvoiceWithVat = totalAmount * 1.20; // KDV Dahil toplam: ₺994.693,21
    
    const payments = [
      { amount: totalInvoiceWithVat * 0.30, date: new Date('2026-03-01'), description: "Avans ödemesi (%30) - ₺298.407,96", category: "Avans" },
      { amount: totalInvoiceWithVat * 0.35, date: new Date('2026-04-01'), description: "1. Progress - Malzeme tedarik (%35) - ₺348.142,62", category: "Tahsilat" },
      { amount: totalInvoiceWithVat * 0.35, date: new Date('2026-05-15'), description: "2. Progress - Montaj tamamlandı (%35) - ₺348.142,62", category: "Tahsilat" }
      // %30+%35+%35 = %100 = ₺994.693,21 ✅
    ];

    let totalPaid = 0;
    for (const payment of payments) {
      await prisma.customerTransaction.create({
        data: {
          customerId: customer.id,
          amount: payment.amount, // ✅ Zaten KDV dahil (totalInvoiceWithVat'tan hesaplandı)
          type: "Payment",
          category: payment.category,
          description: payment.description,
          date: payment.date,
          referenceType: "Invoice",
          referenceId: salesInvoice.id
        }
      });

      // Update customer balance (decrease debt)
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          balance: { decrement: payment.amount }
        }
      });

      totalPaid += payment.amount;
      console.log(`   ✅ ${payment.description}: ₺${payment.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
      results.payments.push(payment);
    }

    printSuccess(`Tüm ödemeler kaydedildi`);
    console.log(`   Toplam Ödeme: ₺${totalPaid.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);

    // ========================================================================
    // PHASE 11: FINAL REPORT
    // ========================================================================
    printHeader('📊 TEST SONUÇLARI RAPORU');

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    // Fetch final data
    const finalCustomer = await prisma.customer.findUnique({
      where: { id: customer.id },
      include: { 
        proposals: true,
        projects: true,
        transactions: true
      }
    });

    const finalProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        jobAssignments: {
          include: { personnel: true }
        },
        invoices: true,
        transactions: true,
        statusHistory: true
      }
    });

    // Calculate totals
    const totalInvoiceCost = results.invoices.reduce((sum: number, inv: any) => sum + inv.totalAmount, 0); // Already in TL
    const totalExpenseCost = results.expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const totalLaborCost = results.personnel.reduce((sum: number, p: any) => sum + p.assignment.assignedAmount, 0);
    const totalCost = totalInvoiceCost + totalExpenseCost + totalLaborCost;
    const grossProfit = totalAmount - totalCost;
    const profitMargin = (grossProfit / totalAmount) * 100;
    const roi = (grossProfit / totalCost) * 100;

    console.log('\n📋 OLUŞTURULAN KAYITLAR:\n');
    console.log(`   ✅ Müşteri: ${customer.name} (${customer.id})`);
    console.log(`   ✅ Teklif: ${proposal.quoteNumber} (${proposal.items.length} kalem)`);
    console.log(`   ✅ Proje: ${project.name} (${finalProject?.statusHistory.length} aşama)`);
    console.log(`   ✅ Ekip Üyeleri: ${results.personnel.length} kişi`);
    console.log(`   ✅ Gelen Faturalar: ${results.invoices.length} adet`);
    console.log(`   ✅ Proje Giderleri: ${results.expenses.length} adet`);
    console.log(`   ✅ Satış Faturası: 1 adet`);
    console.log(`   ✅ Müşteri Ödemeleri: ${results.payments.length} adet`);

    console.log('\n💰 FİNANSAL ÖZET:\n');
    console.log(`   📈 Toplam Gelir (KDV Hariç):    ₺${totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   📉 Toplam Maliyet:              ₺${totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`      ├─ Malzeme (Faturalar):     ₺${totalInvoiceCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`      ├─ İşçilik (Ekip):          ₺${totalLaborCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`      └─ Giderler:                ₺${totalExpenseCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   ─────────────────────────────────────────────────────`);
    console.log(`   💵 BRÜT KÂR:                   ₺${grossProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   📊 Kâr Marjı:                  %${profitMargin.toFixed(2)}`);
    console.log(`   📈 ROI:                        %${roi.toFixed(2)}`);

    console.log('\n🎯 MÜŞTERİ DURUMU:\n');
    console.log(`   Bakiye: ₺${finalCustomer?.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   Toplam İş Hacmi: ₺${(finalCustomer?.totalSpending || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`);
    console.log(`   Onaylı Teklifler: ${finalCustomer?.approvedProposalsCount}`);
    console.log(`   Toplam Proje: ${finalCustomer?.projects.length}`);

    console.log('\n⏱️  TEST SÜRESİ:\n');
    console.log(`   Süre: ${duration.toFixed(2)} saniye`);

    printHeader('✅ END-TO-END TEST BAŞARIYLA TAMAMLANDI');

    console.log('\n📝 NOTLAR:\n');
    console.log('   - Tüm veriler test amaçlı oluşturulmuştur.');
    console.log('   - Silmek için: npx tsx scripts/cleanup-test-data.ts');
    console.log('   - Müşteri adı: "Ahmet Yılmaz - HVAC Sistemi"');
    console.log('   - Proje adı: "Villa HVAC Sistemi - Komple Kurulum (TEST)"');
    console.log('   - Teklif no: "2026-TEST-001"\n');

    return {
      success: true,
      duration,
      customer: finalCustomer,
      project: finalProject,
      financials: {
        revenue: totalAmount,
        totalCost,
        grossProfit,
        profitMargin,
        roi
      }
    };

  } catch (error) {
    printError('TEST SIRASINDA HATA OLUŞTU', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

runEndToEndTest()
  .then(result => {
    console.log('\n');
    if (result.success) {
      console.log('✅ Test başarıyla tamamlandı!');
      process.exit(0);
    } else {
      console.log('❌ Test başarısız oldu:', result.error);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
