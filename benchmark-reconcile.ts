import { prisma } from './src/lib/prisma';
import { reconcileCustomerBalances } from './src/actions/maintenance';

async function seedData() {
  console.log("Cleaning up old data...");
  await prisma.customerTransaction.deleteMany({});
  await prisma.proposalItem.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.customer.deleteMany({});

  console.log("Seeding data...");
  const customers = Array.from({ length: 100 }, (_, i) => ({
    id: `cust_${i}`,
    name: `Customer ${i}`,
    email: `customer${i}@example.com`,
    phone: `555-010${i}`,
    balance: 0,
    isDeleted: false
  }));

  await prisma.customer.createMany({ data: customers });

  const invoices = Array.from({ length: 500 }, (_, i) => {
    const custId = `cust_${Math.floor(Math.random() * 100)}`;
    return {
      id: `inv_${i}`,
      customerId: custId,
      invoiceNumber: `INV-${i}`,
      type: i % 2 === 0 ? 'Outgoing' : 'Incoming',
      status: 'Paid',
      totalAmount: Math.floor(Math.random() * 1000) + 100,
      invoiceDate: new Date(),
      isDeleted: false
    };
  });

  for (const inv of invoices) {
    try {
      await prisma.invoice.create({ data: inv });
    } catch(e) {}
  }

  const proposals = Array.from({ length: 500 }, (_, i) => {
    const custId = `cust_${Math.floor(Math.random() * 100)}`;
    return {
      id: `prop_${i}`,
      customerId: custId,
      customerName: `Customer ${custId.split('_')[1]}`,
      quoteNumber: `PROP-${i}`,
      status: 'Approved',
      totalAmount: Math.floor(Math.random() * 1000) + 100,
      projectName: `Project ${i}`,
      isDeleted: false
    };
  });

  for (const prop of proposals) {
    try {
      await prisma.proposal.create({ data: prop });
    } catch(e) {}
  }

  console.log("Seeding complete.");
}

async function runBenchmark() {
  await seedData();

  console.log("Running baseline benchmark for reconcileCustomerBalances...");
  const start = performance.now();

  try {
    const res = await reconcileCustomerBalances();
    if (!res.success && res.error && !res.error.includes("static generation store missing")) {
       console.error(res.error);
    }
  } catch(e) { }

  const end = performance.now();

  console.log(`Baseline Execution Time: ${(end - start).toFixed(2)} ms`);
}

runBenchmark().catch(console.error).finally(() => prisma.$disconnect());
