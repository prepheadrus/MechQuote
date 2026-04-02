import { PrismaClient, ProjeDurumu } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Dükkan için gerçekçi simülasyon verileri temizleniyor ve tazelemeye hazırlanıyor...');

    // Cleanup to avoid unique constraint errors
    await prisma.proposalItem.deleteMany({});
    await prisma.jobAssignment.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.projectExpense.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.productAlias.deleteMany({});
    await prisma.purchaseHistory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.personnel.deleteMany({});

    console.log('🧹 Eski veriler temizlendi. Yeni simülasyon yükleniyor...');

    // 1. Settings
    await prisma.settings.upsert({
        where: { id: 'default-settings' },
        update: {},
        create: {
            id: 'default-settings',
            companyName: 'MechQuote Mühendislik A.Ş.',
            companyTitle: 'Mekanik Tesisat ve Enerji Çözümleri',
            companySlogan: 'Mühendislikte Sarraf Hassasiyeti',
            email: 'info@mechquote.com',
            phoneNumber: '+90 212 555 0000',
            address: 'Maslak Mah. AOS 5. Sokak No:42 Sarıyer, İstanbul',
            taxOffice: 'Maslak V.D.',
            taxNumber: '1234567890',
            defaultVatRate: 0.20,
            currency: 'TRY'
        }
    });

    // 2. Customers
    const customersData = [
        { name: 'Tekfen İnşaat ve Tesisat A.Ş.', taxId: '8360014526', taxOffice: 'Büyük Mükellefler', status: 'Aktif', totalSpending: 1250000, balance: 450000 },
        { name: 'Rönesans Holding', taxId: '7350441234', taxOffice: 'Ankara Kurumlar', status: 'Aktif', totalSpending: 3450000, balance: 890000 },
        { name: 'Limak İnşaat Sanayi ve Ticaret A.Ş.', taxId: '6080056789', taxOffice: 'Boğaziçi V.D.', status: 'Aktif', totalSpending: 850000, balance: -12500 },
        { name: 'Astaş Gayrimenkul Yatırım A.Ş.', taxId: '0910022334', taxOffice: 'Zincirlikuyu V.D.', status: 'Aktif', totalSpending: 5600000, balance: 2100000 },
        { name: 'Arı Mühendislik Ltd. Şti.', taxId: '0780456123', taxOffice: 'Ümraniye V.D.', status: 'Aktif', totalSpending: 45000, balance: 0 }
    ];

    const createdCustomers = [];
    for (const c of customersData) {
        const cust = await prisma.customer.create({ data: c });
        createdCustomers.push(cust);
    }

    // 3. Suppliers
    const suppliersData = [
        { name: 'Daikin Türkiye (Airfel)', contactName: 'Ahmet Yılmaz', phone: '0216 444 9999', address: 'Kartal, İstanbul' },
        { name: 'Grundfos Pompa Sanayi', contactName: 'Mehmet Demir', phone: '0212 317 7900', address: 'Gebze, Kocaeli' },
        { name: 'E.C.A. - Valfsel Armatür', contactName: 'Ayşe Kaya', phone: '0232 394 0000', address: 'Manisa OSB' },
        { name: 'Pilsa Plastik A.Ş. (Wavin)', contactName: 'Caner Bey', phone: '0224 270 0000', address: 'Adana OSB' },
        { name: 'Baymak Makina Sanayi', contactName: 'Zeynep Hanım', phone: '0216 581 0500', address: 'Tuzla, İstanbul' }
    ];

    const createdSuppliers = [];
    for (const s of suppliersData) {
        const sup = await prisma.supplier.create({ data: s });
        createdSuppliers.push(sup);
    }

    // 4. Products
    const productsData = [
        { code: 'DAI-VRV-5-10', name: 'Daikin VRV 5-S Serisi Dış Ünite 10 HP', brand: 'Daikin', model: 'VRV 5-S', category: 'HVAC', unit: 'Adet', listPrice: 245000, currency: 'TRY', vatRate: 0.20, stockQuantity: 4 },
        { code: 'GR-MAGNA3-32', name: 'Grundfos MAGNA3 32-120 F Sirkülasyon Pompası', brand: 'Grundfos', model: 'MAGNA3', category: 'Pompa', unit: 'Adet', listPrice: 42500, currency: 'TRY', vatRate: 0.20, stockQuantity: 12 },
        { code: 'ECA-PAN-600-1200', name: 'ECA Panel Radyatör Tip 22 600x1200 mm', brand: 'ECA', model: 'Tip 22', category: 'Isıtma', unit: 'Adet', listPrice: 3850, currency: 'TRY', vatRate: 0.20, stockQuantity: 150 },
        { code: 'WAV-PPRC-DN25', name: 'Wavin Pilsa PPRC Boru PN20 DN25', brand: 'Wavin', model: 'PN20', category: 'Boru', unit: 'Metre', listPrice: 145, currency: 'TRY', vatRate: 0.20, stockQuantity: 1200 },
        { code: 'BAY-LECT-24', name: 'Baymak Lectus 65 Yoğuşmalı Duvar Tipi Kazan', brand: 'Baymak', model: 'Lectus 65', category: 'Isıtma', unit: 'Adet', listPrice: 85000, currency: 'TRY', vatRate: 0.20, stockQuantity: 2 },
        { code: 'AF-FAN-600', name: 'Airfel Kanal Tipi Aksiyal Fan Ø600', brand: 'Airfel', model: 'Ø600', category: 'Havalandırma', unit: 'Adet', listPrice: 18500, currency: 'TRY', vatRate: 0.20, stockQuantity: 8 },
        { code: 'DAN-V-DN50', name: 'Danfoss Dinamik Balans Vanası DN50 PN16', brand: 'Danfoss', model: 'DN50', category: 'Vana', unit: 'Adet', listPrice: 12400, currency: 'TRY', vatRate: 0.20, stockQuantity: 25 }
    ];

    const createdProducts = [];
    for (const p of productsData) {
        const prod = await prisma.product.create({ data: p });
        createdProducts.push(prod);
    }

    // 5. Personnel
    const personnelData = [
        { name: 'Mustafa Usta (Kaynak Ekibi)', role: 'Sertifikalı Kaynakçı', dailyRate: 2500, status: 'Aktif' },
        { name: 'Cihan Tekniker (Montaj)', role: 'Mekanik Montaj Şefi', dailyRate: 1800, status: 'Aktif' },
        { name: 'Erol Yardımcı', role: 'Vasıfsız Eleman', dailyRate: 1200, status: 'Aktif' },
        { name: 'Selim Mühendis', role: 'Şantiye Şefi', dailyRate: 3500, status: 'Aktif' }
    ];

    const createdPersonnel = [];
    for (const p of personnelData) {
        const pers = await prisma.personnel.create({ data: p });
        createdPersonnel.push(pers);
    }

    // 6. Project
    const mainProject = await prisma.project.create({
        data: {
            name: 'Maslak Plaza İklimlendirme Revizyonu',
            description: '42 katlı ofis kulesinin fan-coil ve soğutma grubu otomasyon ve değişim projesi.',
            status: ProjeDurumu.MONTAJ_VE_IMALAT,
            address: 'Maslak, İstanbul',
            customerId: createdCustomers[0].id,
            contractAmount: 4500000,
            startDate: new Date('2026-01-15'),
            notes: 'Proje 3 etapta tamamlanacaktır.'
        } as any
    });

    // 7. Proposal
    const proposal = await prisma.proposal.create({
        data: {
            quoteNumber: 'QT-2026-0001',
            projectName: 'Merkez Kule Mekanik Tesisat İşleri',
            customerName: createdCustomers[0].name,
            customerId: createdCustomers[0].id,
            status: 'Approved',
            totalAmount: 1250450,
            projectId: mainProject.id,
            exchangeRateUSD: 31.50,
            exchangeRateEUR: 34.20,
            versionNote: 'Başlangıç Teklifi',
            termsAndConditions: '1. Ödemeler %30 avans, kalan hakediş usulü.\n2. Teslimat süresi 60 gündür.',
            items: {
                create: [
                    { name: 'Daikin VRV 5-S Serisi Dış Ünite 10 HP', brand: 'Daikin', model: 'VRV 5-S', quantity: 2, unit: 'Adet', listPrice: 245000, basePrice: 245000, currency: 'TRY', groupName: 'CİHAZLAR', orderIndex: 0 },
                    { name: 'Baymak Lectus 65 Yoğuşmalı Kazan', brand: 'Baymak', model: 'Lectus 65', quantity: 1, unit: 'Adet', listPrice: 85000, basePrice: 85000, currency: 'TRY', groupName: 'CİHAZLAR', orderIndex: 1 },
                    { name: 'Grundfos MAGNA3 32-120 F Pompa', brand: 'Grundfos', model: 'MAGNA3', quantity: 4, unit: 'Adet', listPrice: 42500, basePrice: 42500, currency: 'TRY', groupName: 'TESİSAT', orderIndex: 2 },
                    { name: 'Danfoss Dinamik Balans Vanası DN50', brand: 'Danfoss', model: 'DN50', quantity: 10, unit: 'Adet', listPrice: 12400, basePrice: 12400, currency: 'TRY', groupName: 'TESİSAT', orderIndex: 3 },
                    { name: 'Wavin Pilsa PPRC Boru DN25', brand: 'Wavin', model: 'PN20', quantity: 500, unit: 'Metre', listPrice: 145, basePrice: 145, currency: 'TRY', groupName: 'TESİSAT', orderIndex: 4 }
                ]
            }
        }
    });

    // 8. Invoice
    await prisma.invoice.create({
        data: {
            type: 'Incoming',
            customerId: createdCustomers[1].id,
            senderName: 'Grundfos Pompa Sanayi',
            invoiceNumber: 'GND202600124',
            invoiceDate: new Date('2026-02-01'),
            totalAmount: 456700,
            currency: 'TRY',
            status: 'Processed',
            items: {
                create: [
                    { name: 'Grundfos MAGNA3 32-120 F', quantity: 10, unitPrice: 38000, totalPrice: 380000, taxRate: 20, taxAmount: 76000 }
                ]
            }
        }
    });

    // 9. Payment
    await prisma.payment.create({
        data: {
            amount: 250000,
            date: new Date('2026-02-10'),
            method: 'Bank Transfer',
            note: 'Proje Hakediş Ödemesi - 1. Etap',
            invoice: {
                create: {
                    type: 'Outgoing',
                    senderName: 'MechQuote Mühendislik',
                    receiverName: createdCustomers[0].name,
                    invoiceNumber: 'SF-2026-0001',
                    invoiceDate: new Date('2026-02-05'),
                    totalAmount: 250000,
                    currency: 'TRY',
                    status: 'Saved'
                }
            }
        }
    });

    // 10. Job Assignment
    await prisma.jobAssignment.create({
        data: {
            proposalId: proposal.id,
            personnelId: createdPersonnel[0].id,
            assignedAmount: 45000,
            notes: 'Kaynak işleri toplam götürü bedeli.',
            paymentStatus: 'Kısmi Ödendi'
        }
    });

    console.log('✅ Simülasyon verileri pırıl pırıl yüklendi!');
}

main()
    .catch((e) => {
        console.error('❌ Hata oluştu:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
