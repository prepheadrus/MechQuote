import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

// Migration için rate limit: 20 istek/dakika
const MIGRATE_LIMIT = { limit: 20, window: 60 };

export async function POST(request: NextRequest) {
    // Rate limiting
    const limited = await rateLimit(request, MIGRATE_LIMIT);
    if (limited) {
        return NextResponse.json(
            { error: 'Çok fazla istek. Lütfen bekleyin.' },
            { status: 429 }
        );
    }

    try {
        const data = await request.json();

        // Create invoice with items
        const invoice = await prisma.invoice.create({
            data: {
                id: data.id, // Preserve original ID
                type: data.type,
                customerId: data.customerId,
                senderName: data.senderName,
                receiverName: data.receiverName,
                senderTaxId: data.senderTaxId,
                invoiceNumber: data.invoiceNumber,
                ettsn: data.ettsn,
                invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
                currency: data.currency || 'TRY',
                totalAmount: data.totalAmount || 0,
                subTotal: data.subTotal,
                totalDiscountAmount: data.totalDiscountAmount,
                totalTaxAmount: data.totalTaxAmount,
                taxInclusiveTotal: data.taxInclusiveTotal,
                pdfFileBlob: data.pdfFileBlob,
                status: data.status || 'Draft',
                createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                items: {
                    create: (data.items || []).map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        totalPrice: item.totalPrice || 0,
                        taxRate: item.taxRate,
                        taxAmount: item.taxAmount,
                        discountAmount: item.discountAmount,
                        unit: item.unit,
                        listPrice: item.listPrice,
                        discountRate: item.discountRate,
                        linkedProductId: item.linkedProductId
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, data: invoice });
    } catch (error: any) {
        console.error('Migration error (invoices):', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
