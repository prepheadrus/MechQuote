/**
 * Quote Utility Functions
 * 
 * Teklif hesaplama, validasyon ve helper fonksiyonları
 */

'use client';

import * as z from 'zod';
import React from 'react';
import { ProposalItem } from '@prisma/client';
import { calculateItemTotals } from '@/lib/pricing';
import { cn } from '@/lib/utils';

// ==================== VALIDATION SCHEMAS ====================

export const proposalItemSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    productId: z.coerce.string().min(1, 'Ürün seçimi zorunludur.'),
    name: z.string(),
    brand: z.string(),
    model: z.string().optional(),
    quantity: z.coerce.number().min(0.01, 'Miktar 0 olamaz.'),
    unit: z.string(),
    listPrice: z.coerce.number(),
    currency: z.enum(['TRY', 'USD', 'EUR', 'TL']).transform(val => val === 'TL' ? 'TRY' : val),
    discountRate: z.coerce.number().min(0).max(1),
    profitMargin: z.coerce.number().min(0),
    groupName: z.string().default('Diğer'),
    basePrice: z.coerce.number().default(0), // Alış fiyatı
    vatRate: z.coerce.number().default(0.20),
    priceIncludesVat: z.boolean().default(false),
    orderIndex: z.coerce.number(),
});

export const proposalSchema = z.object({
    projectName: z.string().min(1, 'Proje adı zorunludur.'),
    versionNote: z.string().optional(),
    termsAndConditions: z.string().optional(),
    items: z.array(proposalItemSchema),
    exchangeRates: z.object({
        USD: z.coerce.number(),
        EUR: z.coerce.number()
    })
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
export type ProposalItemFormValues = z.infer<typeof proposalItemSchema>;

// ==================== CONSTANTS ====================

export const initialColumnVisibility = {
    name: true,
    brand: true,
    model: true,
    quantity: true,
    listPrice: true,
    discountRate: false,
    cost: false,
    profitMargin: true,
    unitPrice: true,
    total: true,
    actions: true,
};

export type ColumnVisibility = typeof initialColumnVisibility;
export type ColumnKey = keyof ColumnVisibility;

export const tableHeaders: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: 'Ürün Tanımı' },
    { key: 'brand', label: 'Marka' },
    { key: 'model', label: 'Model' },
    { key: 'quantity', label: 'Miktar' },
    { key: 'listPrice', label: 'Liste Fiyatı' },
    { key: 'discountRate', label: 'İskonto' },
    { key: 'cost', label: 'Maliyet' },
    { key: 'profitMargin', label: 'Kâr (%/Tutar)' },
    { key: 'unitPrice', label: 'Birim Fiyat (TL)' },
    { key: 'total', label: 'Toplam (TL)' },
    { key: 'actions', label: 'İşlemler' },
];

export const currencyCycle: Record<'TRY' | 'USD' | 'EUR', 'TRY' | 'USD' | 'EUR'> = {
    'TRY': 'USD',
    'USD': 'EUR',
    'EUR': 'TRY'
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Format currency with Turkish locale
 */
export const formatCurrency = (amount: number, currency: string = 'TRY') => {
    const validCurrency = currency === 'TL' ? 'TRY' : currency;
    const parts = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: validCurrency as any,
        minimumFractionDigits: 2
    }).formatToParts(amount || 0);

    return parts.map(part => {
        if (part.type === 'currency') return ` ${part.value}`;
        return part.value;
    }).join('').trim();
};

/**
 * Format number with Turkish locale
 */
export const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(amount);
};

/**
 * Find last index of array element matching predicate
 */
export function findLastIndex<T>(
    array: Array<T>, 
    predicate: (value: T, index: number, obj: T[]) => boolean
): number {
    let l = array.length;
    while (l--) {
        if (predicate(array[l], l, array))
            return l;
    }
    return -1;
}

// ==================== CALCULATION FUNCTIONS ====================

/**
 * Calculate totals for all quote items
 */
export const calculateAllTotals = (
    items: Partial<ProposalItem>[] | undefined, 
    rates: { USD: number; EUR: number } | undefined
) => {
    const initialTotals = {
        grandTotalSellExVAT: 0,
        grandTotalCost: 0,
        vatAmount: 0,
        grandTotalDiscount: 0,
        grandTotalListPrice: 0,
        groupTotals: {} as Record<string, {
            totalSellInTRY: number;
            totalCostInTRY: number;
            totalsByCurrency: { TRY: number; USD: number; EUR: number; };
        }>,
        grandTotalSellWithVAT: 0,
        grandTotalProfit: 0,
        grandTotalProfitMargin: 0,
        averageDiscountRate: 0,
        averageVatRate: 0
    };

    if (!items || !rates) return initialTotals;

    const totals = items.reduce((acc, item) => {
        // Safe check for essential properties
        if (!item || item.quantity === undefined || item.listPrice === undefined) return acc;

        const currency = item.currency || 'TRY';
        const exchangeRate = currency === 'USD' ? rates.USD : currency === 'EUR' ? rates.EUR : 1;

        const itemTotals = calculateItemTotals({
            ...item,
            listPrice: item.listPrice || 0,
            basePrice: item.basePrice || 0,
            discountRate: item.discountRate || 0,
            profitMargin: item.profitMargin || 0,
            vatRate: item.vatRate || 0,
            quantity: item.quantity || 0,
            priceIncludesVat: item.priceIncludesVat || false,
            exchangeRate: exchangeRate,
        });

        const vatDivisor = 1 + (item.vatRate || 0);
        const netListPrice = item.priceIncludesVat ? (item.listPrice || 0) / vatDivisor : (item.listPrice || 0);

        const quantity = item.quantity || 0;
        const totalNetListPriceInTRY = netListPrice * exchangeRate * quantity;
        acc.grandTotalListPrice += totalNetListPriceInTRY;

        const itemDiscountAmount = netListPrice * (item.discountRate || 0);
        const itemDiscountInTRY = itemDiscountAmount * exchangeRate * quantity;
        acc.grandTotalDiscount += itemDiscountInTRY;

        acc.grandTotalSellExVAT += itemTotals.totalTlSell;
        acc.grandTotalCost += itemTotals.totalTlCost;
        acc.vatAmount += itemTotals.totalVatAmount;

        const groupName = item.groupName || 'Diğer';
        if (!acc.groupTotals[groupName]) {
            acc.groupTotals[groupName] = {
                totalSellInTRY: 0,
                totalCostInTRY: 0,
                totalsByCurrency: { TRY: 0, USD: 0, EUR: 0 }
            };
        }

        const itemOriginalTotal = itemTotals.originalSellPrice * quantity;

        acc.groupTotals[groupName].totalSellInTRY += itemTotals.totalTlSell;
        acc.groupTotals[groupName].totalCostInTRY += itemTotals.totalTlCost;

        // Ensure currency key exists in accumulator
        if ((acc.groupTotals[groupName].totalsByCurrency as any)[currency] !== undefined) {
            (acc.groupTotals[groupName].totalsByCurrency as any)[currency] += itemOriginalTotal;
        }

        return acc;
    }, initialTotals);

    const grandTotalProfit = totals.grandTotalSellExVAT - totals.grandTotalCost;
    const grandTotalProfitMargin = totals.grandTotalSellExVAT > 0 ? grandTotalProfit / totals.grandTotalSellExVAT : 0;
    const grandTotalSellWithVAT = totals.grandTotalSellExVAT + totals.vatAmount;
    const averageDiscountRate = totals.grandTotalListPrice > 0 ? totals.grandTotalDiscount / totals.grandTotalListPrice : 0;
    const averageVatRate = totals.grandTotalSellExVAT > 0 ? totals.vatAmount / totals.grandTotalSellExVAT : 0;

    return {
        groupTotals: totals.groupTotals,
        grandTotalSellExVAT: totals.grandTotalSellExVAT,
        grandTotalSellWithVAT,
        vatAmount: totals.vatAmount,
        grandTotalCost: totals.grandTotalCost,
        grandTotalProfit,
        grandTotalProfitMargin,
        grandTotalDiscount: totals.grandTotalDiscount,
        averageDiscountRate,
        averageVatRate,
    };
};

// ==================== UI COMPONENTS ====================

/**
 * Sarraf Display Component - Shows currency amounts with proper formatting
 */
export const SarrafDisplay = ({ 
    amount, 
    currency = 'TRY', 
    className = "", 
    size = "md" 
}: { 
    amount: number | null | undefined, 
    currency?: string, 
    className?: string, 
    size?: 'sm' | 'md' | 'lg' | 'xl' 
}) => {
    const validCurrency = (currency || 'TRY').toUpperCase() === 'TL' ? 'TRY' : (currency || 'TRY');
    let parts: Intl.NumberFormatPart[] = [];
    try {
        parts = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: validCurrency as any,
            minimumFractionDigits: 2
        }).formatToParts(amount || 0);
    } catch (e) {
        return <span className={className}>{amount || 0} {currency}</span>;
    }

    const sizeClasses = {
        sm: "text-[11px]",
        md: "text-sm",
        lg: "text-xl",
        xl: "text-4xl"
    };

    return (
        <span className={cn("inline-flex items-baseline tabular-nums font-bold tracking-tight", sizeClasses[size], className)}>
            {parts.map((part, i) => (
                <span key={i} className={part.type === 'currency' ? 'text-[0.7em] font-medium opacity-50 ml-1 order-last' : ''}>
                    {part.value}
                </span>
            ))}
        </span>
    );
};
