'use server'

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const laborCostSchema = z.object({
    id: z.string().optional(),
    role: z.string().min(2, "Rol en az 2 karakter olmalıdır."),
    cost: z.coerce.number().min(0, "Maliyet negatif olamaz."),
    unit: z.string().min(1, "Birim zorunludur."),
});

export async function getLaborCosts() {
    try {
        const laborCosts = await prisma.laborCost.findMany({
            where: { isDeleted: false },
            orderBy: {
                role: 'asc'
            }
        });
        return { success: true, data: laborCosts };
    } catch (error) {
        logger.error('Failed to fetch labor costs:', error);
        return { success: false, error: 'İşçilik maliyetleri yüklenirken bir hata oluştu.' };
    }
}

export async function saveLaborCost(data: z.infer<typeof laborCostSchema>) {
    const validatedFields = laborCostSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            success: false,
            error: 'Geçersiz veri.',
            details: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { id, ...rest } = validatedFields.data;

    try {
        let savedLaborCost;
        if (id) {
            savedLaborCost = await prisma.laborCost.update({
                where: { id },
                data: rest,
            });
        } else {
            savedLaborCost = await prisma.laborCost.create({
                data: rest,
            });
        }
        revalidatePath('/recipes');
        return { success: true, data: savedLaborCost };
    } catch (error) {
        logger.error('Failed to save labor cost:', error);
        return { success: false, error: 'İşçilik maliyeti kaydedilirken bir hata oluştu.' };
    }
}

export async function deleteLaborCost(id: string) {
    if (!id) {
        return { success: false, error: 'Silmek için bir ID gereklidir.' };
    }

    try {
        await prisma.laborCost.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/recipes');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete labor cost:', error);
        // Handle cases where the labor cost might be in use
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2003') { // Foreign key constraint failed
                return { success: false, error: 'Bu işçilik maliyeti bir veya daha fazla reçetede kullanıldığı için silinemez.' };
            }
        }
        return { success: false, error: 'İşçilik maliyeti silinirken bir hata oluştu.' };
    }
}