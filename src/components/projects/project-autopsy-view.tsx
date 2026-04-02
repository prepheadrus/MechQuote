'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getProjectAutopsy, ProjectAutopsyData } from '@/actions/project-autopsy';
import { 
    TrendingUp, 
    TrendingDown, 
    ArrowRightLeft, 
    AlertTriangle, 
    CheckCircle2, 
    Loader2,
    DollarSign,
    Package,
    HardHat,
    History,
    Wallet,
    Target,
    Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';

interface ProjectAutopsyViewProps {
    projectId: string;
}

export function ProjectAutopsyView({ projectId }: ProjectAutopsyViewProps) {
    const [data, setData] = useState<ProjectAutopsyData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const result = await getProjectAutopsy(projectId);
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || 'Veri yüklenemedi.');
            }
            setIsLoading(false);
        };
        fetchData();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Proje verileri karşılaştırılıyor...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <Card className="border-dashed">
                <CardContent className="p-12 text-center text-muted-foreground">
                    {error || 'Analiz için yeterli veri bulunamadı.'}
                </CardContent>
            </Card>
        );
    }

    const { estimated, actual, deviation, details } = data;

    return (
        <div className="space-y-6">
            {/* Simple Explanation Section - "Bilale Anlatır Gibi" */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                            <Wallet className="h-5 w-5" />
                            <CardTitle className="text-base font-bold">Dükkanın Gerçek Kasası</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm leading-relaxed">
                            Bu işten dükkanın cebine fiilen giren net para <strong className="text-blue-700 dark:text-blue-300">{formatCurrency(details.invoicedRevenue - actual.total)}</strong>'dir.
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                            (Hesap: {formatCurrency(details.invoicedRevenue)} Faturalanan Gelir - {formatCurrency(actual.total)} Toplam Masraf)
                        </p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-opacity-50",
                    details.profitDifference >= 0 ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"
                )}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Target className={cn("h-5 w-5", details.profitDifference >= 0 ? "text-green-600" : "text-red-600")} />
                            <CardTitle className="text-base font-bold">Planlama Başarın</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <p className="text-sm leading-relaxed">
                            Başta planladığın kâra göre <strong className={details.profitDifference >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(Math.abs(details.profitDifference))}</strong> {details.profitDifference >= 0 ? 'daha FAZLA kazandın.' : 'daha AZ kazandın.'}
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                            (Hesap: Beklenen kâr {formatCurrency(details.contractAmount - estimated.total)} idi, şu anki kâr {formatCurrency(details.invoicedRevenue - actual.total)})
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Header Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 dark:bg-slate-900/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Planlanan Toplam Maliyet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(estimated.total)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Teklif anındaki öngörü</p>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "border-2",
                    deviation.status === 'over' ? "border-red-200 bg-red-50 dark:bg-red-950/20" : 
                    deviation.status === 'under' ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-slate-200"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Gerçekleşen Toplam Maliyet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(actual.total)}</div>
                        <div className="flex items-center gap-1 mt-1">
                            {deviation.status === 'over' ? (
                                <>
                                    <TrendingUp className="h-3 w-3 text-red-600" />
                                    <span className="text-xs font-bold text-red-600">Planlanandan %{deviation.percentage.toFixed(1)} fazla</span>
                                </>
                            ) : deviation.status === 'under' ? (
                                <>
                                    <TrendingDown className="h-3 w-3 text-green-600" />
                                    <span className="text-xs font-bold text-green-600">Planlanandan %{Math.abs(deviation.percentage).toFixed(1)} daha az</span>
                                </>
                            ) : (
                                <span className="text-xs font-bold text-slate-500">Planlananla tam uyumlu</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Kâr Değişimi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn(
                            "text-2xl font-bold",
                            details.profitDifference >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                            {details.profitDifference > 0 ? '+' : ''}{formatCurrency(details.profitDifference)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Beklenen kâra göre sapma</p>
                    </CardContent>
                </Card>
            </div>

            {/* Breakdown Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Detailed Comparison Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5" /> Kategori Bazlı Karşılaştırma
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Materials */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <div className="flex items-center gap-2 text-blue-600"><Package className="h-4 w-4" /> Malzeme Maliyeti</div>
                                <div className="space-x-4">
                                    <span className="text-muted-foreground">Tahmin: {formatCurrency(estimated.materials)}</span>
                                    <span className="font-bold">Gerçek: {formatCurrency(actual.materials)}</span>
                                </div>
                            </div>
                            <Progress value={(actual.materials / estimated.materials) * 50} className="h-2" />
                        </div>

                        {/* Labor */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <div className="flex items-center gap-2 text-orange-600"><HardHat className="h-4 w-4" /> İşçilik & Usta Ödemeleri</div>
                                <div className="space-x-4">
                                    <span className="text-muted-foreground">Tahmin: {formatCurrency(estimated.labor)}</span>
                                    <span className="font-bold">Gerçek: {formatCurrency(actual.labor)}</span>
                                </div>
                            </div>
                            <Progress value={(actual.labor / (estimated.labor || 1)) * 50} className="h-2" />
                        </div>

                        {/* Other Expenses */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <div className="flex items-center gap-2 text-slate-600"><History className="h-4 w-4" /> Diğer Giderler (Sarf vb.)</div>
                                <div className="font-bold">Gerçek: {formatCurrency(actual.expenses)}</div>
                            </div>
                        </div>

                        {/* Analysis Note */}
                        <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs space-y-1">
                            <p className="font-bold flex items-center gap-1"><Zap className="h-3 w-3 text-amber-500" /> Nereden Kazandın / Kaybettin?</p>
                            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                {actual.materials > estimated.materials ? (
                                    <li className="text-red-600">Malzeme bütçeni <span className="font-bold">{formatCurrency(actual.materials - estimated.materials)}</span> aştın.</li>
                                ) : (
                                    <li className="text-green-600">Malzemeden <span className="font-bold">{formatCurrency(estimated.materials - actual.materials)}</span> tasarruf ettin.</li>
                                )}
                                {actual.labor > estimated.labor ? (
                                    <li className="text-red-600">İşçilik bütçeni <span className="font-bold">{formatCurrency(actual.labor - estimated.labor)}</span> aştın.</li>
                                ) : (
                                    <li className="text-green-600">İşçilikten <span className="font-bold">{formatCurrency(estimated.labor - actual.labor)}</span> tasarruf ettin.</li>
                                )}
                            </ul>
                        </div>
                    </CardContent>
                </Card>

                {/* Verdict Card */}
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg">Proje Karlılık Karnesi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-sm text-muted-foreground">Planlanan Marj</p>
                                <p className="text-xl font-bold">%{estimated.margin.toFixed(1)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Gerçekleşen Marj</p>
                                <p className={cn(
                                    "text-3xl font-black",
                                    actual.margin >= estimated.margin ? "text-green-600" : "text-red-600"
                                )}>%{actual.margin.toFixed(1)}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            {actual.margin >= estimated.margin ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                            ) : (
                                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
                            )}
                            <div>
                                <h4 className="font-bold text-sm">
                                    {actual.margin >= estimated.margin ? "Karlılık Beklentinin Üstünde" : "Karlılık Beklentinin Altında"}
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                    {actual.margin >= estimated.margin 
                                        ? "Bu projede satınalma ve saha yönetimi planlanandan daha verimli ilerledi. Kar marjınız hedefin üzerinde gerçekleşti."
                                        : "Malzeme veya işçilik giderleri planlanan bütçeyi aşmış görünüyor. Gelecek tekliflerde benzer kalemlerin maliyetlerini %" + Math.abs(deviation.percentage).toFixed(0) + " oranında revize etmeyi düşünebilirsiniz."}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
