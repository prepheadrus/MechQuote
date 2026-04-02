'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, TrendingDown, TrendingUp, History } from "lucide-react";
import { getQuickPurchasingInsight } from '@/actions/quick-insight';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/components/workspace/workspace-context';
import { Button } from '@/components/ui/button';

interface PurchasingAlertProps {
    productId: string;
    currentCost: number;
    currentCurrency: string;
    insightData?: any;
}

export function PurchasingAlert({ productId, currentCost, currentCurrency, insightData }: PurchasingAlertProps) {
    const { openPeek } = useWorkspace();

    if (!insightData || !productId || productId.startsWith('custom_')) return null;

    const { best, latest } = insightData;

    const formatCurrency = (amount: number, currency: string) => {
        const c = currency === 'TL' ? 'TRY' : currency;
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c }).format(amount);
    };

    // Logic 1: Significant Savings Opportunity (Compared to BEST price)
    const isCheaperAvailable = best && best.price < currentCost * 0.95;
    
    // Logic 2: Cost Inflation Alert (Compared to LATEST price)
    const costDiffPercent = latest ? ((currentCost - latest.price) / latest.price) * 100 : 0;
    const isCostHigher = latest && costDiffPercent > 2; // > 2% increase

    if (!isCheaperAvailable && !isCostHigher) return null;

    return (
        <div className={cn(
            "group/alert flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold animate-in fade-in slide-in-from-left-2 duration-300",
            isCostHigher 
                ? "bg-red-50 border-red-200 text-red-700" 
                : "bg-amber-50 border-amber-200 text-amber-700"
        )}>
            {isCostHigher ? (
                <>
                    <TrendingUp className="h-3 w-3 text-red-500 animate-bounce" />
                    <span>
                        Maliyet Artmış! (Son: {latest.supplierName} @ {formatCurrency(latest.price, latest.currency)} - %{costDiffPercent.toFixed(0)} Fazla)
                    </span>
                </>
            ) : (
                <>
                    <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />
                    <span>
                        Daha ucuza alabilirsin! ({best.supplierName}: {formatCurrency(best.price, best.currency)})
                    </span>
                </>
            )}
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 ml-1 opacity-0 group-hover/alert:opacity-100 transition-opacity p-0"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openPeek(`/products/${productId}`, 'Ürün Fiyat Geçmişi');
                }}
            >
                <History className="h-2.5 w-2.5" />
            </Button>
        </div>
    );
}
