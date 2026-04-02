// prisma/migrate-recipes.ts
import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';

const prisma = new PrismaClient();
const backupDB = new Database('dev.db.backup');

interface OldRecipe {
    id: string;
    productId: string;
    recipeItems: string; // JSON string
}

interface RecipeItemData {
    type: 'material' | 'labor';
    itemId: string;
    name: string;
    quantity: number;
    unit?: string;
    cost: number;
}

async function main() {
    console.log('Eski reçete verilerini taşıma işlemi başlıyor...');

    const oldRecipes: OldRecipe[] = backupDB.prepare('SELECT id, productId, recipeItems FROM Recipe').all() as OldRecipe[];

    if (oldRecipes.length === 0) {
        console.log('Taşınacak reçete bulunamadı.');
        return;
    }

    console.log(`${oldRecipes.length} adet reçete bulundu. Taşıma işlemi gerçekleştiriliyor...`);

    let migratedCount = 0;
    for (const oldRecipe of oldRecipes) {
        try {
            if (!oldRecipe.recipeItems) {
                console.log(`- ${oldRecipe.productId} ID'li ürünün reçetesi boş, atlanıyor.`);
                continue;
            }
            
            const items: RecipeItemData[] = JSON.parse(oldRecipe.recipeItems);

            if (!Array.isArray(items) || items.length === 0) {
                console.log(`- ${oldRecipe.productId} ID'li ürünün reçete kalemleri geçersiz veya boş, atlanıyor.`);
                continue;
            }

            // Use upsert to be safe, creating the recipe and its items.
            await prisma.recipe.upsert({
                where: { productId: oldRecipe.productId },
                create: {
                    productId: oldRecipe.productId,
                    recipeItems: {
                        create: items.map((item, index) => ({
                            type: item.type,
                            itemId: String(item.itemId), // Ensure itemId is a string
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                            cost: item.cost,
                            orderIndex: index,
                        })),
                    },
                },
                update: { // If for some reason the recipe exists but items don't
                    recipeItems: {
                        deleteMany: {}, // Clear out any old items first
                        create: items.map((item, index) => ({
                            type: item.type,
                            itemId: String(item.itemId),
                            name: item.name,
                            quantity: item.quantity,
                            unit: item.unit,
                            cost: item.cost,
                            orderIndex: index,
                        })),
                    }
                }
            });

            console.log(`- ${oldRecipe.productId} ID'li ürünün reçetesi başarıyla taşındı.`);
            migratedCount++;

        } catch (error) {
            console.error(`${oldRecipe.productId} ID'li ürünün reçetesi taşınırken hata oluştu:`, error);
        }
    }

    console.log(`\nTaşıma işlemi tamamlandı. Toplam ${migratedCount} adet reçete başarıyla yeni yapıya aktarıldı.`);
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
