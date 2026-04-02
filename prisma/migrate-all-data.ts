// prisma/migrate-all-data.ts
import { Prisma, PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';

const prisma = new PrismaClient();
const backupDB = new Database('dev.db.backup', { readonly: true });

// A simple type for the migration function
type PrismaDelegate = {
    createMany: (args: { data: any[], skipDuplicates?: boolean }) => Promise<Prisma.BatchPayload>
};

async function migrateTable(tableName: string, delegate: PrismaDelegate) {
    console.log(`- ${tableName} tablosu taşınıyor...`);
    try {
        const tableInfo = backupDB.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}';`).get();
        if (!tableInfo) {
            console.log(`  -> Kaynak veritabanında ${tableName} tablosu bulunamadı, atlanıyor.`);
            return;
        }

        const data = backupDB.prepare(`SELECT * FROM ${tableName}`).all();
        
        // SQLite booleans are 0 or 1, Prisma expects true/false. Let's convert them.
        const sanitizedData = data.map((row: any) => {
            const newRow: any = {};
            for (const key in row as any) {
                const value = (row as any)[key];
                if (value === 0 || value === 1) {
                    // A simple heuristic: if a schema field is boolean, convert.
                    // This is brittle. A better way is to inspect the prisma schema, but for now this will likely work.
                    // Let's manually check for known boolean fields.
                    if(tableName === 'Product' && key === 'priceIncludesVat') {
                        newRow[key] = value === 1;
                    } else if (tableName === 'ProposalItem' && key === 'priceIncludesVat') {
                        newRow[key] = value === 1;
                    }
                    else {
                        newRow[key] = value;
                    }
                } else if (key.endsWith('At') || key.endsWith('Date')) {
                    // Dates are strings, let's ensure they are valid ISO strings for Prisma
                    newRow[key] = value ? new Date(value).toISOString() : null;
                }
                else {
                    newRow[key] = value;
                }
            }
            return newRow;
        });

        if (sanitizedData.length === 0) {
            console.log(`  -> ${tableName} tablosu boş, atlanıyor.`);
            return;
        }

        const { count } = await delegate.createMany({
            data: sanitizedData,
            skipDuplicates: true,
        });
        console.log(`  -> ${count} kayıt başarıyla ${tableName} tablosuna aktarıldı.`);

    } catch (error: any) {
        console.error(`  -> Hata: ${tableName} tablosu taşınırken sorun oluştu:`, error.message);
    }
}


async function main() {
    console.log('Tüm verileri yedekten geri yükleme işlemi başlıyor...');

    // Migrate tables in an order that respects foreign key constraints
    await migrateTable('Settings', prisma.settings as any);
    await migrateTable('Customer', prisma.customer as any);
    await migrateTable('Supplier', prisma.supplier as any);
    await migrateTable('Personnel', prisma.personnel as any);
    await migrateTable('InstallationType', prisma.installationType as any);
    await migrateTable('LaborCost', prisma.laborCost as any);
    await migrateTable('Product', prisma.product as any);
    await migrateTable('Template', prisma.template as any);

    // Models with dependencies
    await migrateTable('Project', prisma.project as any);
    await migrateTable('Proposal', prisma.proposal as any);
    await migrateTable('CustomerTransaction', prisma.customerTransaction as any);
    await migrateTable('CustomerInteraction', prisma.customerInteraction as any);

    // Models with deeper dependencies
    await migrateTable('Invoice', prisma.invoice as any);
    await migrateTable('ProposalItem', prisma.proposalItem as any);
    await migrateTable('JobAssignment', prisma.jobAssignment as any);
    // await migrateTable('ProjectTransaction', prisma.projectTransaction as any); // TODO: Model does not exist

    // Models with even deeper dependencies
    await migrateTable('InvoiceItem', prisma.invoiceItem as any);
    await migrateTable('PurchaseHistory', prisma.purchaseHistory as any);
    await migrateTable('Payment', prisma.payment as any);

    console.log('\nVeri taşıma işlemi tamamlandı.');
}

main()
    .catch((e) => {
        console.error('Veri taşıma scriptinde beklenmedik bir hata oluştu:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        backupDB.close();
    });