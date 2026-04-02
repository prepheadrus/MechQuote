const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const personnel = await prisma.personnel.findMany();
    console.log(JSON.stringify(personnel, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
