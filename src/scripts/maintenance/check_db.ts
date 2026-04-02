
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    const quoteNumber = 'RP-2602-6054425';

    const proposal = await prisma.proposal.findFirst({
        where: { isDeleted: false,  quoteNumber },
        include: { items: { where: { isDeleted: false } } }
    });

    if (!proposal) {
        console.log(`Proposal with quoteNumber ${quoteNumber} not found.`);
    } else {
        console.log(`Proposal found: ${proposal.id}`);
        console.log(`Number of items: ${proposal.items.length}`);
        proposal.items.forEach((item, i) => {
            console.log(`Item ${i + 1}: ${item.name} (Qty: ${item.quantity})`);
        });
    }

    await prisma.$disconnect();
}

main();
