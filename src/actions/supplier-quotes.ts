'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export async function createSupplierQuote(data: {
    supplierName: string;
    proposalId: string;
    items: {
        productId?: string;
        name: string;
        price: number;
        currency: string;
    }[];
}) {
    try {
        const quote = await prisma.supplierQuote.create({
            data: {
                supplierName: data.supplierName,
                proposalId: data.proposalId,
                items: {
                    create: data.items
                }
            },
            include: {
                items: { where: { isDeleted: false } }
            }
        });

        revalidatePath(`/quotes/${data.proposalId}`);
        return { success: true, data: quote };
    } catch (error: any) {
        logger.error('Failed to create supplier quote:', error);
        return { success: false, error: error.message };
    }
}

export async function getSupplierQuotesForProposal(proposalId: string) {
    try {
        const quotes = await prisma.supplierQuote.findMany({
            where: { isDeleted: false,  proposalId },
            include: {
                items: { where: { isDeleted: false } }
            },
            orderBy: { date: 'desc' }
        });

        return { success: true, data: quotes };
    } catch (error: any) {
        logger.error('Failed to fetch supplier quotes:', error);
        return { success: false, error: error.message };
    }
}
