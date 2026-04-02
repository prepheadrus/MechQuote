import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        await prisma.personnel.create({
            data: {
                id: data.id,
                name: data.name,
                role: data.role,
                phone: data.phone,
                email: data.email,
                status: data.status || 'Aktif',
                dailyRate: data.dailyRate
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Migration error (personnel):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
