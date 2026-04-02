import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        await prisma.recipe.create({
            data: {
                id: data.id,
                productId: data.productId,
                recipeItems: typeof data.recipeItems === 'string'
                    ? data.recipeItems
                    : JSON.stringify(data.recipeItems)
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Migration error (recipes):', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
