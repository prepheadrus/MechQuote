
import { logger } from '@/lib/logger';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function verify() {
    logger.info('📊 Veri Kontrolü:');

    const counts = {
        settings: await prisma.settings.count(),
        customers: await prisma.customer.count(),
        products: await prisma.product.count(),
        suppliers: await prisma.supplier.count(),
        personnel: await prisma.personnel.count(),
        proposals: await prisma.proposal.count(),
        invoices: await prisma.invoice.count(),
    };

    console.table(counts);
}

verify()
    .catch((error) => logger.error(error))
    .finally(() => prisma.$disconnect());
