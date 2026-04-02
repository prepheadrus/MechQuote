'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export async function getInteractions(customerId: string) {
    try {
        const interactions = await prisma.customerInteraction.findMany({
            where: { customerId, isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: interactions };
    } catch (error) {
        logger.error('Failed to fetch interactions:', error);
        return { success: false, error: 'Etkileşimler yüklenirken hata oluştu.' };
    }
}

export async function createInteraction(data: {
    customerId: string;
    content: string;
    type: string;
    authorName: string;
}) {
    try {
        const interaction = await prisma.customerInteraction.create({
            data
        });
        revalidatePath(`/customers/${data.customerId}`);
        return { success: true, data: interaction };
    } catch (error) {
        logger.error('Failed to create interaction:', error);
        return { success: false, error: 'Etkileşim kaydedilemedi.' };
    }
}

export async function deleteInteraction(id: string, customerId: string) {
    try {
        await prisma.customerInteraction.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath(`/customers/${customerId}`);
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete interaction:', error);
        return { success: false, error: 'Etkileşim silinemedi.' };
    }
}

/**
 * Get ALL interactions for backup purposes
 */
export async function getAllInteractions() {
    try {
        const interactions = await prisma.customerInteraction.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: interactions };
    } catch (error) {
        logger.error('Failed to fetch all interactions:', error);
        return { success: false, error: 'Tüm etkileşimler yüklenirken hata oluştu.' };
    }
}
