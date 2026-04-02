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
        { code: "70K0707000", name: "75 mm PVC Havalandırma Bacası", packaging: "30 Bağ", price: 151.92 },
        { code: "70K0710000", name: "110 mm PVC Havalandırma Bacası", packaging: "20 Bağ", price: 175.90 },
        { code: "7016008100", name: "110 mm PVC Tamir Borusu", packaging: "15 Çuval", price: 113.57 },
        { code: "7016002100", name: "110 mm PVC KADA", packaging: "48 Çuval", price: 77.51 },
        { code: "7016002145", name: "75 mm PVC ES Sifon 75/45", packaging: "25 Çuval", price: 121.47 },
        { code: "7016002175", name: "75 mm PVC ES Sifon 75/87", packaging: "25 Çuval", price: 122.64 },
        { code: "7016003100", name: "110 mm PVC ES Sifon", packaging: "8 Çuval", price: 140.18 },
        { code: "7017000100", name: "110 mm PVC Muflu ES Sifon", packaging: "15 Çuval", price: 158.36 },
        { code: "7800005200", name: "50 mm Adaptör Conta", packaging: "300 Çuval", price: 7.63 },
        { code: "2001001050", name: "50 mm PVC Atık Su Conta", packaging: "2000 Adet", price: 1.85 },
        { code: "2001001070", name: "75 mm PVC Atık Su Conta", packaging: "1500 Adet", price: 2.16 },
        { code: "2001001100", name: "110 mm PVC Atık Su Conta", packaging: "900 Adet", price: 3.42 },
        { code: "2001001125", name: "125 mm PVC Atık Su Conta", packaging: "500 Adet", price: 4.59 },
        { code: "2001001150", name: "160 mm PVC Atık Su Conta", packaging: "300 Adet", price: 6.92 },
        { code: "2001001200", name: "200 mm PVC Atık Su Conta", packaging: "200 Adet", price: 11.73 },
        { code: "2001001250", name: "250 mm PVC Atık Su Conta", packaging: "100 Adet", price: 21.50 },
        { code: "7800090050", name: "50 MM RİNGSİZ CONTA (SİYAH)", packaging: "1500 Adet", price: 1.82 },
        { code: "7800090070", name: "70 MM RİNGSİZ CONTA (SİYAH)", packaging: "1000 Adet", price: 2.34 },
        { code: "7800090100", name: "100 MM RİNGSİZ CONTA (SİYAH)", packaging: "500 Adet", price: 3.85 },
        { code: "7800090052", name: "50 mm PVC Atık Su Conta", packaging: "2000 Adet", price: 1.82 },
        { code: "7800090127", name: "75 mm PVC Atık Su Conta", packaging: "1500 Adet", price: 2.79 },
        { code: "7800090126", name: "110 mm PVC Atık Su Conta", packaging: "900 Adet", price: 4.82 },
        { code: "7800090125", name: "125 mm PVC Atık Su Conta", packaging: "500 Adet", price: 7.58 },
        { code: "7054050015", name: "50/150 PVC Residence II Boru 3.0 mm", packaging: "50 Çuval", price: 24.13 },
        { code: "7054050025", name: "50/250 PVC Residence II Boru 3.0 mm", packaging: "40 Çuval", price: 30.71 },
        { code: "7054050050", name: "50/500 PVC Residence II Boru 3.0 mm", packaging: "20 Bağ", price: 44.28 },
        { code: "7054050100", name: "50/1000 PVC Residence II Boru 3.0 mm", packaging: "10 Bağ", price: 82.09 },
        { code: "7054050200", name: "50/2000 PVC Residence II Boru 3.0 mm", packaging: "6 Bağ", price: 156.18 },
        { code: "7054050300", name: "50/3000 PVC Residence II Boru 3.0 mm", packaging: "6 Bağ", price: 230.25 },
        { code: "7054050600", name: "50/6000 PVC Residence II Boru 3.0 mm", packaging: "1 Adet", price: 453.93 },
        { code: "7054070015", name: "75/150 PVC Residence II Boru 3.0 mm", packaging: "30 Çuval", price: 31.90 },
        { code: "7054070025", name: "75/250 PVC Residence II Boru 3.0 mm", packaging: "20 Çuval", price: 42.02 },
        { code: "7054070050", name: "75/500 PVC Residence II Boru 3.0 mm", packaging: "6 Bağ", price: 62.98 },
        { code: "7054070100", name: "75/1000 PVC Residence II Boru 3.0 mm", packaging: "3 Bağ", price: 117.03 },
        { code: "7054070200", name: "75/2000 PVC Residence II Boru 3.0 mm", packaging: "3 Bağ", price: 199.93 },
        { code: "7054070300", name: "75/3000 PVC Residence II Boru 3.0 mm", packaging: "3 Bağ", price: 297.18 },
        { code: "7054070600", name: "75/6000 PVC Residence II Boru 3.0 mm", packaging: "1 Ad.", price: 583.51 },
        { code: "7054100015", name: "110/150 PVC Residence II Boru 3.5 mm", packaging: "15 Çuval", price: 49.01 },
        { code: "7054100025", name: "110/250 PVC Residence II Boru 3.5 mm", packaging: "10 Çuval", price: 69.30 },
        { code: "7054100050", name: "110/500 PVC Residence II Boru 3.5 mm", packaging: "6 Bağ", price: 100.95 },
        { code: "7054100100", name: "110/1000 PVC Residence II Boru 3.5 mm", packaging: "3 Bağ", price: 167.95 },
        { code: "7054100200", name: "110/2000 PVC Residence II Boru 3.5 mm", packaging: "3 Bağ", price: 322.94 },
        { code: "7054100300", name: "110/3000 PVC Residence II Boru 3.5 mm", packaging: "3 Bağ", price: 476.35 },
        { code: "7054100600", name: "110/6000 PVC Residence II Boru 3.5 mm", packaging: "1 Ad.", price: 942.84 },
        { code: "7054125015", name: "125/150 PVC Residence II Boru 3.6 mm", packaging: "10 Bağ", price: 63.20 }
    ];

    console.log('Injecting data (181-225) into OneDrive database...');
    let count = 0;

    for (const item of data) {
        try {
            const listPrice = item.price;
            const discountRate = 0.23;
            const basePrice = listPrice * (1 - discountRate);

            const existing = await prisma.product.findFirst({
                where: { code: item.code }
            });

            const category = item.name.includes('Boru') ? "PVC Atık Su Boruları" : 
                            (item.name.includes('Conta') ? "Tesisat Yardımcı Elemanları" : "PVC Atık Su Ek Parçaları");

            const productData = {
                code: item.code,
                name: item.name,
                listPrice: listPrice,
                basePrice: basePrice,
                discountRate: discountRate,
                description: `Ambalaj: ${item.packaging} | Mekanik tesisat ürünü.`,
                category: category,
                brand: "Fırat",
                unit: item.name.includes('Boru') && item.name.includes('6000') ? "Adet" : "Adet", // Usually sold by piece in these lists
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
