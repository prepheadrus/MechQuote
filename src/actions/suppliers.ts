'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logger } from '@/lib/logger';

export interface SupplierInfo {
    id: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: any; // JsonValue can be string, object, or null
}

export async function getSuppliers() {
    try {
        // 1. Get explicit suppliers
        const dbSuppliers = await prisma.supplier.findMany({
            where: { isDeleted: false },
            orderBy: { name: 'asc' }
        });

        // 2. Get all CRM customers (Cari Hesaplars are used both ways)
        const customers = await prisma.customer.findMany({
            where: { isDeleted: false },
            orderBy: { name: 'asc' }
        });

        // 3. Get implicit suppliers from purchase invoices
        const invoiceSuppliers = await prisma.invoice.findMany({
            where: {
                type: 'Incoming',
                senderName: { not: null }
            },
            select: {
                senderName: true,
                senderTaxId: true
            },
            distinct: ['senderName']
        });

        // 4. Merge and Deduplicate
        // Priority: 1. CRM Customers (Cari Hesap) 2. Explicit Suppliers 3. Invoices

        const hasLettersRegex = /[a-zA-ZğüşıöçĞÜŞİÖÇ]/;
        const mergedList: SupplierInfo[] = [];
        const seenNames = new Set<string>();

        // Add CRM Customers first
        customers.forEach(c => {
            if (c.name && c.name.trim().length > 1 && hasLettersRegex.test(c.name)) {
                mergedList.push({
                    id: c.id,
                    name: c.name.trim(),
                    contactName: null, // Customer model doesn't have contactName
                    email: c.email,
                    phone: c.phone,
                    address: c.address
                });
                seenNames.add(c.name.trim().toLowerCase());
            }
        });

        // Add Explicit Suppliers
        dbSuppliers.forEach(s => {
            if (s.name && s.name.trim().length > 1 && hasLettersRegex.test(s.name) && !seenNames.has(s.name.trim().toLowerCase())) {
                mergedList.push(s);
                seenNames.add(s.name.trim().toLowerCase());
            }
        });

        // Add Invoice Senders
        invoiceSuppliers.forEach(inv => {
            const name = inv.senderName?.trim();
            if (name && name.length > 1 && hasLettersRegex.test(name) && !seenNames.has(name.toLowerCase())) {
                mergedList.push({
                    id: `virtual-${name}`,
                    name: name,
                    contactName: null,
                    email: null,
                    phone: null,
                    address: null
                });
                seenNames.add(name.toLowerCase());
            }
        });

        // Sort alphabetically
        mergedList.sort((a, b) => a.name.localeCompare(b.name));

        return { success: true, data: mergedList };
    } catch (error) {
        logger.error('Failed to fetch suppliers:', error);
        return { success: false, error: 'Tedarikçiler yüklenirken hata oluştu.' };
    }
}

export async function createSupplier(data: any) {
    try {
        const supplier = await prisma.supplier.create({
            data: {
                name: data.name,
                contactName: data.contactName,
                email: data.email,
                phone: data.phone,
                address: data.address,
            }
        });
        revalidatePath('/products');
        return { success: true, data: supplier };
    } catch (error) {
        logger.error('Failed to create supplier:', error);
        return { success: false, error: 'Tedarikçi oluşturulamadı.' };
    }
}
