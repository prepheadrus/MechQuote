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
        { code: "7120000001", name: "80 mm Deliksiz Drenaj", packaging: "100 Kangal", price: 35.31, unit: "Metre" },
        { code: "7120000002", name: "100 mm Deliksiz Drenaj", packaging: "100 Kangal", price: 47.59, unit: "Metre" },
        { code: "7120000003", name: "125 mm Deliksiz Drenaj", packaging: "100 Kangal", price: 66.11, unit: "Metre" },
        { code: "7120000004", name: "160 mm Deliksiz Drenaj", packaging: "50 Kangal", price: 117.56, unit: "Metre" },
        { code: "7120000005", name: "200 mm Deliksiz Drenaj", packaging: "25 Kangal", price: 156.91, unit: "Metre" },
        { code: "7120000011", name: "80 mm Delikli Drenaj", packaging: "100 Kangal", price: 35.31, unit: "Metre" },
        { code: "7120000012", name: "100 mm Delikli Drenaj", packaging: "100 Kangal", price: 47.59, unit: "Metre" },
        { code: "7120000013", name: "125 mm Delikli Drenaj", packaging: "100 Kangal", price: 66.11, unit: "Metre" },
        { code: "7120000014", name: "160 mm Delikli Drenaj", packaging: "50 Kangal", price: 117.56, unit: "Metre" },
        { code: "7120000015", name: "200 mm Delikli Drenaj", packaging: "25 Kangal", price: 156.91, unit: "Metre" },
        { code: "7120001000", name: "100 MM DRENAJ MANŞON", packaging: "50 Kangal", price: 11.29, unit: "Adet" }
    ];

    console.log('Injecting drainage data (665-675) into OneDrive database...');
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
                name: item.name.replace(/\//g, '*'),
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Altyapı drenaj ürünü.`,
                category: "Altyapı ve PE Ürünler",
                brand: "Fırat",
                unit: item.unit,
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

    console.log(`Successfully injected ${count} drainage products.`);
    await prisma.$disconnect();
}

main().catch(console.error);
