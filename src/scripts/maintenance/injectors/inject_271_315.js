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
        { code: "7052150200", name: "160*2000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 648.15 },
        { code: "7052150300", name: "160*3000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 954.70 },
        { code: "7052150600", name: "160*6000 PVC Yeni Residence Boru 5.0 mm", packaging: "1 Ad.", price: 2004.53 },
        { code: "7052200050", name: "200*500 PVC Yeni Residence Boru 5.0 mm", packaging: "6 Bağ", price: 284.45 },
        { code: "7052200100", name: "200*1000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 521.37 },
        { code: "7052200200", name: "200*2000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 995.19 },
        { code: "7052200300", name: "200*3000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 1468.99 },
        { code: "7071050045", name: "50*45 PVC Yeni Residence Açık Dirsek", packaging: "200 Çuval", price: 25.24 },
        { code: "7071070045", name: "75*45 PVC Yeni Residence Açık Dirsek", packaging: "80 Çuval", price: 36.06 },
        { code: "7071100045", name: "110*45 PVC Yeni Residence Açık Dirsek", packaging: "30 Çuval", price: 69.02 },
        { code: "7071125045", name: "125*45 PVC Yeni Residence Açık Dirsek", packaging: "20 Çuval", price: 102.50 },
        { code: "7071150045", name: "160*45 PVC Yeni Residence Açık Dirsek", packaging: "10 Çuval", price: 190.89 },
        { code: "7071200045", name: "200*45 PVC Yeni Residence Açık Dirsek", packaging: "8 Çuval", price: 304.14 },
        { code: "7071050087", name: "50*87 PVC Yeni Residence Kapalı Dirsek", packaging: "150 Çuval", price: 28.10 },
        { code: "7071070087", name: "75*87 PVC Yeni Residence Kapalı Dirsek", packaging: "60 Çuval", price: 43.85 },
        { code: "7071100087", name: "110*87 PVC Yeni Residence Kapalı Dirsek", packaging: "25 Çuval", price: 80.61 },
        { code: "7071125087", name: "125*87 PVC Yeni Residence Kapalı Dirsek", packaging: "18 Çuval", price: 134.34 },
        { code: "7071150087", name: "160*87 PVC Yeni Residence Kapalı Dirsek", packaging: "8 Çuval", price: 228.61 },
        { code: "7071200087", name: "200*87 PVC Yeni Residence Kapalı Dirsek", packaging: "6 Çuval", price: 401.91 },
        { code: "7072070050", name: "75*50 PVC Yeni Residence Redüksiyon", packaging: "125 Çuval", price: 39.23 },
        { code: "7072100050", name: "110*50 PVC Yeni Residence Redüksiyon", packaging: "50 Çuval", price: 62.43 },
        { code: "7072100070", name: "110*75 PVC Yeni Residence Redüksiyon", packaging: "50 Çuval", price: 70.37 },
        { code: "7072125070", name: "125*75 PVC Yeni Residence Redüksiyon", packaging: "35 Çuval", price: 77.71 },
        { code: "7072125100", name: "125*110 PVC Yeni Residence Redüksiyon", packaging: "25 Çuval", price: 118.61 },
        { code: "7072150100", name: "160*110 PVC Yeni Residence Redüksiyon", packaging: "20 Çuval", price: 142.71 },
        { code: "7072150125", name: "160*125 PVC Yeni Residence Redüksiyon", packaging: "20 Çuval", price: 155.17 },
        { code: "70K6220012", name: "200*125 RES. REDÜKSİYON", packaging: "12 Çuval", price: 211.45 },
        { code: "7073050050", name: "50*50 PVC Yeni Residence Tek Çatal", packaging: "75 Çuval", price: 52.18 },
        { code: "7073070050", name: "75*50 PVC Yeni Residence Tek Çatal", packaging: "50 Çuval", price: 69.02 },
        { code: "7073070070", name: "75*75 PVC Yeni Residence Tek Çatal", packaging: "30 Çuval", price: 83.99 },
        { code: "7073100050", name: "110*50 PVC Yeni Residence Tek Çatal", packaging: "20 Çuval", price: 100.75 },
        { code: "7073100070", name: "110*75 PVC Yeni Residence Tek Çatal", packaging: "20 Çuval", price: 115.77 },
        { code: "7073100100", name: "110*110 PVC Yeni Residence Tek Çatal", packaging: "10 Çuval", price: 179.71 },
        { code: "7073125050", name: "125*50 PVC Yeni Residence Tek Çatal", packaging: "10 Çuval", price: 156.23 },
        { code: "7073125070", name: "125*75 PVC Yeni Residence Tek Çatal", packaging: "10 Çuval", price: 176.13 },
        { code: "7073125100", name: "125*110 PVC Yeni Residence Tek Çatal", packaging: "8 Çuval", price: 188.63 },
        { code: "7073125125", name: "125*125 PVC Yeni Residence Tek Çatal", packaging: "8 Çuval", price: 295.44 },
        { code: "7073150100", name: "160*110 PVC Yeni Residence Tek Çatal", packaging: "5 Çuval", price: 330.12 },
        { code: "7073150125", name: "160*125 PVC Yeni Residence Tek Çatal", packaging: "5 Çuval", price: 358.10 },
        { code: "7073150150", name: "160*160 PVC Yeni Residence Tek Çatal", packaging: "4 Çuval", price: 393.91 },
        { code: "7073200100", name: "200*110 PVC Yeni Residence Tek Çatal", packaging: "4 Çuval", price: 446.54 },
        { code: "70K6320012", name: "200*125 PVC Yeni Residence Tek Çatal", packaging: "4 Çuval", price: 552.78 },
        { code: "7073200150", name: "200*160 PVC Yeni Residence Tek Çatal", packaging: "3 Çuval", price: 595.34 },
        { code: "7073200200", name: "200*200 PVC Yeni Residence Tek Çatal", packaging: "3 Çuval", price: 744.18 },
        { code: "7074050050", name: "50*50 PVC Yeni Residence Te Çatal", packaging: "90 Çuval", price: 24.74 }
    ];

    console.log('Injecting data (271-315) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const category = item.name.includes('Boru') ? "PVC Atık Su Boruları" : "PVC Atık Su Ek Parçaları";

            const productData = {
                code: item.code,
                name: item.name,
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Mekanik tesisat ürünü.`,
                category: category,
                brand: "Fırat",
                model: "Yeni Residence",
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
