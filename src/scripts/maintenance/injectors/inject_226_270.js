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
        { code: "7054125025", name: "125*250 PVC Residence II Boru 3.6 mm", packaging: "10 Bağ", price: 97.89 },
        { code: "7054125050", name: "125*500 PVC Residence II Boru 3.6 mm", packaging: "4 Bağ", price: 141.98 },
        { code: "7054125100", name: "125*1000 PVC Residence II Boru 3.6 mm", packaging: "2 Bağ", price: 220.77 },
        { code: "7054125200", name: "125*2000 PVC Residence II Boru 3.6 mm", packaging: "2 Bağ", price: 422.45 },
        { code: "7054125300", name: "125*3000 PVC Residence II Boru 3.6 mm", packaging: "2 Bağ", price: 624.13 },
        { code: "7054125600", name: "125*6000 PVC Residence II Boru 3.6 mm", packaging: "1 Adet", price: 1229.13 },
        { code: "7054150015", name: "160*150 PVC Residence II Boru 4.3 mm", packaging: "10 Bağ", price: 113.65 },
        { code: "7054150025", name: "160*250 PVC Residence II Boru 4.3 mm", packaging: "10 Bağ", price: 141.98 },
        { code: "7054150050", name: "160*500 PVC Residence II Boru 4.3 mm", packaging: "6 Bağ", price: 189.32 },
        { code: "7054150100", name: "160*1000 PVC Residence II Boru 4.3 mm", packaging: "2 Bağ", price: 319.76 },
        { code: "7054150200", name: "160*2000 PVC Residence II Boru 4.3 mm", packaging: "2 Bağ", price: 575.38 },
        { code: "7054150300", name: "160*3000 PVC Residence II Boru 4.3 mm", packaging: "2 Bağ", price: 846.98 },
        { code: "7054150600", name: "160*6000 PVC Residence II Boru 4.3 mm", packaging: "1 Adet", price: 1661.85 },
        { code: "7052050015", name: "50*150 PVC Yeni Residence Boru 3.6 mm", packaging: "50 Çuval", price: 30.78 },
        { code: "7052050025", name: "50*250 PVC Yeni Residence Boru 3.6 mm", packaging: "40 Çuval", price: 38.78 },
        { code: "7052050050", name: "50*500 PVC Yeni Residence Boru 3.6 mm", packaging: "20 Bağ", price: 53.83 },
        { code: "7052050100", name: "50*1000 PVC Yeni Residence Boru 3.6 mm", packaging: "10 Bağ", price: 97.65 },
        { code: "7052050200", name: "50*2000 PVC Yeni Residence Boru 3.6 mm", packaging: "6 Bağ", price: 180.51 },
        { code: "7052050300", name: "50*3000 PVC Yeni Residence Boru 3.6 mm", packaging: "6 Bağ", price: 252.60 },
        { code: "7052050600", name: "50*6000 PVC Yeni Residence Boru 3.6 mm", packaging: "1 Adet", price: 530.14 },
        { code: "7052070015", name: "75*150 PVC Yeni Residence Boru 3.6 mm", packaging: "30 Çuval", price: 37.84 },
        { code: "7052070025", name: "75*250 PVC Yeni Residence Boru 3.6 mm", packaging: "20 Çuval", price: 50.41 },
        { code: "7052070050", name: "75*500 PVC Yeni Residence Boru 3.6 mm", packaging: "6 Bağ", price: 72.04 },
        { code: "7052070100", name: "75*1000 PVC Yeni Residence Boru 3.6 mm", packaging: "3 Bağ", price: 120.89 },
        { code: "7052070200", name: "75*2000 PVC Yeni Residence Boru 3.6 mm", packaging: "3 Bağ", price: 214.17 },
        { code: "7052070300", name: "75*3000 PVC Yeni Residence Boru 3.6 mm", packaging: "3 Bağ", price: 304.78 },
        { code: "7052070600", name: "75*6000 PVC Yeni Residence Boru 3.6 mm", packaging: "1 Adet", price: 622.20 },
        { code: "7052100015", name: "110*150 PVC Yeni Residence Boru 4.2 mm", packaging: "15 Çuval", price: 54.47 },
        { code: "7052100025", name: "110*250 PVC Yeni Residence Boru 4.2 mm", packaging: "10 Çuval", price: 75.67 },
        { code: "7052100050", name: "110*500 PVC Yeni Residence Boru 4.2 mm", packaging: "6 Bağ", price: 102.00 },
        { code: "7052100100", name: "110*1000 PVC Yeni Residence Boru 4.2 mm", packaging: "3 Bağ", price: 178.84 },
        { code: "7052100200", name: "110*2000 PVC Yeni Residence Boru 4.2 mm", packaging: "3 Bağ", price: 347.31 },
        { code: "7052100300", name: "110*3000 PVC Yeni Residence Boru 4.2 mm", packaging: "3 Bağ", price: 511.61 },
        { code: "7052100600", name: "110*6000 PVC Yeni Residence Boru 4.2 mm", packaging: "1 Adet", price: 1073.88 },
        { code: "7052125015", name: "125*150 PVC Yeni Residence Boru 4.2 mm", packaging: "10 Bağ", price: 75.36 },
        { code: "7052125025", name: "125*250 PVC Yeni Residence Boru 4.2 mm", packaging: "10 Bağ", price: 117.05 },
        { code: "7052125050", name: "125*500 PVC Yeni Residence Boru 4.2 mm", packaging: "4 Bağ", price: 167.10 },
        { code: "7052125100", name: "125*1000 PVC Yeni Residence Boru 4.2 mm", packaging: "2 Bağ", price: 237.74 },
        { code: "7052125200", name: "125*2000 PVC Yeni Residence Boru 4.2 mm", packaging: "2 Bağ", price: 467.29 },
        { code: "7052125300", name: "125*3000 PVC Yeni Residence Boru 4.2 mm", packaging: "2 Bağ", price: 678.65 },
        { code: "7052125600", name: "125*6000 PVC Yeni Residence Boru 4.2 mm", packaging: "1 Adet", price: 1424.78 },
        { code: "7052150015", name: "160*150 PVC Yeni Residence Boru 5.0 mm", packaging: "10 Bağ", price: 133.74 },
        { code: "7052150025", name: "160*250 PVC Yeni Residence Boru 5.0 mm", packaging: "10 Bağ", price: 167.10 },
        { code: "7052150050", name: "160*500 PVC Yeni Residence Boru 5.0 mm", packaging: "6 Bağ", price: 225.98 },
        { code: "7052150100", name: "160*1000 PVC Yeni Residence Boru 5.0 mm", packaging: "2 Bağ", price: 356.12 }
    ];

    console.log('Injecting data (226-270) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const productData = {
                code: item.code,
                name: item.name,
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Mekanik tesisat boru ürünü.`,
                category: "PVC Atık Su Boruları",
                brand: "Fırat",
                model: item.name.includes('Yeni Residence') ? "Yeni Residence" : "Residence II",
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
