'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Printer, FileDown } from "lucide-react";
import { getCustomerStatement } from '@/actions/customers';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface CustomerStatementViewProps {
    customerId: string;
}

export function CustomerStatementView({ customerId }: CustomerStatementViewProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const result = await getCustomerStatement(customerId);
            if (result.success && result.data) {
                setData(result.data);
            } else {
                setError(result.error || 'Veri yüklenemedi.');
            }
            setIsLoading(false);
        };
        fetchData();
    }, [customerId]);

    const handlePrint = () => {
        const printContent = document.getElementById('customer-statement-table');
        if (printContent && data) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                        <head>
                            <title>Cari Hesap Ekstresi - ${data.customer.name}</title>
                            <style>
                                body { font-family: sans-serif; padding: 40px; font-size: 12px; line-height: 1.6; }
                                table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                th, td { border: 1px solid #eee; padding: 12px 8px; text-align: left; }
                                th { background-color: #f9f9f9; color: #666; font-weight: bold; text-transform: uppercase; font-size: 10px; }
                                .text-right { text-align: right; }
                                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
                                .company-name { font-size: 24px; font-bold; margin: 0; }
                                .statement-title { font-size: 18px; color: #666; margin-top: 5px; }
                                .debt { color: #dc2626; }
                                .credit { color: #16a34a; }
                                .footer { margin-top: 50px; text-align: center; color: #999; font-size: 10px; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <div>
                                    <h1 class="company-name">${data.customer.name}</h1>
                                    <div class="statement-title">Cari Hesap Ekstresi</div>
                                    <p>VKN/TCKN: ${data.customer.taxId || '-'}</p>
                                </div>
                                <div class="text-right">
                                    <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                                    <p><strong>Güncel Bakiye: ${formatCurrency(data.finalBalance)}</strong></p>
                                </div>
                            </div>
                            ${printContent.outerHTML}
                            <div class="footer">
                                Bu belge sistem tarafından otomatik oluşturulmuştur.
                            </div>
                        </body>
                    </html>
                `);
                win.document.close();
                setTimeout(() => {
                    win.print();
                }, 500);
            }
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /><p className="mt-2 text-muted-foreground">Ekstre hazırlanıyor...</p></div>;
    }

    if (error || !data) {
        return <div className="p-12 text-center text-red-500">{error || 'Ekstre yüklenemedi.'}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Cari Ekstre</h3>
                    <p className="text-sm text-muted-foreground">Tüm fatura ve ödeme hareketlerinin detaylı dökümü.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Ekstre Yazdır (PDF)
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <div id="customer-statement-table">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[120px]">Tarih</TableHead>
                                    <TableHead>İşlem Açıklaması</TableHead>
                                    <TableHead>Referans</TableHead>
                                    <TableHead className="text-right">Borç (Satış)</TableHead>
                                    <TableHead className="text-right">Alacak (Tahsilat)</TableHead>
                                    <TableHead className="text-right font-bold">Bakiye</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.ledger.length > 0 ? (
                                    data.ledger.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-muted/30">
                                            <TableCell className="text-xs">{formatDate(item.date)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{item.description}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{item.type === 'Invoice' ? 'Fatura' : 'Ödeme/Kasa'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-[10px]">{item.reference}</TableCell>
                                            <TableCell className="text-right text-red-600 font-medium">
                                                {item.debt > 0 ? formatCurrency(item.debt) : '-'}
                                            </TableCell>
                                            <TableCell className="text-right text-green-600 font-medium">
                                                {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                                            </TableCell>
                                            <TableCell className={cn(
                                                "text-right font-bold text-sm",
                                                item.balance > 0 ? "text-red-700" : item.balance < 0 ? "text-green-700" : ""
                                            )}>
                                                {formatCurrency(item.balance)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            Henüz bir hesap hareketi bulunmuyor.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end p-4 bg-muted/20 rounded-lg border border-dashed">
                <div className="text-right space-y-1">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Net Bakiye Durumu</span>
                    <div className={cn(
                        "text-2xl font-black",
                        data.finalBalance > 0 ? "text-red-600" : data.finalBalance < 0 ? "text-green-600" : "text-slate-600"
                    )}>
                        {formatCurrency(data.finalBalance)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        {data.finalBalance > 0 ? 'Müşteri size borçlu' : data.finalBalance < 0 ? 'Sizin müşteriye borcunuz/fazla tahsilatınız var' : 'Hesap kapalı'}
                    </p>
                </div>
            </div>
        </div>
    );
}
