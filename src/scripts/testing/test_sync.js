
const { logger } = require('@/lib/logger');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateProposalItems(proposalId, items) {
    try {
        logger.info(`Deleting items for ${proposalId}`);
        await prisma.proposalItem.deleteMany({ where: { proposalId } });

        logger.info(`Creating ${items.length} items`);
        await prisma.proposalItem.createMany({
            data: items.map(item => ({
                ...item,
                proposalId
            }))
        });
        logger.info('Success');
        return { success: true };
    } catch (error) {
        logger.error('Error:', error);
        return { success: false, error: error.message };
    }
}

async function main() {
    const propId = 'cf1e6c23-d3ef-4c56-8027-14d19e0b6ca4';
    const dummyItem = {
        name: 'Test Item',
        brand: 'Test Brand',
        model: 'Test Model',
        quantity: 1,
        unit: 'Adet',
        listPrice: 100,
        currency: 'TRY',
        discountRate: 0.1,
        profitMargin: 0.2,
        groupName: 'Genel',
        basePrice: 90,
        vatRate: 0.2,
        priceIncludesVat: false,
        orderIndex: 0
    };

    await updateProposalItems(propId, [dummyItem]);
    await prisma.$disconnect();
}

main();
