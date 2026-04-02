'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Package,
    ArrowDownLeft,
    ArrowUpRight,
    AlertTriangle,
    Search,
    History,
    Warehouse,
    TrendingUp,
    TrendingDown,
    Box
} from "lucide-react";
import { getWarehouseStock, getStockMovements } from '@/actions/warehouse';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function WarehouseClientPage() {
    const [data, setData] = useState<any>(null);
    const [movements, setMovements] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const stockRes = await getWarehouseStock();
            const moveRes = await getStockMovements();
            if (stockRes.success) setData(stockRes.data);
            if (moveRes.success) setMovements(moveRes.data as any[]);
            setIsLoading(false);
        };
        fetchData();
    }, []);

    const filteredProducts = useMemo(() => {
        if (!data?.products) return [];
        return data.products.filter((p: any) =>
            p.name.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) ||
            p.brand?.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'))
        );
    }, [data, searchTerm]);

    if (isLoading) return <div className="p-12 text-center">Yükleniyor...</div>;

    return (
        <div className="p-8 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Depo ve Stok Yönetimi</h1>
                    <p className="text-muted-foreground mt-1">Malzeme stoklarını, rezervasyonları ve hareketleri takip edin.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Ürün Çeşidi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.stats.totalItems}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Kritik Stok Uyarıları</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", data?.stats.criticalCount > 0 ? "text-red-600" : "text-green-600")}>
                            {data?.stats.criticalCount}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-primary/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-primary">Tahmini Stok Değeri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(data?.stats.totalValue)}</div>
                        <p className="text-[10px] text-muted-foreground italic">Alış fiyatları üzerinden hesaplanmıştır.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Son 24 Saat Hareket</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{movements.length}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Mevcut Stok Listesi</CardTitle>
                            <div className="relative w-64">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Ürün veya marka ara..."
                                    className="pl-8 h-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ürün / Marka</TableHead>
                                    <TableHead className="text-right">Fiziksel Stok</TableHead>
                                    <TableHead className="text-right">Rezerve</TableHead>
                                    <TableHead className="text-right">Kullanılabilir</TableHead>
                                    <TableHead>Durum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((p: any) => {
                                    const available = p.stockQuantity - p.reservedQuantity;
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>
                                                <div className="font-medium">{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.brand}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold">{p.stockQuantity} {p.unit}</TableCell>
                                            <TableCell className="text-right font-mono text-orange-600">{p.reservedQuantity}</TableCell>
                                            <TableCell className={cn(
                                                "text-right font-mono font-black",
                                                available < 0 ? "text-red-600" : "text-green-600"
                                            )}>{available}</TableCell>
                                            <TableCell>
                                                {p.stockQuantity <= p.minStockLevel && p.minStockLevel > 0 ? (
                                                    <Badge variant="destructive" className="gap-1">
                                                        <AlertTriangle className="h-3 w-3" /> Kritik
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">Normal</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Son Hareketler</CardTitle>
                        <CardDescription>Depoya giren ve çıkan malzemeler.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-4 p-4">
                            {movements.map((m: any) => (
                                <div key={m.id} className="flex items-start gap-3 border-b pb-3 last:border-0">
                                    <div className={cn(
                                        "p-2 rounded-lg shrink-0",
                                        m.type.includes('IN') ? "bg-green-100" : "bg-orange-100"
                                    )}>
                                        {m.type.includes('IN') ?
                                            <ArrowDownLeft className="h-4 w-4 text-green-600" /> :
                                            <Box className="h-4 w-4 text-orange-600" />
                                        }
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{m.product.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{m.description}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-xs font-black",
                                                m.type.includes('IN') ? "text-green-600" : "text-orange-600"
                                            )}>{m.quantity > 0 ? '+' : ''}{m.quantity} {m.product.unit}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
