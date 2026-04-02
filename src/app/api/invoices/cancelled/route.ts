import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/invoices/cancelled
 * 
 * İptal edilmiş faturaları listeleme endpoint'i
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const sortBy = searchParams.get('sortBy') || 'deletedAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const skip = (page - 1) * limit;

        // Get cancelled invoices
        const invoices = await prisma.invoice.findMany({
            where: {
                isDeleted: true,
                cancelType: { not: null } // Only cancelled (not hard deleted)
            },
            include: {
                customer: true,
                items: {
                    where: { isDeleted: true },
                    select: {
                        id: true,
                        name: true,
                        quantity: true,
                        unitPrice: true,
                        listPrice: true,
                        discountRate: true,
                        netPrice: true,
                        supplierName: true,
                        invoiceDate: true,
                        cancelledAt: true,
                        cancelReason: true
                    }
                }
            },
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take: limit
        });

        // Get total count
        const total = await prisma.invoice.count({
            where: {
                isDeleted: true,
                cancelType: { not: null }
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                invoices,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error: any) {
        console.error('API [GET /api/invoices/cancelled] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Listeleme başarısız' },
            { status: 500 }
        );
    }
}
