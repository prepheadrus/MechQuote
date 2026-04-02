
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const quoteNumber = 'RP-2602-6054425';
    try {
        const proposals = await prisma.proposal.findMany({
            where: { quoteNumber },
            include: { items: true },
            orderBy: { version: 'desc' }
        });

        if (proposals.length === 0) {
            console.log('RESULTS: NOT_FOUND');
        } else {
            console.log('RESULTS: FOUND');
            console.log('COUNT: ' + proposals.length);
            proposals.forEach((p, idx) => {
                console.log(`PROPOSAL_${idx}: ID=${p.id}, VERSION=${p.version}, ITEMS=${p.items.length}`);
            });
        }
    } catch (err) {
        console.log('ERROR: ' + err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
