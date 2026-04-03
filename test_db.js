const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.proposal.count();
    console.log("Total proposals:", count);
    const softDeletedCount = await prisma.proposal.count({ where: { isDeleted: true } });
    console.log("Deleted proposals:", softDeletedCount);
    const activeCount = await prisma.proposal.count({ where: { isDeleted: false } });
    console.log("Active proposals:", activeCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
