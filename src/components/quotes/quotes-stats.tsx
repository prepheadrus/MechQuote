/**
 * Quotes Statistics Component
 * 
 * Teklif istatistik kartları
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, CheckCircle, TrendingUp, DollarSign } from 'lucide-react';
import { SarrafDisplay } from '@/components/quotes/quote-utils';

interface QuotesStatsProps {
    analytics?: {
        totalProposals: number;
        approvedProposals: number;
        totalValue: number;
        averageValue: number;
        conversionRate: number;
    };
    isLoading: boolean;
}

export function QuotesStats({ analytics, isLoading }: QuotesStatsProps) {
    if (!analytics) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Yükleniyor...</CardTitle>
                            <Skeleton className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-3/4" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {/* Toplam Teklif */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Toplam Teklif</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalProposals}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Tüm zamanlar
                    </p>
                </CardContent>
            </Card>

            {/* Onaylanan Teklifler */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Onaylanan</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{analytics.approvedProposals}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Başarı oranı: %{((analytics.approvedProposals / analytics.totalProposals) * 100).toFixed(1)}
                    </p>
                </CardContent>
            </Card>

            {/* Toplam Değer */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Toplam Değer</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <SarrafDisplay
                        amount={analytics.totalValue}
                        size="lg"
                        className="text-2xl font-bold text-blue-700"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        KDV hariç
                    </p>
                </CardContent>
            </Card>

            {/* Ortalama Değer */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ortalama</CardTitle>
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <SarrafDisplay
                        amount={analytics.averageValue}
                        size="lg"
                        className="text-2xl font-bold text-orange-700"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Teklif başına
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
