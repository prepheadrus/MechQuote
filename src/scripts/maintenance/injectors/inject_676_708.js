const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'file:C:/Users/kazar/OneDrive/Desktop/TEKLIF/prisma/dev.db'
            }
        }
    });

    const data = [
        { code: "7040150401", name: "150* lik Köşeli Çatı Oluğu (4 mt)", packaging: "5 Adet", price: 390.27 },
        { code: "7042140001", name: "Köşeli Çatı Oluğu Manşon", packaging: "40 Çuval", price: 48.76 },
        { code: "7042140002", name: "Köşeli Çatı Oluğu Manşet Köşeli", packaging: "18 Çuval", price: 65.86 },
        { code: "7042140003", name: "Köşeli Çatı Oluğu Manşet İniş Yuvarlak", packaging: "18 Çuval", price: 62.38 },
        { code: "7042140004", name: "Köşeli Çatı Oluğu 90* İç-Dış Dirsek", packaging: "24 Çuval", price: 67.20 },
        { code: "7042140005", name: "Köşeli Çatı Oluğu Körtapa", packaging: "120 Çuval", price: 15.21 },
        { code: "7042140006", name: "Köşeli Çatı Oluğu 45* İniş Dirsek", packaging: "55 Çuval", price: 28.81 },
        { code: "7042140007", name: "Köşeli Çatı Oluğu 45* Tek Çatal", packaging: "30 Çuval", price: 52.87 },
        { code: "70K1015005", name: "Köşeli Çatı Oluğu Çift Çatal", packaging: "30 Çuval", price: 144.92 },
        { code: "7041150300", name: "Köşeli Çatı Oluğu İniş Profili", packaging: "5 Bağ", price: 283.56 },
        { code: "7042140008", name: "Köşeli Çatı Oluğu İniş Manşon", packaging: "50 Çuval", price: 28.83 },
        { code: "7042140009", name: "Köşeli Çatı Oluğu Profil İniş Kelepçe", packaging: "80 Koli", price: 11.64 },
        { code: "7042140015", name: "Köşeli Çatı Oluğu 150*110 İniş Redüksiyon", packaging: "50 Çuval", price: 36.44 },
        { code: "7042140014", name: "Köşeli Çatı Oluğu 150*70 İniş Redüksiyon", packaging: "70 Çuval", price: 27.88 },
        { code: "7042140016", name: "Köşeli Çatı Oluğu 150*110 İniş Redüksiyon - Muflu - YENİ", packaging: "50 Çuval", price: 36.68 },
        { code: "7042140017", name: "Köşeli Çatı Oluğu 150*70 İniş Redüksiyon - Muflu - YENİ", packaging: "70 Çuval", price: 28.38 },
        { code: "7042140010", name: "Köşeli Çatı Oluğu 150*100 Manşet Yuvarlak İniş", packaging: "18 Çuval", price: 83.62 },
        { code: "7042140011", name: "Köşeli Çatı Oluğu Dere Kelepçe", packaging: "100 Çuval", price: 20.28 },
        { code: "7042140012", name: "Köşeli Çatı Oluğu 90* İniş Dirsek", packaging: "35 Çuval", price: 40.67 },
        { code: "7042140013", name: "Köşeli Çatı Oluğu Kilitli Profil İniş Kelepçesi", packaging: "120 Koli", price: 15.47 },
        { code: "7040078400", name: "Dekoratif Çatı Oluğu (4 mt)", packaging: "5 Adet", price: 352.79 },
        { code: "7042100006", name: "Dekoratif Çatı Oluğu Manşon", packaging: "50 Çuval", price: 34.08 },
        { code: "7042100007", name: "Dekoratif Çatı Oluğu 90* Dirsek", packaging: "25 Çuval", price: 55.50 },
        { code: "7042100013", name: "Dekoratif Çatı Oluğu İniş Dirsek 135*", packaging: "40 Çuval", price: 35.94 },
        { code: "7042100008", name: "Dekoratif Çatı Oluğu Manşet TE Köşeli", packaging: "25 Çuval", price: 57.02 },
        { code: "7042100009", name: "Dekoratif Çatı Oluğu Manşet TE Yuvarlak", packaging: "25 Çuval", price: 57.16 },
        { code: "7042100014", name: "Dekoratif Çatı Oluğu İniş Profili Çatal 45*", packaging: "25 Çuval", price: 47.28 },
        { code: "7042125006", name: "Dekoratif Çatı Oluğu Körtapa", packaging: "120 Çuval", price: 20.78 },
        { code: "7042100012", name: "Dekoratif Çatı Oluğu İniş Profil Manşon", packaging: "70 Çuval", price: 24.03 },
        { code: "7041078300", name: "Dekoratif Çatı Oluğu İniş Profili", packaging: "6 Bağ", price: 288.72 },
        { code: "7042100011", name: "Dekoratif Çatı Oluğu Dere Kelepçe", packaging: "250 Çuval", price: 9.44 },
        { code: "7042100010", name: "Dekoratif Çatı Oluğu Profil Kelepçe", packaging: "100 Koli", price: 8.32 },
        { code: "7042100015", name: "Dekoratif Çatı Oluğu 90* İniş Dirsek", packaging: "40 Çuval", price: 38.15 }
    ];

    console.log('Injecting roof gutter data (676-708) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const model = item.name.includes('Köşeli') ? "Köşeli" : "Dekoratif";

            const productData = {
                code: item.code,
                name: item.name.replace(/\//g, '*'),
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Çatı oluğu ve ek parçası.`,
                category: "Yağmur Oluğu ve Ek Parçaları",
                brand: "Fırat",
                model: model,
                unit: "Adet",
                currency: "TRY",
                vatRate: 0.20,
                priceIncludesVat: false
            };

            if (existing) {
                await prisma.product.update({
                    where: { id: existing.id },
                    data: productData
                });
            } else {
                await prisma.product.create({
                    data: productData
                });
            }
            count++;
        } catch (e) {
            console.error(`Error with code ${item.code}:`, e.message);
        }
    }

    console.log(`Successfully injected ${count} roof gutter products.`);
    await prisma.$disconnect();
}

main().catch(console.error);
