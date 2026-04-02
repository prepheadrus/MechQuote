import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        await prisma.template.create({
            data: {
                id: data.id,
                name: data.name,
                description: data.description,
                items: typeof data.items === 'string'
                    ? data.items
                    : JSON.stringify(data.items),
                createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Migration error (templates):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
