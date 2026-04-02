
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const customerName = 'Mehmet Çakıl';
    try {
        const proposals = await prisma.proposal.findMany({
            where: { customerName },
            include: { items: true },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Found ${proposals.length} proposals for ${customerName}`);
        proposals.forEach((p, idx) => {
            console.log(`${idx}: ID=${p.id}, QuoteNum=${p.quoteNumber}, Version=${p.version}, Items=${p.items.length}, Created=${p.createdAt}`);
        });
    } catch (err) {
        console.log('ERROR: ' + err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
