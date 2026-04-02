import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        await prisma.installationType.create({
            data: {
                id: data.id,
                name: data.name,
                description: data.description,
                parentId: data.parentId,
                price: data.price || 0,
                currency: data.currency || 'TRY'
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Migration error (installation-types):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
