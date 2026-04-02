'use server';

import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const logger = createLogger('CustomerLookup');

/**
 * Find or create customer from invoice data
 */
export async function findOrCreateCustomerFromInvoice(
    senderName: string,
    senderTaxId?: string,
    details?: {
        address?: string;
        phone?: string;
        email?: string;
        taxOffice?: string;
    }
) {
    try {
        logger.info(`Name: "${senderName}", TaxID: "${senderTaxId}"`);
        let customer = null;

        // 1. Clean and validate Tax ID
        // Remove ALL non-digit characters (spaces, dashes, etc.) to ensure raw number matching
        const cleanTaxId = senderTaxId ? String(senderTaxId).replace(/\D/g, '') : undefined;
        // Turkish Tax ID is 10 (VKN) or 11 (TCKN) digits.
        const isValidTaxId = cleanTaxId && (cleanTaxId.length === 10 || cleanTaxId.length === 11);

        logger.info(`CleanTaxID: "${cleanTaxId}", Valid: ${isValidTaxId}`);

        if (isValidTaxId) {
            customer = await prisma.customer.findFirst({
                where: { isDeleted: false,  taxId: cleanTaxId }
            });
            if (customer) {
                logger.info(`Found by TaxID: ${customer.name} (${customer.id})`);

                // Self-healing: Update missing info OR Repair corrupted names
                const updates: any = {};

                // --- NEW: Repair Corrupted Name ---
                // If old name has corruption markers (Â, Ã) and new name is different
                const isCorrupted = (s: string) => s.includes('Â') || s.includes('Ã') || s.includes('Â');
                if (isCorrupted(customer.name) && !isCorrupted(senderName)) {
                    logger.warn(`Repairing corrupted name: ${customer.name} -> ${senderName}`);
                    updates.name = senderName.trim();
                }

                if (!customer.address && details?.address) updates.address = details.address;
                if (!customer.phone && details?.phone) updates.phone = details.phone;
                if (!customer.email && details?.email) updates.email = details.email;
                if (!customer.taxOffice && details?.taxOffice) updates.taxOffice = details.taxOffice;

                if (Object.keys(updates).length > 0) {
                    logger.info(`Updating customer (TaxID Match) ${customer.id}:`, updates);
                    try {
                        customer = await prisma.customer.update({
                            where: { id: customer.id },
                            data: updates
                        });
                    } catch (err) {
                        console.warn('Failed to auto-update customer info (TaxID Match):', err);
                    }
                }
            }
        }

        if (!customer && senderName) {
            const nameToSearch = senderName.trim();
            // Try exact first
            customer = await prisma.customer.findFirst({
                where: { isDeleted: false,  name: nameToSearch }
            });

            // If not found, try common naming variations or case-insensitive (approximate for SQLite)
            if (!customer) {
                const customers = await prisma.customer.findMany({ where: { isDeleted: false } });
                customer = customers.find(c =>
                    c.name.toLowerCase() === nameToSearch.toLowerCase() ||
                    c.name.toLowerCase().includes(nameToSearch.toLowerCase()) ||
                    nameToSearch.toLowerCase().includes(c.name.toLowerCase())
                );
            }

            if (customer) {
                // CONFLICT CHECK:
                // If the found customer ALREADY has a Tax ID, and it is DIFFERENT from the one we are looking for,
                // then this is likely a DIFFERENT company (or branch) with the same name.
                // WE SHOULD NOT MATCH IT.
                if (customer.taxId && cleanTaxId && customer.taxId !== cleanTaxId) {
                    logger.warn(`CONFLICT: Name matched '${customer.name}' but TaxID differs! (DB: ${customer.taxId} vs Input: ${cleanTaxId})`);
                    logger.warn(`Treating as NEW customer to avoid incorrect linkage.`);
                    customer = null; // Do not use this match
                } else {
                    logger.info(`Found by Name (Fuzzy/Exact): ${customer.name} (${customer.id})`);

                    // Self-healing: Update missing info (TaxID, Address, Phone, etc.)
                    const updates: any = {};

                    // Repair corrupted name if found by fuzzy match but DB has corruption
                    const isCorrupted = (s: string) => s.includes('Â') || s.includes('Ã');
                    if (isCorrupted(customer.name) && !isCorrupted(senderName)) {
                        logger.warn(`Repairing name via Fuzzy Match: ${customer.name} -> ${senderName}`);
                        updates.name = senderName.trim();
                    }

                    if (!customer.taxId && isValidTaxId) updates.taxId = cleanTaxId;
                    if (!customer.address && details?.address) updates.address = details.address;
                    if (!customer.phone && details?.phone) updates.phone = details.phone;
                    if (!customer.email && details?.email) updates.email = details.email;
                    if (!customer.taxOffice && details?.taxOffice) updates.taxOffice = details.taxOffice;

                    if (Object.keys(updates).length > 0) {
                        logger.info(`Updating customer ${customer.id}:`, updates);
                        try {
                            customer = await prisma.customer.update({
                                where: { id: customer.id },
                                data: updates
                            });
                        } catch (err) {
                            console.warn('Failed to auto-update customer info:', err);
                        }
                    }
                }
            }
        }

        if (!customer) {
            logger.info(`Creating NEW customer: ${senderName}`);
            customer = await prisma.customer.create({
                data: {
                    name: senderName.trim(),
                    taxId: isValidTaxId ? cleanTaxId : undefined,
                    address: details?.address,
                    phone: details?.phone,
                    email: details?.email,
                    taxOffice: details?.taxOffice,
                    status: 'Aktif'
                }
            });
        }

        return { success: true, data: customer };
    } catch (error) {
        console.error('Failed to find or create customer:', error);
        return { success: false, error: 'Müşteri oluşturulurken hata oluştu.' };
    }
}
