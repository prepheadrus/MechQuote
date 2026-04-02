'use server'

import { prisma } from '@/lib/prisma';
import { InstallationType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { initialInstallationTypesData } from '@/lib/seed-data';
import type { InitialInstallationType } from '@/lib/seed-data';
import { logger } from '@/lib/logger';

/**
 * Get all installation types
 */
export async function getInstallationTypes() {
    try {
        const types = await prisma.installationType.findMany({
            where: { isDeleted: false },
            orderBy: { name: 'asc' }
        });
        return { success: true, data: types };
    } catch (error) {
        logger.error('Failed to fetch installation types:', error);
        return { success: false, error: 'Montaj tipleri yüklenirken hata oluştu.' };
    }
}

/**
 * Creates or updates an installation type.
 */
export async function addOrUpdateInstallationType(data: {
    id?: string | null;
    name: string;
    description: string;
    parentId: string | null;
    price: number;
}) {
    try {
        const payload = {
            name: data.name,
            description: data.description,
            parentId: data.parentId,
            price: data.price || 0,
            currency: 'TRY',
        };

        if (data.id) {
            const updated = await prisma.installationType.update({
                where: { id: data.id },
                data: payload,
            });
            revalidatePath('/installation-types');
            return { success: true, data: updated };
        } else {
            const created = await prisma.installationType.create({
                data: payload,
            });
            revalidatePath('/installation-types');
            return { success: true, data: created };
        }
    } catch (error) {
        logger.error('Failed to save installation type:', error);
        return { success: false, error: 'Kategori kaydedilirken bir hata oluştu.' };
    }
}


/**
 * Delete installation type and all its children recursively.
 */
export async function deleteInstallationType(id: string) {
    try {
        const allTypes = await prisma.installationType.findMany({
            where: { isDeleted: false }
        });
        const idsToDelete = new Set<string>();
        const queue: string[] = [id];
        idsToDelete.add(id);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = allTypes.filter(c => c.parentId === currentId);
            for (const child of children) {
                idsToDelete.add(child.id);
                queue.push(child.id);
            }
        }

        await prisma.installationType.updateMany({
            where: { id: { in: Array.from(idsToDelete) } },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        revalidatePath('/installation-types');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete installation type:', error);
        return { success: false, error: 'Montaj tipi silinirken hata oluştu.' };
    }
}

/**
 * Deletes all installation types.
 */
export async function deleteAllInstallationTypes() {
    try {
        await prisma.installationType.updateMany({
            where: {},
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/installation-types');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete all installation types:', error);
        return { success: false, error: 'Tüm kategoriler silinirken bir hata oluştu.' };
    }
}

/**
 * Seeds the database with initial installation type data.
 */
export async function seedInstallationTypes() {
    try {
        const processCategory = async (category: InitialInstallationType, parentId: string | null): Promise<void> => {
            const created = await prisma.installationType.create({
                data: {
                    name: category.name,
                    description: category.description || "",
                    parentId: parentId,
                    price: 0,
                    currency: 'TRY'
                }
            });

            if (category.children) {
                for (const child of category.children) {
                    await processCategory(child, created.id);
                }
            }
        };

        for (const cat of initialInstallationTypesData) {
            await processCategory(cat, null);
        }

        revalidatePath('/installation-types');
        return { success: true };
    } catch (error) {
        logger.error('Failed to seed installation types:', error);
        return { success: false, error: 'Örnek veriler yüklenirken bir hata oluştu.' };
    }
}
