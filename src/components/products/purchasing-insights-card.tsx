'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, TrendingUp, TrendingDown, Building2, Loader2, AlertCircle } from "lucide-react";
import { getPurchasingInsights, PurchasingInsight } from '@/actions/purchasing-analysis';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PurchasingInsightsCardProps {
    productId: string;
    initialData?: PurchasingInsight;
}

export function PurchasingInsightsCard({ productId, initialData }: PurchasingInsightsCardProps) {
    const [insight, setInsight] = useState<PurchasingInsight | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) return;

        const fetchInsights = async () => {
            setIsLoading(true);
            try {
                const result = await getPurchasingInsights(productId);
                if (result.success && result.data) {
                    setInsight(result.data);
                } else {
                    setError(result.error || 'Analiz yapılamadı.');
                }
            } catch (err) {
                setError('Veri çekme hatası.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsights();
    }, [productId, initialData]);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

    if (isLoading) {
        return (
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-12 flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Satınalma verileri analiz ediliyor...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !insight) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">{error || 'Yeterli veri bulunmuyor.'}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="relative overflow-hidden border-primary/30 shadow-lg bg-gradient-to-br from-white to-primary/5 dark:from-slate-950 dark:to-primary/10">
            <div className="absolute top-0 right-0 p-4">
                {insight.isAiSupported ? (
                    <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">AI Online</span>
                        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                ) : (
                    <div className="flex items-center gap-1 opacity-50">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Local Analysis</span>
                    </div>
                )}
            </div>

            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                        "border-primary/20",
                        insight.isAiSupported ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"
                    )}>
                        {insight.isAiSupported ? 'Yapay Zeka Destekli' : 'İstatistiksel Analiz'}
                    </Badge>
                </div>
                <CardTitle className="text-xl font-bold mt-2">Akıllı Satınalma Önerisi</CardTitle>
                <CardDescription>{insight.summary}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-primary/10">
                    <p className="text-sm leading-relaxed font-medium italic text-slate-800 dark:text-slate-200">
                        "{insight.isAiSupported ? insight.advice : insight.localAdvice}"
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">En Uygun Kaynak</span>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span className="font-bold text-sm truncate">{insight.cheapestSupplier}</span>
                        </div>
                        <p className="text-xs text-green-600 font-bold">{formatCurrency(insight.bestPrice)}</p>
                    </div>

                    <div className="space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Fiyat Trendi</span>
                        <div className="flex items-center gap-2">
                            {insight.trend === 'up' ? (
                                <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : insight.trend === 'down' ? (
                                <TrendingDown className="h-4 w-4 text-green-500" />
                            ) : (
                                <div className="h-1 w-4 bg-slate-400 rounded" />
                            )}
                            <span className={cn(
                                "font-bold text-sm",
                                insight.trend === 'up' ? "text-red-500" :
                                    insight.trend === 'down' ? "text-green-500" : "text-slate-500"
                            )}>
                                {insight.trend === 'up' ? 'Yükseliş' :
                                    insight.trend === 'down' ? 'Düşüş' : 'Sabit'}
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Ortalama: {formatCurrency(insight.avgPrice)}</p>
                    </div>
                </div>

                {insight.priceVolatility > 15 && (
                    <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3" />
                            <span className="text-[10px] font-bold uppercase">Yüksek Fiyat Oynaklığı (%{insight.priceVolatility.toFixed(0)})</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Bu üründe tedarikçiler arası fiyat farkı çok yüksek. Pazarlık payı olabilir.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
