import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runBenchmark() {
    console.log('Setting up benchmark data...');

    // Clear existing data
    await prisma.customerTransaction.deleteMany();
    await prisma.customer.deleteMany();

    // Create 1000 customers, each with 5 transactions
    const customersToCreate = Array.from({ length: 1000 }).map((_, i) => ({
        id: `cust-${i}`,
        name: `Customer ${i}`,
        balance: 0,
    }));

    await prisma.customer.createMany({ data: customersToCreate });

    const transactionsToCreate = customersToCreate.flatMap((c) =>
        Array.from({ length: 5 }).map((_, i) => ({
            customerId: c.id,
            amount: 10 + i,
            type: 'PAYMENT',
            date: new Date(),
        }))
    );

    // Need to insert in batches because of potential payload size limits
    const chunkSize = 1000;
    for (let i = 0; i < transactionsToCreate.length; i += chunkSize) {
        await prisma.customerTransaction.createMany({
            data: transactionsToCreate.slice(i, i + chunkSize)
        });
    }

    console.log('Data setup complete.');

    console.log('Running unoptimized reconciliation (N+1)...');
    const startUnoptimized = Date.now();

    await prisma.$transaction(async (tx) => {
        const allCustomers = await tx.customer.findMany({ select: { id: true } });
        for (const customer of allCustomers) {
            const transactions = await tx.customerTransaction.findMany({
                where: { customerId: customer.id },
                select: { amount: true }
            });

            if (transactions.length > 0) {
                const newBalance = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
                await tx.customer.update({
                    where: { id: customer.id },
                    data: { balance: newBalance }
                });
            }
        }
    });

    const endUnoptimized = Date.now();
    console.log(`Unoptimized time: ${endUnoptimized - startUnoptimized}ms`);

    // Reset balances to 0
    await prisma.customer.updateMany({ data: { balance: 0 } });

    console.log('Running optimized reconciliation (groupBy)...');
    const startOptimized = Date.now();

    await prisma.$transaction(async (tx) => {
        const transactionSums = await tx.customerTransaction.groupBy({
            by: ['customerId'],
            _sum: {
                amount: true,
            },
        });

        // Since Prisma doesn't have an updateMany with different values per row,
        // we map it to individual promises, but run them in parallel (Promise.all)
        // or loop. If we run them in parallel it's faster, but we should see what's best.

        // Approach A: Promise.all
        await Promise.all(
            transactionSums.map((ts) => {
                if (ts.customerId && ts._sum.amount !== null) {
                    return tx.customer.update({
                        where: { id: ts.customerId },
                        data: { balance: ts._sum.amount },
                    });
                }
                return Promise.resolve();
            })
        );
    });

    const endOptimized = Date.now();
    console.log(`Optimized time: ${endOptimized - startOptimized}ms`);

    // Cleanup
    await prisma.customerTransaction.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.$disconnect();
}

runBenchmark().catch(console.error);
