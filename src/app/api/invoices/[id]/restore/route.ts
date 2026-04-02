import { NextRequest, NextResponse } from 'next/server';
import { restoreInvoice } from '@/actions/invoices';

/**
 * POST /api/invoices/[id]/restore
 * 
 * İptal edilmiş faturayı geri yükleme endpoint'i
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validation
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invoice ID gerekli' },
                { status: 400 }
            );
        }

        // Call server action
        const result = await restoreInvoice(id);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                data: { id }
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('API [POST /api/invoices/[id]/restore] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Geri yükleme başarısız' },
            { status: 500 }
        );
    }
}
