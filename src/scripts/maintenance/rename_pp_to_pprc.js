const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'file:C:/Users/kazar/OneDrive/Desktop/TEKLIF/prisma/dev.db'
            }
        }
    });

    console.log('Renaming PP to PPRC in product names...');

    const products = await prisma.product.findMany({
        where: {
            category: "PPRC Boru ve Ek Parçalar",
            name: {
                contains: 'PP'
            }
        }
    });

    console.log(`Found ${products.length} PPRC products to update.`);

    let updateCount = 0;
    for (const product of products) {
        // Replace "PP" with "PPRC", ensuring we don't double up if it's already PPRC
        const newName = product.name.replace(/\bPP\b/g, 'PPRC');
        
        if (newName !== product.name) {
            await prisma.product.update({
                where: { id: product.id },
                data: { name: newName }
            });
            updateCount++;
        }
    }

    console.log(`Successfully updated ${updateCount} product names (PP -> PPRC).`);
    await prisma.$disconnect();
}

main().catch(console.error);
