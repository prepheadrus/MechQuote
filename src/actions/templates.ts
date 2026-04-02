'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createAuditLog } from '@/services/audit-service';
import { logger } from '@/lib/logger';

export type TemplateItem = {
    productId?: string;
    name: string;
    brand?: string;
    model?: string;
    quantity: number;
    unit?: string;
    listPrice: number;
    currency: string;
    discountRate: number;
    profitMargin: number;
    vatRate: number;
    priceIncludesVat: boolean;
    groupName?: string;
};

export async function createTemplate(data: {
    name: string;
    description?: string;
    items?: TemplateItem[];
    sourceProposalId?: string;
}) {
    try {
        logger.info('--- createTemplate START ---');
        logger.info('Input data.items length:', data.items?.length);
        logger.info('Input data.sourceProposalId:', data.sourceProposalId);

        let finalItems: TemplateItem[] = data.items || [];

        // Eğer bir kaynak teklif belirtilmişse, kalemleri sunucu tarafında çek
        if (data.sourceProposalId && data.sourceProposalId !== 'none') {
            const proposal = await prisma.proposal.findFirst({
                where: { id: data.sourceProposalId, isDeleted: false },
                include: { items: { where: { isDeleted: false } } }
            });

            if (proposal && proposal.items) {
                logger.info(`Sunucu: %s teklifinden %d kalem çekiliyor...`, proposal.quoteNumber, proposal.items.length);
                finalItems = proposal.items.map(item => ({
                    productId: item.productId || undefined,
                    name: String(item.name || 'İsimsiz Kalem'),
                    brand: String(item.brand || ''),
                    model: String(item.model || ''),
                    quantity: Number(item.quantity) || 1,
                    unit: String(item.unit || 'Adet'),
                    listPrice: Number(item.listPrice) || 0,
                    currency: String(item.currency || 'TRY'),
                    discountRate: Number(item.discountRate) || 0,
                    profitMargin: Number(item.profitMargin) || 0,
                    vatRate: Number(item.vatRate) || 0.20,
                    priceIncludesVat: Boolean(item.priceIncludesVat),
                    groupName: String(item.groupName || 'Genel')
                }));
            }
        }

        const itemsJson = JSON.stringify(finalItems);
        const template = await prisma.template.create({
            data: {
                name: data.name,
                description: data.description,
                items: itemsJson
            }
        });

        await createAuditLog('CREATE', 'Template', template.id, `Şablon oluşturuldu: ${template.name}`, null, 'System');
        revalidatePath('/templates');
        return { success: true, data: template };
    } catch (error) {
        logger.error('Failed to create template:', error);
        return { success: false, error: 'Şablon oluşturulurken hata oluştu.' };
    }
}

export async function getTemplates() {
    try {
        const templates = await prisma.template.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, data: templates };
    } catch (error) {
        logger.error('Failed to fetch templates:', error);
        return { success: false, error: 'Şablonlar yüklenirken hata oluştu.' };
    }
}

export async function deleteTemplate(id: string) {
    try {
        const template = await prisma.template.findFirst({
            where: { id, isDeleted: false } 
        });
        if (template) {
            await prisma.template.update({ 
                where: { id }, 
                data: { isDeleted: true, deletedAt: new Date() } 
            });
            await createAuditLog('DELETE', 'Template', id, `Şablon silindi: ${template.name}`, null, 'System');
        }
        revalidatePath('/templates');
        return { success: true };
    } catch (error) {
        logger.error('Failed to delete template:', error);
        return { success: false, error: 'Şablon silinirken hata oluştu.' };
    }
}

export async function createProposalFromTemplate(templateId: string, customerId: string, projectName: string) {
    try {
        const template = await prisma.template.findFirst({ where: { isDeleted: false,  id: templateId } });
        if (!template) {
            return { success: false, error: 'Şablon bulunamadı.' };
        }

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, isDeleted: false } 
        });
        if (!customer) {
            return { success: false, error: 'Müşteri bulunamadı.' };
        }

        const parsedData = Array.isArray(template.items) ? template.items : (typeof template.items === 'string' ? JSON.parse(template.items) : []);
        const items: TemplateItem[] = Array.isArray(parsedData) ? parsedData : [];

        if (items.length === 0 && (!Array.isArray(template.items) && template.items !== '[]')) {
            logger.error('Template items is not an array or is empty:', template.items);
            // Eğer dizi değilse ama veri varsa, belki tek bir objedir? (Nadir durum)
            if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
                items.push(parsedData as TemplateItem);
            }
        }

        // Generate quote number
        const lastProposal = await prisma.proposal.findFirst({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            select: { quoteNumber: { where: { isDeleted: false } } }
        });

        let nextNumber = 1;
        if (lastProposal?.quoteNumber) {
            const match = lastProposal.quoteNumber.match(/TEK-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            }
        }
        const quoteNumber = `TEK-${nextNumber.toString().padStart(4, '0')}`;

        // Create proposal
        const proposal = await prisma.proposal.create({
            data: {
                quoteNumber,
                customerId,
                customerName: customer.name,
                projectName,
                status: 'Draft',
                version: 1,
                rootProposalId: '',
                totalAmount: (Array.isArray(items) ? items : []).reduce((sum: number, item: any) => {
                    const listPrice = typeof item.listPrice === 'number' ? item.listPrice : 0;
                    const discount = typeof item.discountRate === 'number' ? item.discountRate : 0;
                    const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
                    const price = listPrice * (1 - discount / 100);
                    return sum + (price * quantity);
                }, 0),
                items: {
                    create: (Array.isArray(items) ? items : []).map((item, index) => ({
                        productId: item.productId || null,
                        name: item.name || 'İsimsiz Ürün',
                        brand: item.brand || 'Diğer',
                        model: item.model || '',
                        quantity: Number(item.quantity) || 1,
                        unit: item.unit || 'Adet',
                        listPrice: Number(item.listPrice) || 0,
                        currency: item.currency || 'TRY',
                        discountRate: Number(item.discountRate) || 0,
                        profitMargin: Number(item.profitMargin) || 0,
                        vatRate: Number(item.vatRate) || 0.20,
                        priceIncludesVat: item.priceIncludesVat ?? false,
                        basePrice: Number(item.listPrice) || 0,
                        groupName: item.groupName || 'Genel',
                        orderIndex: index
                    }))
                }
            },
            include: {
                items: { where: { isDeleted: false } },
                customer: { where: { isDeleted: false } }
            }
        });

        // Kendi ID'sini rootProposalId olarak ata (Versiyon 1 için standart)
        await prisma.proposal.update({
            where: { id: proposal.id },
            data: { rootProposalId: proposal.id }
        });

        await createAuditLog('CREATE', 'Proposal', proposal.id, `Şablondan teklif oluşturuldu: ${template.name}`, null, 'System');
        revalidatePath('/quotes');
        return { success: true, data: proposal };
    } catch (error: any) {
        logger.error('Failed to create proposal from template detailed error:', error);
        return { success: false, error: `Şablondan teklif oluşturulurken hata oluştu: ${error.message || 'Bilinmeyen hata'}` };
    }
}

