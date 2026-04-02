'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logger } from '@/lib/logger';

export async function createPayment(data: {
    invoiceId: string;
    amount: number;
    date: Date | string;
    description?: string;
    method?: string;
    projectId?: string; // Optional: for revalidation
}) {
    try {
        // 1. Get invoice details for customer info
        const invoice = await prisma.invoice.findUnique({
            where: { id: data.invoiceId, isDeleted: false },
            include: {
                customer: { select: { name: true } }
            }
        });

        if (!invoice) throw new Error("Fatura bulunamadı");

        // 2. Create the payment
        const payment = await prisma.payment.create({
            data: {
                invoiceId: data.invoiceId,
                amount: Number(data.amount),
                date: new Date(data.date),
                note: data.description,
                method: data.method || 'Bank Transfer'
            }
        });

        // 3. Create Customer Transaction (automatically updates customer balance)
        await prisma.customerTransaction.create({
            data: {
                customerId: invoice.customerId!,
                amount: Number(data.amount),
                type: 'Payment', // Payment reduces customer debt
                category: 'Fatura Ödemesi',
                description: `Fatura Ödemesi: ${invoice.invoiceNumber || data.invoiceId}${data.description ? ` (${data.description})` : ''}`,
                date: new Date(data.date),
                referenceId: payment.id,
                referenceType: 'Payment'
            }
        });

        // 4. Revalidate
        revalidatePath(`/invoices/${data.invoiceId}`);
        if (invoice.projectId) revalidatePath(`/projects/${invoice.projectId}`);
        revalidatePath('/customers');

        return { success: true, data: payment };
    } catch (error) {
        logger.error('Failed to create payment:', error);
        return { success: false, error: 'Ödeme eklenirken hata oluştu.' };
    }
}

export async function deletePayment(id: string, invoiceId: string, projectId?: string) {
    try {
        // 1. Get payment details before deleting
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: {
                invoice: { select: { customerId: true, invoiceNumber: true, isDeleted: true } }
            }
        });

        if (!payment) throw new Error("Ödeme bulunamadı");

        // 2. Soft delete related Customer Transaction
        await prisma.customerTransaction.updateMany({
            where: { referenceId: id, referenceType: 'Payment' },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        // 3. Soft delete the payment
        await prisma.payment.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });

        // 4. Revalidate
        revalidatePath(`/invoices/${invoiceId}`);
        if (projectId) revalidatePath(`/projects/${projectId}`);
        revalidatePath('/customers');

        return { success: true };
    } catch (error) {
        logger.error('Failed to delete payment:', error);
        return { success: false, error: 'Ödeme silinirken hata oluştu.' };
    }
}

export async function getInvoicePayments(invoiceId: string) {
    try {
        const payments = await prisma.payment.findMany({
            where: { invoiceId, isDeleted: false },
            orderBy: { date: 'desc' }
        });
        return { success: true, data: payments };
    } catch (error) {
        return { success: false, error: 'Ödemeler yüklenirken hata oluştu.' };
    }
}
