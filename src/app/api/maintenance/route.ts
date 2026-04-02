import { NextRequest, NextResponse } from 'next/server';
import { reconcileCustomerBalances, fullReconcileCustomerBalances } from '@/actions/maintenance';

/**
 * Maintenance API Endpoint
 * 
 * Usage:
 * POST /api/maintenance
 * Body: { action: 'reconcile' | 'full-reconcile' }
 * 
 * - 'reconcile': Adds missing transactions without deleting existing ones
 * - 'full-reconcile': DELETES all transactions and recreates from scratch (DANGEROUS)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action } = body;

        if (!action || !['reconcile', 'full-reconcile'].includes(action)) {
            return NextResponse.json(
                { error: 'Geçersiz işlem. "reconcile" veya "full-reconcile" kullanın.' },
                { status: 400 }
            );
        }

        let result;
        if (action === 'reconcile') {
            result = await reconcileCustomerBalances();
        } else if (action === 'full-reconcile') {
            result = await fullReconcileCustomerBalances();
        } else {
            return NextResponse.json(
                { error: 'Geçersiz işlem.' },
                { status: 400 }
            );
        }

        if (result && result.success) {
            return NextResponse.json({
                success: true,
                message: 'Bakiye mutabakatı tamamlandı.',
                logs: result.logs
            });
        } else {
            return NextResponse.json(
                { error: result.error, logs: (result as any).logs },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('Maintenance API error:', error);
        return NextResponse.json(
            { error: error.message || 'İç sunucu hatası' },
            { status: 500 }
        );
    }
}
