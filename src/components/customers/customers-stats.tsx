/**
 * Customers Statistics Component
 * 
 * Müşteri istatistik kartları
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, Award, BarChart } from 'lucide-react';

interface CustomersStatsProps {
    stats?: {
        totalCustomers: number;
        activeCustomers: number;
        topCustomer: { name: string; value: number };
        averageValue: number;
    };
    isLoading: boolean;
}

export function CustomersStats({ stats, isLoading }: CustomersStatsProps) {
    const cards = [
        {
            title: 'Toplam Müşteri',
            value: stats?.totalCustomers || 0,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            title: 'Aktif Müşteri',
            value: stats?.activeCustomers || 0,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
        },
        {
            title: 'En Değerli',
            value: stats?.topCustomer?.name || '-',
            subValue: stats?.topCustomer?.value ? `₺${stats.topCustomer.value.toLocaleString('tr-TR')}` : undefined,
            icon: Award,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        },
        {
            title: 'Ortalama Değer',
            value: stats?.averageValue ? `₺${stats.averageValue.toLocaleString('tr-TR')}` : '-',
            icon: BarChart,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <Card key={card.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                            <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                <Icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-8 w-3/4" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{card.value}</div>
                                    {card.subValue && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {card.subValue}
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
