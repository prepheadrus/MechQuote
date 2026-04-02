'use server';

import { prisma } from '@/lib/prisma';

export interface SearchResult {
    type: 'Müşteri' | 'Ürün' | 'Teklif' | 'Fatura' | 'Proje';
    title: string;
    description?: string | null;
    url: string;
    id: string;
}

export async function performGlobalSearch(query: string): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const trimmedQuery = query.trim();

    const customersPromise = prisma.customer.findMany({
        where: {
            isDeleted: false,
            OR: [
                { name: { contains: trimmedQuery } },
                { email: { contains: trimmedQuery } },
                { phone: { contains: trimmedQuery } },
                { taxId: { contains: trimmedQuery } },
            ],
        },
        take: 5,
        select: { id: { where: { isDeleted: false } }, name: { where: { isDeleted: false } }, email: { where: { isDeleted: false } } },
    });

    const productsPromise = prisma.product.findMany({
        where: {
            isDeleted: false,
            OR: [
                { name: { contains: trimmedQuery } },
                { code: { contains: trimmedQuery } },
                { brand: { contains: trimmedQuery } },
                { model: { contains: trimmedQuery } },
            ],
        },
        take: 5,
        select: { id: { where: { isDeleted: false } }, name: { where: { isDeleted: false } }, code: { where: { isDeleted: false } }, brand: { where: { isDeleted: false } } },
    });

    const proposalsPromise = prisma.proposal.findMany({
        where: {
            isDeleted: false,
            OR: [
                { quoteNumber: { contains: trimmedQuery } },
                { customerName: { contains: trimmedQuery } },
                { projectName: { contains: trimmedQuery } },
            ],
        },
        take: 5,
        select: { id: { where: { isDeleted: false } }, quoteNumber: { where: { isDeleted: false } }, customerName: { where: { isDeleted: false } }, status: { where: { isDeleted: false } } },
    });

    const invoicesPromise = prisma.invoice.findMany({
        where: {
            isDeleted: false,
            OR: [
                { invoiceNumber: { contains: trimmedQuery } },
                { senderName: { contains: trimmedQuery } },
                { receiverName: { contains: trimmedQuery } },
            ],
        },
        take: 5,
        select: { id: { where: { isDeleted: false } }, invoiceNumber: { where: { isDeleted: false } }, receiverName: { where: { isDeleted: false } }, senderName: { where: { isDeleted: false } }, type: { where: { isDeleted: false } } },
    });

    const projectsPromise = prisma.project.findMany({
        where: {
            isDeleted: false,
            OR: [
                { name: { contains: trimmedQuery } },
            ],
        },
        take: 5,
        select: { id: { where: { isDeleted: false } }, name: { where: { isDeleted: false } }, customer: { where: { isDeleted: false },  select: { name: { where: { isDeleted: false } }, isDeleted: { where: { isDeleted: false } } } } },
    });

    const [customers, products, proposals, invoices, projects] = await Promise.all([
        customersPromise,
        productsPromise,
        proposalsPromise,
        invoicesPromise,
        projectsPromise,
    ]);

    const results: SearchResult[] = [];

    customers.forEach(c => results.push({
        id: c.id,
        type: 'Müşteri',
        title: c.name,
        description: c.email,
        url: `/customers?id=${c.id}`
    }));

    products.forEach(p => results.push({
        id: p.id,
        type: 'Ürün',
        title: p.name,
        description: `${p.brand || ''} - Kod: ${p.code || 'Yok'}`,
        url: `/products?id=${p.id}`
    }));

    proposals.forEach(p => results.push({
        id: p.id,
        type: 'Teklif',
        title: `Teklif No: ${p.quoteNumber}`,
        description: `${p.customerName} - Durum: ${p.status}`,
        url: `/quotes/${p.id}`
    }));

    invoices.forEach(i => results.push({
        id: i.id,
        type: 'Fatura',
        title: `Fatura No: ${i.invoiceNumber}`,
        description: i.type === 'Incoming' ? `Gönderen: ${i.senderName || 'Bilinmiyor'}` : `Alıcı: ${i.receiverName || 'Bilinmiyor'}`,
        url: `/invoices?highlight=${i.id}` 
    }));
    
    projects.forEach(p => results.push({
        id: p.id,
        type: 'Proje',
        title: p.name,
        description: `Müşteri: ${p.customer.name}`,
        url: `/projects/${p.id}`
    }));

    return results;
}
