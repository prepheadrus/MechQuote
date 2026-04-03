import { NextRequest, NextResponse } from 'next/server';
import { cancelInvoice } from '@/actions/invoices';

/**
 * POST /api/invoices/[id]/cancel
 * 
 * Fatura iptal etme endpoint'i
 * Soft delete ile veriyi korur, ilişkileri keser
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Validation
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Invoice ID gerekli' },
                { status: 400 }
            );
        }

        const {
            reason,
            cancelType = 'soft',
            modules = {
                projects: true,
                customerBalance: true,
                stock: true,
                preserveProducts: true // ✅ Varsayılan: Satın alma verisini koru
            }
        } = body;

        if (!reason || reason.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'İptal sebebi gerekli' },
                { status: 400 }
            );
        }

        const user = { id: 'system', name: 'System' }; // Temporary

        // Call server action
        const result = await cancelInvoice(id, {
            reason,
            cancelType: cancelType as 'soft' | 'hard',
            deletedBy: user.id,
            modules
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: result.message,
                data: { id, cancelType, reason }
            });
        } else {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('API [POST /api/invoices/[id]/cancel] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'İptal işlemi başarısız' },
            { status: 500 }
        );
    }
}
