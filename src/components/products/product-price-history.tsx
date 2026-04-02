"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Calendar, Building2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { PurchaseHistory } from "@prisma/client";

interface ProductPriceHistoryProps {
    history: PurchaseHistory[];
    analytics?: {
        totalSold: number;
        totalRevenue: number;
        avgProfitMargin: number;
        saleCount: number;
    };
}

export function ProductPriceHistory({ history, analytics }: ProductPriceHistoryProps) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);

    if (!history) return <div className="p-4 text-center text-muted-foreground">Yükleniyor...</div>;

    const sortedByPrice = history.length > 0 ? [...history].sort((a, b) => a.netPrice - b.netPrice) : [];
    const bestPrice = sortedByPrice.length > 0 ? sortedByPrice[0] : null;
    const lastPurchase = history.length > 0 ? history[0] : null;

    // Calculate trend compared to previous purchase (which is history[1] since we are desc)
    const previousPurchase = history.length > 1 ? history[1] : null;
    let trend = 'stable';
    if (lastPurchase && previousPurchase) {
        if (lastPurchase.netPrice > previousPurchase.netPrice) trend = 'up';
        if (lastPurchase.netPrice < previousPurchase.netPrice) trend = 'down';
    }

    return (
        <div className="space-y-6">
            {/* Sales Analysis Section */}
            {analytics && (
                <div className="space-y-4 mb-8">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Satış Analizi
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Satış Adedi</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{analytics.totalSold}</div>
                                <p className="text-xs text-muted-foreground">{analytics.saleCount} adet teklifte</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ciro (Tahmini)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(analytics.totalRevenue)}</div>
                                <p className="text-xs text-muted-foreground">Onaylanan tekliflerden</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Ort. Kar Marjı</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">%{analytics.avgProfitMargin.toFixed(1)}</div>
                                <p className="text-xs text-muted-foreground">Ortalama karlılık</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bestPrice ? (
                    <Card className="bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-400 flex items-center gap-2">
                                <TrendingDown className="h-4 w-4" /> En Uygun Tedarikçi
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                                {formatCurrency(bestPrice.netPrice)}
                            </div>
                            <div className="text-sm text-green-600 dark:text-green-400 mt-1 flex flex-col">
                                <span className="font-semibold">{bestPrice.supplierName}</span>
                                <span className="text-xs opacity-80">{format(new Date(bestPrice.date), 'd MMMM yyyy', { locale: tr })}</span>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
                            <span className="text-sm">Tedarikçi verisi yok</span>
                        </CardContent>
                    </Card>
                )}

                {lastPurchase ? (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Son Satın Alma
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-baseline justify-between">
                                <div className="text-2xl font-bold">
                                    {formatCurrency(lastPurchase.netPrice)}
                                </div>
                                {trend === 'up' && <Badge variant="destructive" className="ml-2"><TrendingUp className="h-3 w-3 mr-1" /> Artış</Badge>}
                                {trend === 'down' && <Badge variant="default" className="ml-2 bg-green-600"><TrendingDown className="h-3 w-3 mr-1" /> Düşüş</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-col">
                                <span>{lastPurchase.supplierName}</span>
                                <span className="text-xs">{format(new Date(lastPurchase.date), 'd MMMM yyyy', { locale: tr })}</span>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="flex flex-col items-center justify-center h-full py-6 text-muted-foreground">
                            <span className="text-sm">Satın alma geçmişi yok</span>
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Satın Alma Geçmişi</CardTitle>
                    <CardDescription>
                        Farklı tedarikçilerden yapılan alımların fiyat karşılaştırması.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                <TableHead>Tedarikçi</TableHead>
                                <TableHead className="text-right">Liste Fiyatı</TableHead>
                                <TableHead className="text-right">İskonto</TableHead>
                                <TableHead className="text-right">Net Birim Fiyat</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        Kayıt bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium text-xs">
                                            {format(new Date(record.date), 'd MMM yyyy', { locale: tr })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                                {record.supplierName || '-'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs line-through">
                                            {formatCurrency(record.listPrice)}
                                        </TableCell>
                                        <TableCell className="text-right text-xs">
                                            {(() => {
                                                const rate = record.listPrice > 0
                                                    ? ((record.listPrice - record.netPrice) / record.listPrice) * 100
                                                    : 0;
                                                return `%${rate.toFixed(1).replace(/\.0$/, '')}`;
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(record.netPrice)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
