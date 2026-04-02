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
        { code: "7B00023020", name: "20 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "100 Bağ", price: 26.44 },
        { code: "7B00023025", name: "25 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "80 Bağ", price: 38.73 },
        { code: "7B00023032", name: "32 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "40 Bağ", price: 69.97 },
        { code: "7B00023040", name: "40 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "40 Bağ", price: 106.52 },
        { code: "7B00023050", name: "50 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "20 Bağ", price: 168.68 },
        { code: "7B00023063", name: "63 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "20 Bağ", price: 264.34 },
        { code: "7B00023075", name: "75 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "12 PVC", price: 382.72 },
        { code: "7B00023090", name: "90 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "8 Bağ", price: 605.26 },
        { code: "7B00023110", name: "110 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "4 Bağ", price: 904.20 },
        { code: "7B00023126", name: "125 mm PP PN25 Kompozit Boru (Beyaz)", packaging: "4 Bağ", price: 1151.69 },
        { code: "7B00024020", name: "20 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "100 Bağ", price: 22.20 },
        { code: "7B00024025", name: "25 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "80 Bağ", price: 34.00 },
        { code: "7B00024032", name: "32 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "40 Bağ", price: 54.70 },
        { code: "7B00024040", name: "40 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "40 Bağ", price: 85.14 },
        { code: "7B00024050", name: "50 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "20 Bağ", price: 137.60 },
        { code: "7B00024063", name: "63 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "20 Bağ", price: 216.39 },
        { code: "7B00024075", name: "75 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "12 Bağ", price: 310.28 },
        { code: "7B00024090", name: "90 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "8 Bağ", price: 482.31 },
        { code: "7B00024110", name: "110 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "4 Bağ", price: 715.31 },
        { code: "7B00024126", name: "125 mm PP PN20 Kompozit Boru (Beyaz)", packaging: "4 Bağ", price: 908.90 }
    ];

    console.log('Injecting PPRC data (1016-1035) into OneDrive database...');
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
                description: `Ambalaj: ${item.packaging} | PPRC Kompozit Boru (Beyaz).`,
                category: "PPRC Boru ve Ek Parçalar",
                brand: "Fırat",
                unit: "Metre",
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

    console.log(`Successfully injected ${count} PPRC products.`);
    await prisma.$disconnect();
}

main().catch(console.error);
