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
        { code: "8171060075", name: "75 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "30 Koli", price: 74.53 },
        { code: "8171060110", name: "110 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "16 Koli", price: 90.12 },
        { code: "8171060125", name: "125 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "12 Koli", price: 134.32 },
        { code: "8171060160", name: "160 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "10 Koli", price: 153.75 },
        { code: "8171060200", name: "200 mm Sessiz Boru Kelepçesi (Akustik)", packaging: "8 Koli", price: 167.87 },
        { code: "7026050050", name: "50*500 PVC Fırat 1.8 mm Boru", packaging: "20 Bağ", price: 23.40 },
        { code: "7026050100", name: "50*1000 PVC Fırat 1.8 mm Boru", packaging: "10 Bağ", price: 39.19 },
        { code: "7026050200", name: "50*2000 PVC Fırat 1.8 mm Boru", packaging: "10 Bağ", price: 75.73 },
        { code: "7026050300", name: "50*3000 PVC Fırat 1.8 mm Boru", packaging: "10 Bağ", price: 112.68 },
        { code: "7026050600", name: "50*6000 PVC Fırat 1.8 mm Boru", packaging: "1 Adet", price: 220.53 },
        { code: "7026070050", name: "70*500 PVC Fırat 1.8 mm Boru", packaging: "10 Bağ", price: 37.55 },
        { code: "7026070100", name: "70*1000 PVC Fırat 1.8 mm Boru", packaging: "5 Bağ", price: 64.32 },
        { code: "7026070200", name: "70*2000 PVC Fırat 1.8 mm Boru", packaging: "5 Bağ", price: 124.01 },
        { code: "7026070300", name: "70*3000 PVC Fırat 1.8 mm Boru", packaging: "5 Bağ", price: 183.46 },
        { code: "7026070600", name: "70*6000 PVC Fırat 1.8 mm Boru", packaging: "1 Adet", price: 357.97 },
        { code: "7026100050", name: "100*500 PVC Fırat 2.2 mm Boru", packaging: "10 Bağ", price: 62.18 },
        { code: "7026100100", name: "100*1000 PVC Fırat 2.2 mm Boru", packaging: "5 Bağ", price: 102.55 },
        { code: "7026100200", name: "100*2000 PVC Fırat 2.2 mm Boru", packaging: "5 Bağ", price: 198.67 },
        { code: "7026100300", name: "100*3000 PVC Fırat 2.2 mm Boru", packaging: "5 Bağ", price: 293.56 },
        { code: "7026100600", name: "100*6000 PVC Fırat 2.2 mm Boru", packaging: "1 Adet", price: 565.44 },
        { code: "7026125050", name: "125*500 PVC Fırat 2.5 mm Boru", packaging: "10 Bağ", price: 84.99 },
        { code: "7026125100", name: "125*1000 PVC Fırat 2.5 mm Boru", packaging: "5 Bağ", price: 144.44 },
        { code: "7026125200", name: "125*2000 PVC Fırat 2.5 mm Boru", packaging: "5 Bağ", price: 275.50 },
        { code: "7026125300", name: "125*3000 PVC Fırat 2.5 mm Boru", packaging: "5 Bağ", price: 406.31 },
        { code: "7026125600", name: "125*6000 PVC Fırat 2.5 mm Boru", packaging: "1 Adet", price: 793.59 },
        { code: "7026150050", name: "150*500 PVC Fırat 3.2 mm Boru", packaging: "6 Bağ", price: 151.94 },
        { code: "7026150100", name: "150*1000 PVC Fırat 3.2 mm Boru", packaging: "3 Bağ", price: 255.03 },
        { code: "7026150200", name: "150*2000 PVC Fırat 3.2 mm Boru", packaging: "3 Bağ", price: 488.23 },
        { code: "7026150300", name: "150*3000 PVC Fırat 3.2 mm Boru", packaging: "3 Bağ", price: 717.71 },
        { code: "7026150600", name: "150*6000 PVC Fırat 3.2 mm Boru", packaging: "1 Adet", price: 1431.76 },
        { code: "7026200050", name: "200*500 PVC Fırat 3.9 mm Boru", packaging: "2 Bağ", price: 247.36 },
        { code: "7026200100", name: "200*1000 PVC Fırat 3.9 mm Boru", packaging: "1 Adet", price: 408.90 },
        { code: "7026200200", name: "200*2000 PVC Fırat 3.9 mm Boru", packaging: "1 Adet", price: 768.02 },
        { code: "7026200300", name: "200*3000 PVC Fırat 3.9 mm Boru", packaging: "1 Adet", price: 1111.98 },
        { code: "7026200600", name: "200*6000 PVC Fırat 3.9 mm Boru", packaging: "1 Adet", price: 2186.02 },
        { code: "7584100125M", name: "125 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "6", price: 64.51, unit: "Metre" },
        { code: "7584200150M", name: "150 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "6", price: 82.09, unit: "Metre" },
        { code: "7584200200M", name: "200 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "6", price: 132.71, unit: "Metre" },
        { code: "7584100250M", name: "250 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "5.85", price: 230.36, unit: "Metre" },
        { code: "7584200300M", name: "300 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "5.85", price: 275.62, unit: "Metre" },
        { code: "7584100400M", name: "400 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "5.85", price: 511.59, unit: "Metre" },
        { code: "758M4001500", name: "500 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "7", price: 810.70, unit: "Metre" },
        { code: "758M4001600", name: "600 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "7", price: 1128.05, unit: "Metre" },
        { code: "758M4001800", name: "800 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "7", price: 1916.64, unit: "Metre" },
        { code: "758M4001000", name: "1000 mm PE SN4 (Yeni) TRIPLEX Muflu Boru", packaging: "7", price: 3229.79, unit: "Metre" }
    ];

    console.log('Injecting data (361-405) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const category = item.name.includes('PE') ? "Altyapı ve PE Ürünler" : 
                            (item.name.includes('Kelepçe') ? "Tesisat Yardımcı Elemanları" : "PVC Atık Su Boruları");

            const productData = {
                code: item.code,
                name: item.name,
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj/Boy: ${item.packaging} | Mekanik tesisat ürünü.`,
                category: category,
                brand: item.name.includes('TRIPLEX') ? "Triplex" : "Fırat",
                unit: item.unit || "Adet",
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
