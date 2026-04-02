/**
 * Project Financials Component
 * 
 * Proje finansal özet kartları
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectFinancialsProps {
    financials: {
        contractAmount: number;
        invoicedIncome: number;
        grossCost: number;
        returnedAmount: number;
        netCost: number;
        profit: number;
        margin: number;
    };
}

export function ProjectFinancials({ financials }: ProjectFinancialsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
        }).format(amount);
    };

    const cards = [
        {
            title: 'Sözleşme Tutarı',
            value: financials.contractAmount,
            icon: DollarSign,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Faturalanan',
            value: financials.invoicedIncome,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            title: 'Toplam Maliyet',
            value: financials.grossCost,
            icon: TrendingDown,
            color: 'text-red-600',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
        },
        {
            title: 'Net Kâr',
            value: financials.profit,
            icon: Wallet,
            color: financials.profit >= 0 ? 'text-green-600' : 'text-red-600',
            bgColor: financials.profit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <div className={cn('p-2 rounded-lg', card.bgColor)}>
                                <Icon className={cn('h-4 w-4', card.color)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className={cn('text-2xl font-bold', card.color)}>
                                {formatCurrency(card.value)}
                            </div>
                            {card.title === 'Net Kâr' && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Marj: %{financials.margin.toFixed(1)}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
