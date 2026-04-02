const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const duplicateId = "44a9d714-d2f3-4ac9-be98-d95d5c1ac2b8";
    console.log(`Deleting personnel with ID: ${duplicateId}`);
    await prisma.personnel.delete({
        where: { id: duplicateId }
    });
    console.log("Delete successful.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
