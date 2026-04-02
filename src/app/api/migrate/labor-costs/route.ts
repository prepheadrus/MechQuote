import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        await prisma.laborCost.create({
            data: {
                id: data.id,
                role: data.role,
                cost: data.cost || 0,
                unit: data.unit || 'Gün'
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Migration error (labor-costs):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
