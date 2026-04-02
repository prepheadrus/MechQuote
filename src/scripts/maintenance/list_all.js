
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const proposals = await prisma.proposal.findMany({
            include: { _count: { select: { items: true } } },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${proposals.length} proposals total`);
        proposals.forEach((p, idx) => {
            console.log(`${idx}: ID=${p.id}, QN=${p.quoteNumber}, V=${p.version}, Items=${p._count.items}, Created=${p.createdAt}, Customer=${p.customerName}`);
        });
    } catch (err) {
        console.log('ERROR: ' + err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
