'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    Users,
    Briefcase,
    DollarSign,
    Target,
    AlertCircle,
    HardHat,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from "lucide-react";
import { getMasterAnalytics, MasterAnalyticsData } from '@/actions/master-analytics';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MasterAnalyticsClientPage() {
    const [data, setData] = useState<MasterAnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const res = await getMasterAnalytics();
            if (res.success && res.data) setData(res.data);
            else setError(res.error || 'Veri yüklenemedi.');
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) return <div className="p-12 flex flex-col items-center justify-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Master rapor hazırlanıyor...</p></div>;
    if (error || !data) return <div className="p-12 text-center text-destructive">{error}</div>;

    return (
        <div className="flex-1 h-full overflow-y-auto p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Master Karlılık Analizi</h1>
                <p className="text-muted-foreground mt-1">Portföy genelinde finansal performans ve operasyonel röntgen.</p>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam Portföy Cirosu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">{formatCurrency(data.overall.totalRevenue)}</div>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">KDV Hariç Satışlar</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Toplam Net Kâr</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-green-600">{formatCurrency(data.overall.totalProfit)}</div>
                        <div className="flex items-center gap-1 mt-1 text-xs font-bold">
                            <Target className="h-3 w-3" /> %{data.overall.overallMargin.toFixed(1)} Ortalama Marj
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bütçe Sapması</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-3xl font-black",
                            data.overall.totalActualCost > data.overall.totalEstimatedCost ? "text-red-600" : "text-green-600"
                        )}>
                            {formatCurrency(data.overall.totalActualCost - data.overall.totalEstimatedCost)}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Tahmin vs Fiili Farkı</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Aktif Proje Sayısı</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black">
                            {data.projects.filter(p => [
                                'SOZLESME_ASAMASI', 'PROJE_PLANLAMA', 'MALZEME_TEDARIK',
                                'SAHA_MOBILIZASYONU', 'MONTAJ_VE_IMALAT', 'TEST_VE_DEVREYE_ALMA'
                            ].includes(p.status)).length}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">Devam Eden Şantiyeler</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="projects" className="space-y-6">
                <TabsList className="bg-muted/50 p-1">
                    <TabsTrigger value="projects" className="gap-2"><Briefcase className="h-4 w-4" /> Proje Bazlı</TabsTrigger>
                    <TabsTrigger value="customers" className="gap-2"><Users className="h-4 w-4" /> Müşteri Bazlı</TabsTrigger>
                    <TabsTrigger value="personnel" className="gap-2"><HardHat className="h-4 w-4" /> Ekip Performansı</TabsTrigger>
                </TabsList>

                {/* PROJECT ANALYSIS */}
                <TabsContent value="projects">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tüm Projeler Karlılık Listesi</CardTitle>
                            <CardDescription>Planlanan vs Gerçekleşen maliyetlerin proje bazlı dökümü.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead>Proje Adı / Müşteri</TableHead>
                                        <TableHead className="text-right">Sözleşme</TableHead>
                                        <TableHead className="text-right">Tahmin</TableHead>
                                        <TableHead className="text-right">Gerçek</TableHead>
                                        <TableHead className="text-right">Sapma</TableHead>
                                        <TableHead className="text-right">Net Kâr</TableHead>
                                        <TableHead className="text-right">Marj</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.projects.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="font-bold">{p.name}</div>
                                                <div className="text-xs text-muted-foreground uppercase">{p.customer}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium">{formatCurrency(p.contractAmount)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatCurrency(p.estCost)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{formatCurrency(p.actCost)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className={cn(
                                                    "flex items-center justify-end gap-1 font-bold text-xs",
                                                    p.deviation > 0 ? "text-red-600" : "text-green-600"
                                                )}>
                                                    {p.deviation > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                                    %{Math.abs(p.deviation).toFixed(1)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-black text-blue-700">{formatCurrency(p.profit)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={p.margin < 15 ? "destructive" : "secondary"} className="font-mono">
                                                    %{p.margin.toFixed(1)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CUSTOMER ANALYSIS */}
                <TabsContent value="customers">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <Card>
                                <CardHeader><CardTitle>En Kârlı Müşteriler</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Müşteri</TableHead>
                                                <TableHead className="text-right">Proje</TableHead>
                                                <TableHead className="text-right">Ciro</TableHead>
                                                <TableHead className="text-right">Toplam Kâr</TableHead>
                                                <TableHead className="text-right">Ort. Marj</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {data.customers.sort((a, b) => b.totalProfit - a.totalProfit).map(c => (
                                                <TableRow key={c.name}>
                                                    <TableCell className="font-bold">{c.name}</TableCell>
                                                    <TableCell className="text-right">{c.projectCount}</TableCell>
                                                    <TableCell className="text-right font-mono text-xs">{formatCurrency(c.totalRevenue)}</TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-green-700">{formatCurrency(c.totalProfit)}</TableCell>
                                                    <TableCell className="text-right font-mono font-black">%{c.avgMargin.toFixed(1)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-600" /> Stratejik Uyarı</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                                        Portföy ortalaması olan **%{data.overall.overallMargin.toFixed(1)}** marjın altında kalan müşterilerle yapılan sözleşmelerde birim fiyatları veya reçete maliyetlerini gözden geçirmeniz önerilir.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* PERSONNEL PERFORMANCE */}
                <TabsContent value="personnel">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ekip Bütçe Sadakati</CardTitle>
                            <CardDescription>Usta bazlı hakediş tahminleri ile fiili ödemelerin karşılaştırması.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ekip / Usta Adı</TableHead>
                                        <TableHead className="text-right">Proje Adedi</TableHead>
                                        <TableHead className="text-right">Planlanan Hakediş</TableHead>
                                        <TableHead className="text-right">Fiili Ödenen</TableHead>
                                        <TableHead className="text-right">Bütçe Sapması</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.personnel.map(p => (
                                        <TableRow key={p.name}>
                                            <TableCell className="font-bold">{p.name}</TableCell>
                                            <TableCell className="text-right">{p.projectCount}</TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(p.totalEstimatedLabor)}</TableCell>
                                            <TableCell className="text-right font-mono font-bold">{formatCurrency(p.totalActualLabor)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={p.deviation > 10 ? "destructive" : (p.deviation > 0 ? "outline" : "default")} className="font-mono">
                                                    {p.deviation > 0 ? '+' : ''}%{p.deviation.toFixed(1)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
