
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
        settings: await prisma.settings.count({ where: { isDeleted: false } }),
        customers: await prisma.customer.count({ where: { isDeleted: false } }),
        products: await prisma.product.count({ where: { isDeleted: false } }),
        suppliers: await prisma.supplier.count({ where: { isDeleted: false } }),
        personnel: await prisma.personnel.count({ where: { isDeleted: false } }),
        proposals: await prisma.proposal.count({ where: { isDeleted: false } }),
        invoices: await prisma.invoice.count({ where: { isDeleted: false } }),
    };

    console.table(counts);
}

verify()
    .catch((error) => logger.error(error))
    .finally(() => prisma.$disconnect());
