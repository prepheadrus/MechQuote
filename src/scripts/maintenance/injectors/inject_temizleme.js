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
        { code: "70K0520010", name: "200/110 PVC Çift Çatal", packaging: "4 Bağ", price: 720.08 },
        { code: "70K0520012", name: "200/125 PVC Çift Çatal", packaging: "4 Bağ", price: 1026.22 },
        { code: "70K0520015", name: "200/150 PVC Çift Çatal", packaging: "3 Bağ", price: 1207.60 },
        { code: "70K0520020", name: "200/200 PVC Çift Çatal", packaging: "3 Bağ", price: 1727.27 },
        { code: "70K0525025", name: "250/250 PVC Çift Çatal", packaging: "2 Bağ", price: 2293.69 },
        { code: "7012070050", name: "75/50 PVC Redüksiyon", packaging: "125 Çuval", price: 18.79 },
        { code: "7012100050", name: "110/50 PVC Redüksiyon", packaging: "50 Çuval", price: 30.15 },
        { code: "7012100070", name: "110/75 PVC Redüksiyon", packaging: "40 Çuval", price: 31.59 },
        { code: "7012125070", name: "125/75 PVC Redüksiyon", packaging: "35 Çuval", price: 57.25 },
        { code: "7012125100", name: "125/110 PVC Redüksiyon", packaging: "25 Çuval", price: 58.16 },
        { code: "7012150100", name: "160/110 PVC Redüksiyon", packaging: "20 Çuval", price: 105.98 },
        { code: "7012150125", name: "160/125 PVC Redüksiyon", packaging: "20 Çuval", price: 124.37 },
        { code: "7012200100", name: "200/110 PVC Redüksiyon", packaging: "14 Çuval", price: 307.24 },
        { code: "70K0220012", name: "200/125 PVC Redüksiyon", packaging: "14 Çuval", price: 387.11 },
        { code: "7012200150", name: "200/160 PVC Redüksiyon", packaging: "12 Çuval", price: 269.64 },
        { code: "7012250200", name: "250/200 PVC Redüksiyon", packaging: "6 Çuval", price: 728.14 },
        { code: "70K0231520", name: "315/200 PVC Redüksiyon", packaging: "4 Çuval", price: 3051.31 },
        { code: "70K0231525", name: "315/250 PVC Redüksiyon", packaging: "4 Çuval", price: 3286.07 },
        { code: "7016007050", name: "50 mm PVC Kayar Manşon", packaging: "150 Çuval", price: 17.27 },
        { code: "7016007070", name: "75 mm PVC Kayar Manşon", packaging: "75 Çuval", price: 27.43 },
        { code: "7016007100", name: "110 mm PVC Kayar Manşon", packaging: "30 Çuval", price: 49.31 },
        { code: "7016007125", name: "125 mm PVC Kayar Manşon", packaging: "25 Bağ", price: 82.21 },
        { code: "7016007150", name: "160 mm PVC Kayar Manşon", packaging: "12 Bağ", price: 148.95 },
        { code: "7016006200", name: "200 mm PVC Kayar Manşon", packaging: "1 Adet", price: 335.07 },
        { code: "7016006250", name: "250 mm PVC Kayar Manşon", packaging: "1 Adet", price: 549.79 },
        { code: "7016006315", name: "315 mm PVC Kayar Manşon", packaging: "1 Adet", price: 706.59 },
        { code: "7016001070", name: "75 mm PVC Temizleme", packaging: "40 Çuval", price: 55.39 },
        { code: "7016001100", name: "110 mm PVC Temizleme", packaging: "10 Bağ", price: 106.95 },
        { code: "7016001125", name: "125 mm PVC Temizleme", packaging: "10 Bağ", price: 193.49 },
        { code: "7016001150", name: "160 mm PVC Temizleme", packaging: "8 Bağ", price: 337.32 },
        { code: "7016001200", name: "200 mm PVC Temizleme", packaging: "6 Bağ", price: 613.47 },
        { code: "70K0625000", name: "250 mm PVC Temizleme", packaging: "4 Bağ", price: 1145.68 },
        { code: "70K0631500", name: "315 mm PVC Temizleme", packaging: "3 Bağ", price: 1757.29 },
        { code: "7016001110", name: "110/87 PVC Temizleme Dirsek", packaging: "15 Çuval", price: 95.99 },
        { code: "7016005050", name: "50 mm PVC Kelepçe", packaging: "250 Koli", price: 5.95 },
        { code: "7016005070", name: "75 mm PVC Kelepçe", packaging: "150 Koli", price: 9.83 },
        { code: "7016005100", name: "110 mm PVC Kelepçe", packaging: "75 Koli", price: 18.03 },
        { code: "7016005125", name: "125 mm PVC Kelepçe", packaging: "70 Çuval", price: 31.84 },
        { code: "7016005150", name: "160 mm PVC Kelepçe", packaging: "50 Çuval", price: 62.86 },
        { code: "7016004050", name: "50 mm PVC Körtapa", packaging: "900 Çuval", price: 8.93 },
        { code: "7016004070", name: "75 mm PVC Körtapa", packaging: "300 Çuval", price: 16.06 },
        { code: "7016004100", name: "110 mm PVC Körtapa", packaging: "130 Çuval", price: 21.83 },
        { code: "7016004125", name: "125 mm PVC Körtapa", packaging: "100 Çuval", price: 36.15 },
        { code: "7016004150", name: "160 mm PVC Körtapa", packaging: "50 Çuval", price: 73.47 },
        { code: "7016004200", name: "200 mm PVC Körtapa", packaging: "30 Çuval", price: 157.58 }
    ];

    console.log('Injecting data into OneDrive database...');
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
                description: `Ambalaj: ${item.packaging} | Mekanik tesisat ürünü.`,
                category: item.name.includes('Temizleme') ? "PVC Temizleme Grubu" : "PVC Atık Su Ek Parçaları",
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

    console.log(`Successfully injected ${count} products into the OneDrive database.`);
    await prisma.$disconnect();
}

main().catch(console.error);
