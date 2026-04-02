'use client';

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDown, Calculator, Search, TrendingUp } from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConsolidatedInvoiceDialogProps {
    invoices: any[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ConsolidatedInvoiceDialog({ invoices, open, onOpenChange }: ConsolidatedInvoiceDialogProps) {
    const { toast } = useToast();
    const [globalTarget, setGlobalTarget] = useState<number | ''>('');
    const [invoiceTargets, setInvoiceTargets] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        invoices.forEach(inv => {
            initial[inv.id] = (inv.totalAmount || 0) * 1.25; // Default 25% margin
        });
        return initial;
    });

    // 1. Calculate Summary (Invoices)
    const summary = useMemo(() => {
        let totalCost = 0;
        let totalTarget = 0;

        const processedInvoices = invoices.map(inv => {
            const cost = inv.totalAmount || 0;
            const target = invoiceTargets[inv.id] || cost;
            const margin = cost > 0 ? (target / cost) - 1 : 0;

            totalCost += cost;
            totalTarget += target;

            return {
                ...inv,
                cost,
                target,
                margin
            };
        });

        const effectiveGlobalTarget = typeof globalTarget === 'number' ? globalTarget : totalTarget;
        const globalMargin = totalCost > 0 ? (effectiveGlobalTarget / totalCost) - 1 : 0;

        return {
            invoices: processedInvoices,
            totalCost,
            totalTarget,
            globalMargin,
            isUsingGlobal: typeof globalTarget === 'number' && globalTarget > 0
        };
    }, [invoices, invoiceTargets, globalTarget]);

    // 2. Calculate and Merge Items
    const items = useMemo(() => {
        const mergedItems: Map<string, any> = new Map();

        invoices.forEach(inv => {
            const company = inv.type === 'Incoming' ? inv.senderName : inv.receiverName;
            const invMargin = summary.invoices.find(i => i.id === inv.id)?.margin || 0;

            (inv.items || []).forEach((item: any) => {
                const qty = Number(item.quantity || 0);
                const unitCost = Number(item.unitPrice || 0);
                let vatRate = Number(item.vatRate || (item.taxRate || 0));
                if (vatRate > 1) vatRate = vatRate / 100;

                const appliedMargin = summary.isUsingGlobal ? summary.globalMargin : invMargin;
                const salesUnitNet = unitCost * (1 + appliedMargin);

                const priceKey = salesUnitNet.toFixed(2);
                const groupKey = `${item.name}-${item.brand || ''}-${item.model || ''}-${vatRate}-${priceKey}`;

                if (mergedItems.has(groupKey)) {
                    const existing = mergedItems.get(groupKey);
                    existing.qty += qty;
                    existing.lineNetCost += (unitCost * qty);
                    existing.salesNetTotal = existing.salesUnitNet * existing.qty;
                    existing.salesVatAmount = existing.salesNetTotal * vatRate;
                    existing.salesGrandTotal = existing.salesNetTotal + existing.salesVatAmount;
                    if (!existing.invoiceNumber.includes(inv.invoiceNumber)) {
                        existing.invoiceNumber += `, ${inv.invoiceNumber}`;
                    }
                } else {
                    const salesNetTotal = salesUnitNet * qty;
                    const salesVatAmount = salesNetTotal * vatRate;
                    const salesGrandTotal = salesNetTotal + salesVatAmount;

                    mergedItems.set(groupKey, {
                        ...item,
                        company,
                        invoiceNumber: inv.invoiceNumber,
                        currency: inv.currency,
                        qty,
                        unitCost,
                        vatRate,
                        lineNetCost: unitCost * qty,
                        appliedMargin,
                        salesUnitNet,
                        salesNetTotal,
                        salesVatAmount,
                        salesGrandTotal
                    });
                }
            });
        });

        return Array.from(mergedItems.values());
    }, [invoices, summary]);

    const handleExportExcel = () => {
        const workbook = XLSX.utils.book_new();
        
        const allRows: any[][] = [
            ['PROJE SATIŞ VE KAR ANALİZ RAPORU (UYGULAMA İÇİNDEN AKTARILDI)'],
            [`Aktarım Tarihi: ${new Date().toLocaleString('tr-TR')}`],
            [''],
            ['[ BÖLÜM 1: PROJE GENELİ FİYATLANDIRMA KONTROLÜ ]'],
            ['PROJE TOPLAM MALİYETİ', 'DÖVİZ', 'HEDEF TOPLAM SATIŞ TUTARI', 'PROJE GENEL KAR MARJI (%)'],
            [summary.totalCost, summary.invoices[0]?.currency || 'TRY', globalTarget || summary.totalTarget, summary.globalMargin],
            [''],
            ['[ BÖLÜM 2: FATURA BAZLI MALİYET ÖZETİ ]'],
            ['Sıra', 'Tedarikçi Firma / Ünvan', 'Fatura No', 'Fatura Tarihi', 'Maliyet (KDV Dahil)', 'Döviz', 'Fatura Hedef Satış', 'Fatura Kar Marjı (%)']
        ];

        summary.invoices.forEach((inv, idx) => {
            allRows.push([
                idx + 1,
                inv.senderName || inv.receiverName,
                inv.invoiceNumber,
                new Date(inv.invoiceDate).toLocaleDateString('tr-TR'),
                inv.cost,
                inv.currency,
                inv.target,
                inv.margin
            ]);
        });

        allRows.push([''], ['']);
        allRows.push(['[ BÖLÜM 3: ÜRÜN BAZLI DETAYLI SATIŞ LİSTESİ ]']);
        allRows.push([
            'Sıra', 'Ürün / Hizmet Açıklaması', 'Marka / Model', 'Miktar', 'Birim', 'Alış Birim Fiyat (NET)', 'Alış Net Tutar', 'Alış KDV (%)', 'Alış Toplam (KDV D.)', 'Para Birimi', '|',
            'UYGULANAN KAR (%)', 'SATIŞ BİRİM FİYAT (NET)', 'SATIŞ NET TOPLAM', 'SATIŞ KDV TUTARI', 'SATIŞ GENEL TOPLAM (KDV D.)', '|', 'Kaynak Firma', 'Fatura Referans'
        ]);

        items.forEach((item, idx) => {
            allRows.push([
                idx + 1,
                item.name || '',
                `${item.brand || ''} ${item.model || ''}`.trim(),
                item.qty,
                item.unit || 'Adet',
                item.unitCost,
                item.lineNetCost,
                item.vatRate,
                item.lineTotalCost, // This might be undefined, but we'll leave it for Excel logic
                item.currency,
                '|',
                item.appliedMargin,
                item.salesUnitNet,
                item.salesNetTotal,
                item.salesVatAmount,
                item.salesGrandTotal,
                '|',
                item.company,
                item.invoiceNumber
            ]);
        });
        
        const lastRow = allRows.length;
        allRows.push([
            'GENEL TOPLAM', '', '',
            items.reduce((sum, i) => sum + i.qty, 0), '', '',
            items.reduce((sum, i) => sum + i.lineNetCost, 0), '',
            summary.totalCost,
            '', '', '', '',
            items.reduce((sum, i) => sum + i.salesNetTotal, 0),
            items.reduce((sum, i) => sum + i.salesVatAmount, 0),
            items.reduce((sum, i) => sum + i.salesGrandTotal, 0),
            '', '', ''
        ]);

        const worksheet = XLSX.utils.aoa_to_sheet(allRows);
        const fmt = '#,##0.00';
        const pct = '0.00%';

        for (let r = 9; r < 9 + summary.invoices.length; r++) {
            [4, 6].forEach(c => { if (worksheet[XLSX.utils.encode_cell({ r, c })]) worksheet[XLSX.utils.encode_cell({ r, c })].z = fmt; });
            if (worksheet[XLSX.utils.encode_cell({ r, c: 7 })]) worksheet[XLSX.utils.encode_cell({ r, c: 7 })].z = pct;
        }

        const itemStart = 11 + summary.invoices.length + 4;
        for (let r = itemStart; r < allRows.length; r++) {
            [3, 5, 6, 8, 12, 13, 14, 15].forEach(c => {
                const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                if (cell) cell.z = (c === 3) ? '#,##0' : fmt;
            });
            [7, 11].forEach(c => {
                const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                if (cell) cell.z = pct;
            });
        }

        worksheet['!cols'] = [
            { wch: 8 }, { wch: 45 }, { wch: 25 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 10 },
            { wch: 3 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 25 }, { wch: 3 }, { wch: 30 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Satiş Analiz");
        XLSX.writeFile(workbook, `Birlestirilmis_Fiyatlandirma_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast({ title: "Başarılı", description: "Analiz Raporu Excel olarak hazırlandı." });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0 flex flex-col">
                <DialogHeader className="p-6 border-b sticky top-0 bg-white dark:bg-slate-950 z-20 flex flex-row items-center justify-between">
                    <div>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <Calculator className="h-6 w-6 text-blue-600" />
                            Konsolide Fatura Analizi
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Seçilen faturaların maliyet ve kârlılık analizini yapın.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="gap-2 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900"
                        >
                            <FileDown className="h-4 w-4" />
                            Analiz Raporu Al (Excel)
                        </Button>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>
                            Kapat
                        </Button>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-8 flex-1">
                    {/* Top Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="p-4 bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                            <div className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">Toplam Proje Maliyeti</div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                                {summary.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </div>
                        </Card>
                        <Card className="p-4 bg-blue-50 border-blue-100 ring-1 ring-blue-200 dark:bg-blue-950 dark:border-blue-800 dark:ring-blue-800">
                            <div className="text-xs font-bold text-blue-600 uppercase dark:text-blue-400">Hedef Toplam Satış</div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                                    {summary.totalTarget.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                </span>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400"
                                    onClick={() => {
                                        const newVal = window.prompt("Yeni global hedef satış tutarı:", summary.totalTarget.toFixed(0));
                                        if (newVal && !isNaN(parseFloat(newVal))) setGlobalTarget(parseFloat(newVal));
                                    }}
                                >
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>
                        </Card>
                        <Card className="p-4 bg-green-50 border-green-100 ring-1 ring-green-200 dark:bg-green-950 dark:border-green-800 dark:ring-green-800">
                            <div className="text-xs font-bold text-green-600 uppercase dark:text-green-400">Beklenen Kâr Marjı</div>
                            <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                                %{(summary.globalMargin * 100).toFixed(2)}
                            </div>
                        </Card>
                        <Card className="p-4 bg-orange-50 border-orange-100 ring-1 ring-orange-200 dark:bg-orange-950 dark:border-orange-800 dark:ring-orange-800">
                            <div className="text-xs font-bold text-orange-600 uppercase dark:text-orange-400">Beklenen Net Kâr</div>
                            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">
                                {(summary.totalTarget - summary.totalCost).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </div>
                        </Card>
                    </div>

                    {/* Merged Items for Analysis */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                Birleştirilmiş Ürün Listesi (Analiz)
                            </h3>
                        </div>

                        <div className="border rounded-xl shadow-sm bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                                    <TableRow className="dark:border-slate-800">
                                        <TableHead className="w-12 text-center">#</TableHead>
                                        <TableHead className="w-[450px]">Mal/Hizmet Adı</TableHead>
                                        <TableHead className="text-center w-32">Miktar</TableHead>
                                        <TableHead className="text-center w-32">Birim</TableHead>
                                        <TableHead className="text-right w-48">Satış Birim Fiyat (KDV H.)</TableHead>
                                        <TableHead className="text-center w-32">KDV %</TableHead>
                                        <TableHead className="text-right w-48">Satış Satır Toplamı (KDV D.)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 dark:border-slate-800 transition-all group">
                                            <TableCell className="text-center text-slate-400 font-mono text-xs">{idx + 1}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-700 dark:text-slate-300">
                                                    {`${item.name || ''} ${item.brand || ''} ${item.model || ''}`.trim()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.qty}</span>
                                            </TableCell>
                                            <TableCell className="text-center text-slate-600 dark:text-slate-400">{item.unit || 'Adet'}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                <span className="font-bold text-green-700 dark:text-green-400">
                                                    {item.salesUnitNet.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="font-bold text-slate-600 border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                                                    %{Math.round(item.vatRate * 100)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-900 bg-slate-50/50 dark:text-slate-100 dark:bg-slate-800/50">
                                                {item.salesGrandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-800 text-white font-bold hover:bg-slate-900 border-t-2 dark:border-slate-700">
                                        <TableCell colSpan={2} className="py-4">GENEL TOPLAM</TableCell>
                                        <TableCell className="text-center">{items.reduce((sum, i) => sum + i.qty, 0)}</TableCell>
                                        <TableCell />
                                        <TableCell />
                                        <TableCell />
                                        <TableCell className="text-right text-green-400 text-lg">
                                            {items.reduce((sum, i) => sum + i.salesGrandTotal, 0).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
