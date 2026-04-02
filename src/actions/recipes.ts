'use server'

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

// Define the type for a recipe item that the client will send.
// This avoids relying on the Prisma-generated type directly in the function signature.
type RecipeItemInput = Omit<Prisma.RecipeItemCreateInput, 'recipe'>;

/**
 * Get all recipes including their items
 */
export async function getRecipes() {
    try {
        const recipes = await prisma.recipe.findMany({
            where: { isDeleted: false },
            include: {
                recipeItems: true
            }
        });
        return { success: true, data: recipes };
    } catch (error) {
        logger.error('Failed to fetch recipes:', error);
        return { success: false, error: 'Reçeteler yüklenirken hata oluştu.' };
    }
}

/**
 * Get recipe for a product, including its items.
 */
export async function getRecipe(productId: string) {
    try {
        const recipe = await prisma.recipe.findUnique({
            where: { productId, isDeleted: false },
            include: {
                product: true,
                recipeItems: {
                    orderBy: {
                        orderIndex: 'asc'
                    }
                }
            }
        });

        return { success: true, data: recipe };
    } catch (error) {
        logger.error('Failed to fetch recipe:', error);
        return { success: false, error: 'Reçete yüklenirken hata oluştu.' };
    }
}

/**
 * Create or update recipe for a product with relational items.
 */
export async function saveRecipe(productId: string, items: RecipeItemInput[]) {
    try {
        // Use a transaction to ensure atomicity
        const savedRecipe = await prisma.$transaction(async (tx) => {
            const recipe = await tx.recipe.upsert({
                where: { productId },
                create: {
                    productId,
                },
                update: {},
            });

            // First, delete all existing items for this recipe
            await tx.recipeItem.deleteMany({
                where: { recipeId: recipe.id }
            });

            // Then, create the new items
            if (items.length > 0) {
                await tx.recipeItem.createMany({
                    data: items.map((item, index) => ({
                        ...item,
                        recipeId: recipe.id,
                        orderIndex: index,
                    }))
                });
            }

            return recipe;
        });

        revalidatePath('/recipes');
        revalidatePath(`/products/${productId}`);

        const updatedRecipeWithItems = await prisma.recipe.findUnique({
            where: { id: savedRecipe.id },
            include: { recipeItems: true }
        });

        return { success: true, data: updatedRecipeWithItems };
    } catch (error) {
        logger.error('Failed to save recipe:', error);
        return { success: false, error: 'Reçete kaydedilirken hata oluştu.' };
    }
}

/**
 * Delete recipe
 */
export async function deleteRecipe(productId: string) {
    try {
        // The schema's `onDelete: Cascade` on the `Product` relation handles this.
        // If a product is deleted, its recipe is deleted.
        // If we just want to delete the recipe but not the product, we delete the recipe record.
        // Cascading delete on RecipeItem is also handled by the schema.
        await prisma.recipe.update({
            where: { productId },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        revalidatePath('/recipes');
        revalidatePath(`/products/${productId}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete recipe:', error);
        return { success: false, error: 'Reçete silinirken hata oluştu.' };
    }
}

/**
 * Get all products with recipes, including items
 */
export async function getProductsWithRecipes() {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            include: {
                recipe: {
                    where: { isDeleted: false },
                    include: {
                        recipeItems: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return { success: true, data: products };
    } catch (error) {
        logger.error('Failed to fetch products with recipes:', error);
        return { success: false, error: 'Reçeteli ürünler yüklenirken hata oluştu.' };
    }
}


/**
 * Get all data required for the main Recipes page in one go.
 */
export async function getRecipePageData() {
    try {
        const [products, recipes, laborCosts] = await Promise.all([
            prisma.product.findMany({
                where: { isDeleted: false },
                orderBy: { name: 'asc' }
            }),
            prisma.recipe.findMany({
                where: { isDeleted: false },
                include: {
                    recipeItems: true
                }
            }),
            prisma.laborCost.findMany({
                where: { isDeleted: false },
                orderBy: { role: 'asc' }
            })
        ]);

        return { success: true, data: { products, recipes, laborCosts } };
    } catch (error) {
        logger.error('Failed to fetch recipe page data:', error);
        return { success: false, error: 'Reçete sayfası için veriler yüklenirken bir hata oluştu.' };
    }
}
