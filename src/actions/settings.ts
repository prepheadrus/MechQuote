'use server'

import { prisma } from '@/lib/prisma';
import { Settings, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';

export async function getSettings() {
    try {
        // Settings is a singleton, so we take the first one
        const settings = await prisma.settings.findFirst({ where: { isDeleted: false } });
        return { success: true, data: settings };
    } catch (error) {
        logger.error('Failed to fetch settings:', error);
        return { success: false, error: 'Ayarlar yüklenirken bir hata oluştu.' };
    }
}

export async function updateSettings(data: Partial<Settings>) {
    try {
        const existing = await prisma.settings.findFirst({ where: { isDeleted: false } });

        // Convert JSON string to JSON object for bankAccounts if needed
        const updateData: Prisma.SettingsUpdateInput = {};
        if (data.bankAccounts !== undefined) {
            updateData.bankAccounts = typeof data.bankAccounts === 'string' 
                ? JSON.parse(data.bankAccounts) 
                : data.bankAccounts;
        }
        if (data.companyName !== undefined) updateData.companyName = data.companyName;
        if (data.companyTitle !== undefined) updateData.companyTitle = data.companyTitle;
        if (data.companySlogan !== undefined) updateData.companySlogan = data.companySlogan;
        if (data.logo !== undefined) updateData.logo = data.logo;
        if (data.website !== undefined) updateData.website = data.website;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
        if (data.address !== undefined) updateData.address = data.address;
        if (data.taxOffice !== undefined) updateData.taxOffice = data.taxOffice;
        if (data.taxNumber !== undefined) updateData.taxNumber = data.taxNumber;
        if (data.defaultTermsAndConditions !== undefined) updateData.defaultTermsAndConditions = data.defaultTermsAndConditions;
        if (data.defaultVatRate !== undefined) updateData.defaultVatRate = data.defaultVatRate;
        if (data.monthlyTargetAmount !== undefined) updateData.monthlyTargetAmount = data.monthlyTargetAmount;
        if (data.currency !== undefined) updateData.currency = data.currency;
        if (data.defaultExchangeRateUSD !== undefined) updateData.defaultExchangeRateUSD = data.defaultExchangeRateUSD;
        if (data.defaultExchangeRateEUR !== undefined) updateData.defaultExchangeRateEUR = data.defaultExchangeRateEUR;

        if (existing) {
            const settings = await prisma.settings.update({
                where: { id: existing.id },
                data: updateData
            });
            revalidatePath('/settings');
            return { success: true, data: settings };
        } else {
            const settings = await prisma.settings.create({
                data: updateData as Prisma.SettingsCreateInput
            });
            revalidatePath('/settings');
            return { success: true, data: settings };
        }
    } catch (error) {
        logger.error('Failed to update settings:', error);
        return { success: false, error: 'Ayarlar güncellenirken bir hata oluştu.' };
    }
}
