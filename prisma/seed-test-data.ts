import { PrismaClient, ProjeDurumu } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Test verileri yükleme işlemi başlatılıyor...');

    // Verileri temizle (Önce bağımlılıkları sil)
    await prisma.jobAssignment.deleteMany({});
    await prisma.proposalItem.deleteMany({});
    await prisma.supplierQuoteItem.deleteMany({});
    await prisma.supplierQuote.deleteMany({});
    await prisma.proposal.deleteMany({});
    await prisma.projectExpense.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.invoiceItem.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.productAlias.deleteMany({});
    await prisma.recipeItem.deleteMany({});
    await prisma.recipe.deleteMany({});
    await prisma.purchaseHistory.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.customerInteraction.deleteMany({});
    await prisma.customerTransaction.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.personnel.deleteMany({});

    console.log('🧹 Eski veriler temizlendi.');

    // 1. Ürünler
    const products = [
        { name: 'Daikin VRV Dış Ünite', brand: 'Daikin', listPrice: 200000, currency: 'TRY', category: 'Cihaz' },
        { name: 'Grundfos Sirkülasyon Pompası', brand: 'Grundfos', listPrice: 35000, currency: 'TRY', category: 'Pompa' },
        { name: 'ECA Panel Radyatör', brand: 'ECA', listPrice: 2500, currency: 'TRY', category: 'Isıtma' },
        { name: 'Wavin PPRC Boru (Metre)', brand: 'Wavin', listPrice: 120, currency: 'TRY', category: 'Boru' },
        { name: 'Danfoss Balans Vanası', brand: 'Danfoss', listPrice: 8500, currency: 'TRY', category: 'Vana' },
    ];

    const createdProducts = [];
    for (const p of products) {
        const prod = await prisma.product.create({ data: p });
        createdProducts.push(prod);
    }

    // 2. Müşteriler (5 Adet)
    const customerNames = [
        'Anadolu İnşaat Grup',
        'Zirve Gayrimenkul',
        'Kuzey Mühendislik',
        'Ege Yapı Denetim',
        'Marmara Plaza Yönetimi'
    ];

    for (let i = 0; i < customerNames.length; i++) {
        const customer = await prisma.customer.create({
            data: {
                name: customerNames[i],
                email: `iletisim${i + 1}@${customerNames[i].toLowerCase().replace(/ /g, '')}.com`,
                status: 'Aktif',
                balance: 0,
            }
        });

        console.log(`👤 Müşteri eklendi: ${customer.name}`);

        // 3. Her Müşteri için 3 Onaylanmış Teklif
        for (let j = 1; j <= 3; j++) {
            const proposal = await prisma.proposal.create({
                data: {
                    quoteNumber: `TKF-${customer.id.substring(0, 4)}-${j}`,
                    projectName: `${customer.name} - Etap ${j} Mekanik İşler`,
                    customerName: customer.name,
                    customerId: customer.id,
                    status: 'Approved',
                    totalAmount: 500000 * j,
                    exchangeRateUSD: 33.5,
                    exchangeRateEUR: 36.0,
                    items: {
                        create: createdProducts.map((p, idx) => ({
                            name: p.name,
                            brand: p.brand,
                            quantity: (idx + 1) * 2,
                            unit: 'Adet',
                            listPrice: p.listPrice,
                            basePrice: p.listPrice,
                            currency: p.currency,
                            discountRate: 0.15,
                            profitMargin: 0.20,
                            orderIndex: idx
                        }))
                    }
                }
            });

            // 4. Her Onaylanmış Teklif için bir Proje oluştur
            await prisma.project.create({
                data: {
                    name: proposal.projectName,
                    status: 'SOZLESME_ASAMASI',
                    customerId: customer.id,
                    linkedProposalId: proposal.id,
                    contractAmount: proposal.totalAmount,
                    address: 'Test Şantiyesi Adresi',
                }
            });
        }
    }

    console.log('✅ 5 Müşteri ve her birine ait 3 onaylanmış teklif/proje başarıyla oluşturuldu!');
}

main()
    .catch((e) => {
        console.error('❌ Hata:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
