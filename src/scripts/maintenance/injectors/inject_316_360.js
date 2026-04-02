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
        { code: "7074070050", name: "75*50 PVC Yeni Residence Te Çatal", packaging: "50 Çuval", price: 60.11 },
        { code: "7074070070", name: "75*75 PVC Yeni Residence Te Çatal", packaging: "40 Çuval", price: 65.95 },
        { code: "7074100050", name: "110*50 PVC Yeni Residence Te Çatal", packaging: "20 Çuval", price: 90.63 },
        { code: "7074100070", name: "110*75 PVC Yeni Residence Te Çatal", packaging: "20 Çuval", price: 111.95 },
        { code: "7074100100", name: "110*110 PVC Yeni Residence Te Çatal", packaging: "10 Çuval", price: 155.17 },
        { code: "7074125100", name: "125*110 PVC Yeni Residence Te Çatal", packaging: "8 Çuval", price: 162.56 },
        { code: "7074125125", name: "125*125 PVC Yeni Residence Te Çatal", packaging: "8 Çuval", price: 203.38 },
        { code: "7074150100", name: "160*110 PVC Yeni Residence Te Çatal", packaging: "5 Çuval", price: 256.44 },
        { code: "7074150125", name: "160*125 PVC Yeni Residence Te Çatal", packaging: "5 Çuval", price: 326.57 },
        { code: "7074150150", name: "160*160 PVC Yeni Residence Te Çatal", packaging: "4 Çuval", price: 403.51 },
        { code: "7075050050", name: "50*50 PVC Yeni Residence Çift Çatal", packaging: "50 Çuval", price: 82.39 },
        { code: "7075070050", name: "75*50 PVC Yeni Residence Çift Çatal", packaging: "30 Çuval", price: 110.53 },
        { code: "7075070070", name: "75*75 PVC Yeni Residence Çift Çatal", packaging: "25 Çuval", price: 146.68 },
        { code: "7075100050", name: "110*50 PVC Yeni Residence Çift Çatal", packaging: "10 Çuval", price: 181.68 },
        { code: "7075100070", name: "110*75 PVC Yeni Residence Çift Çatal", packaging: "10 Çuval", price: 189.05 },
        { code: "7075100100", name: "110*110 PVC Yeni Residence Çift Çatal", packaging: "10 Çuval", price: 215.06 },
        { code: "7075125100", name: "125*110 PVC Yeni Residence Çift Çatal", packaging: "6 Çuval", price: 229.31 },
        { code: "7076007050", name: "50 mm PVC Yeni Residence Kayar Manşon", packaging: "75 Çuval", price: 16.46 },
        { code: "7076007070", name: "75 mm PVC Yeni Residence Kayar Manşon", packaging: "40 Çuval", price: 28.82 },
        { code: "7076007100", name: "100 mm PVC Yeni Residence Kayar Manşon", packaging: "15 Çuval", price: 44.54 },
        { code: "7076007125", name: "125 mm PVC Yeni Residence Kayar Manşon", packaging: "25 Çuval", price: 88.33 },
        { code: "7076007150", name: "160 mm PVC Yeni Residence Kayar Manşon", packaging: "12 Çuval", price: 162.74 },
        { code: "7076001070", name: "75 mm PVC Yeni Residence Temizleme TE", packaging: "40 Çuval", price: 164.46 },
        { code: "7076001100", name: "110 mm PVC Yeni Residence Temizleme TE", packaging: "10 Çuval", price: 380.72 },
        { code: "7076001125", name: "125 mm PVC Yeni Residence Temizleme TE", packaging: "8 Çuval", price: 504.14 },
        { code: "7076001150", name: "160 mm PVC Yeni Residence Temizleme TE", packaging: "3 Çuval", price: 533.76 },
        { code: "7076004050", name: "50 mm PVC Yeni Residence Körtapa", packaging: "450 Çuval", price: 11.02 },
        { code: "7076004070", name: "75 mm PVC Yeni Residence Körtapa", packaging: "150 Çuval", price: 20.90 },
        { code: "7076004100", name: "110 mm PVC Yeni Residence Körtapa", packaging: "65 Çuval", price: 26.46 },
        { code: "7076004125", name: "125 mm PVC Yeni Residence Körtapa", packaging: "50 Çuval", price: 34.86 },
        { code: "7076004150", name: "150 mm PVC Yeni Residence Körtapa", packaging: "25 Çuval", price: 58.45 },
        { code: "7076003100", name: "110 mm PVC Yeni Residence ES Sifon", packaging: "8 Çuval", price: 143.18 },
        { code: "8171050050", name: "50 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "50 Koli", price: 48.66 },
        { code: "8171050075", name: "75 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "30 Koli", price: 77.37 },
        { code: "8171050110", name: "110 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "16 Koli", price: 93.09 },
        { code: "8171050125", name: "125 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "12 Koli", price: 137.31 },
        { code: "8171050160", name: "160 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "10 Koli", price: 156.84 },
        { code: "8171050200", name: "200 mm Sessiz Boru Kelepçesi (Yatay)", packaging: "6 Koli", price: 181.39 },
        { code: "8171055050", name: "50 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "25 Koli", price: 58.90 },
        { code: "8171055075", name: "75 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "15 Koli", price: 87.62 },
        { code: "8171055110", name: "110 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "8 Koli", price: 103.32 },
        { code: "8171055125", name: "125 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "6 Koli", price: 147.60 },
        { code: "8171055160", name: "160 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "5 Koli", price: 167.09 },
        { code: "8171055200", name: "200 mm Sessiz Boru Kelepçesi (Dikey)", packaging: "Yok", price: 189.15 },
        { code: "8171060050", name: "50 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "50 Koli", price: 46.85 }
    ];

    console.log('Injecting data (316-360) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const category = item.name.includes('Kelepçe') ? "Tesisat Yardımcı Elemanları" : "PVC Atık Su Ek Parçaları";

            const productData = {
                code: item.code,
                name: item.name,
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Mekanik tesisat ürünü.`,
                category: category,
                brand: "Fırat",
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

    console.log(`Successfully injected ${count} products into the database.`);
    await prisma.$disconnect();
}

main().catch(console.error);
