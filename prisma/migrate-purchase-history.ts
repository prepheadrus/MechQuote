// Import purchase history from backup
// Run with: npx tsx prisma/migrate-purchase-history.ts

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting purchase history migration...\n');

    const backupPath = path.join(process.cwd(), 'teklif_backup.json');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log(`📦 Found ${backupData.purchase_history?.length || 0} purchase history records\n`);

    // Import Purchase History
    console.log('💰 Importing purchase history...');
    let historyCount = 0;
    let skipped = 0;

    for (const history of backupData.purchase_history || []) {
        try {
            await prisma.purchaseHistory.create({
                data: {
                    productId: history.productId?.toString() || '',
                    supplierId: history.supplierId?.toString() || null,
                    supplierName: history.supplierName || null,
                    date: history.date ? new Date(history.date) : new Date(),
                    listPrice: history.listPrice || 0,
                    discountRate: history.discountRate || 0,
                    netPrice: history.netPrice || 0,
                    currency: history.currency || 'TRY',
                    invoiceId: history.invoiceId?.toString() || null
                }
            });
            historyCount++;
            if (historyCount % 10 === 0) {
                console.log(`  ✓ Imported ${historyCount} records...`);
            }
        } catch (error: any) {
            skipped++;
            if (!error.message.includes('Unique constraint') && !error.message.includes('Foreign key')) {
                console.error(`  ✗ Failed to import history for product ${history.productId}:`, error.message);
            }
        }
    }

    console.log(`\n✅ Imported ${historyCount} purchase history records`);
    if (skipped > 0) {
        console.log(`⚠️  Skipped ${skipped} records (product not found or duplicate)`);
    }

    console.log('\n🎉 Purchase history migration completed!');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
