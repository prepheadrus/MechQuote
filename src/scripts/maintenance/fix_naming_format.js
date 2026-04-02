const { PrismaClient } = require('@prisma/client');

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: 'file:C:/Users/kazar/OneDrive/Desktop/TEKLIF/prisma/dev.db'
            }
        }
    });

    console.log('Fixing technical naming format (/ -> *)...');

    const products = await prisma.product.findMany({
        where: {
            name: {
                contains: '/'
            }
        }
    });

    console.log(`Found ${products.length} products with '/' in their names.`);

    let updateCount = 0;
    for (const product of products) {
        const newName = product.name.replace(/\//g, '*');
        await prisma.product.update({
            where: { id: product.id },
            data: { name: newName }
        });
        updateCount++;
    }

    console.log(`Successfully updated ${updateCount} product names to the standard format (e.g., 75*50).`);
    await prisma.$disconnect();
}

main().catch(console.error);
