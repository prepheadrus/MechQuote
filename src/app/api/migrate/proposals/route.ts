import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        // Create proposal with items
        const proposal = await prisma.proposal.create({
            data: {
                id: data.id, // Preserve original ID
                rootProposalId: data.rootProposalId || data.id,
                version: data.version || 1,
                status: data.status || 'Draft',
                quoteNumber: data.quoteNumber,
                customerName: data.customerName,
                customerId: data.customerId,
                projectName: data.projectName,
                totalAmount: data.totalAmount || 0,
                exchangeRateUSD: data.exchangeRates?.USD || 0,
                exchangeRateEUR: data.exchangeRates?.EUR || 0,
                createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                versionNote: data.versionNote,
                termsAndConditions: data.termsAndConditions,
                tags: data.tags ? (Array.isArray(data.tags) ? data.tags.join(',') : data.tags) : null,
                items: {
                    create: (data.items || []).map((item: any) => ({
                        id: item.id,
                        productId: item.productId,
                        name: item.name,
                        brand: item.brand || '',
                        model: item.model || '',
                        quantity: item.quantity || 0,
                        unit: item.unit || 'Adet',
                        listPrice: item.listPrice || 0,
                        currency: item.currency || 'TRY',
                        discountRate: item.discountRate || 0,
                        profitMargin: item.profitMargin || 0,
                        groupName: item.groupName || '',
                        basePrice: item.basePrice || 0,
                        vatRate: item.vatRate || 0.20,
                        priceIncludesVat: item.priceIncludesVat || false,
                        orderIndex: item.orderIndex || 0
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, data: proposal });
    } catch (error: any) {
        console.error('Migration error (proposals):', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
