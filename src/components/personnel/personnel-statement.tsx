'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import {
    FileText,
    Printer,
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    PlusCircle,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount || 0);
};

interface PersonnelTransaction {
    id: string;
    amount: number;
    type: string;
    category: string | null;
    description: string | null;
    date: Date;
    project?: { name: string } | null;
}

interface PersonnelStatementProps {
    personnelName: string;
    transactions: PersonnelTransaction[];
    rawBalance: number;
}

export function PersonnelStatement({ personnelName, transactions, rawBalance }: PersonnelStatementProps) {
    const balance = Math.abs(rawBalance);
    const isIndebted = rawBalance < 0; // Negative running total means we owe them (Hakediş > Paid)
    // Totals
    const totalEarnings = Math.abs(transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + t.amount, 0));

    const totalPayments = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const handlePrint = () => {
        const printContent = document.getElementById('personnel-statement-table');
        if (printContent) {
            const win = window.open('', '_blank');
            if (win) {
                win.document.write(`
                    <html>
                        <head>
                            <title>Personel Ekstresi - ${personnelName}</title>
                            <style>
                                @page { size: A4; margin: 8mm; }
                                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 0; margin: 0; font-size: 7.5px; color: #1e293b; line-height: 1.1; }
                                .container { width: 100%; }
                                .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; }
                                .header-left h1 { margin: 0; font-size: 10px; font-weight: 800; color: #020617; text-transform: uppercase; }
                                .header-left h2 { margin: 0; color: #475569; font-size: 8.5px; font-weight: 600; }
                                .header-right { text-align: right; }
                                .header-right .date-info { font-size: 6px; color: #94a3b8; font-weight: 500; margin-bottom: 2px; }
                                .stats { display: flex; gap: 8px; justify-content: flex-end; }
                                .stat-item { display: flex; flex-direction: column; min-width: 55px; }
                                .stat-label { font-size: 5.5px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                                .stat-value { font-size: 8.5px; font-weight: 800; margin-top: 0; }
                                .earning { color: #0891b2; }
                                .payment { color: #059669; }
                                .debt { color: #dc2626; }
                                
                                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                                th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; color: #475569; font-size: 6.5px; text-align: left; border-bottom: 1px solid #cbd5e1; padding: 2px; }
                                td { padding: 1.5px 2px; border-bottom: 0.5px solid #f1f5f9; vertical-align: top; word-wrap: break-word; font-size: 7.5px; }
                                .text-right { text-align: right; }
                                .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 7.5px; }
                                
                                .date-cell { width: 55px; font-size: 7px; color: #475569; }
                                .desc-cell { width: 48%; line-height: 1; }
                                .type-cell { width: 45px; }
                                .amount-cell { width: 85px; }
                                .balance-cell { width: 95px; }
                                
                                .desc-text { color: #1e293b; font-weight: 500; }
                                .project-tag { font-size: 6.5px; color: #64748b; font-style: italic; font-weight: 400; margin-top: 0.5px; display: block; }
                                .footer { margin-top: 8px; text-align: center; color: #94a3b8; font-size: 6px; border-top: 0.5px solid #f1f5f9; padding-top: 3px; }
                                
                                .badge { display: inline-block; padding: 0px 3px; border-radius: 2px; font-size: 5.5px; font-weight: 700; text-transform: uppercase; border: 0.3px solid transparent; }
                                .badge-earning { background: #ecfeff; color: #0891b2; border-color: #cffafe; }
                                .badge-payment { background: #f0fdf4; color: #15803d; border-color: #dcfce7; }
                                .badge-other { background: #f8fafc; color: #475569; border-color: #e2e8f0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <div class="header-left">
                                        <h1>PERSONEL CARİ EKSTRE</h1>
                                        <h2>${personnelName}</h2>
                                    </div>
                                    <div class="header-right">
                                        <div class="date-info">Döküm: ${format(new Date(), "d MMMM yyyy HH:mm", { locale: tr })}</div>
                                        <div class="stats">
                                            <div class="stat-item">
                                                <span class="stat-label">Toplam Hakediş</span>
                                                <span class="stat-value earning">${formatCurrency(totalEarnings)}</span>
                                            </div>
                                            <div class="stat-item">
                                                <span class="stat-label">Toplam Ödenen</span>
                                                <span class="stat-value payment">${formatCurrency(totalPayments)}</span>
                                            </div>
                                            <div class="stat-item">
                                                <span class="stat-label">Net Bakiye</span>
                                                <span class="stat-value ${rawBalance < 0 ? 'debt' : ''}">${formatCurrency(Math.abs(rawBalance))}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <table>
                                    <thead>
                                        <tr>
                                            <th class="date-cell">Tarih</th>
                                            <th class="desc-cell">Açıklama</th>
                                            <th class="type-cell">Tür</th>
                                            <th class="amount-cell text-right">Borç (Hakediş)</th>
                                            <th class="amount-cell text-right">Alacak (Ödeme)</th>
                                            <th class="balance-cell text-right">Net Bakiye</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${transactions.reverse().map((t, idx, arr) => {
                    const currentBalance = arr.slice(0, idx + 1).reduce((s, curr) => s + curr.amount, 0);
                    const isNegative = currentBalance < 0;
                    return `
                                                <tr>
                                                    <td class="date-cell">${format(new Date(t.date), "dd.MM.yyyy")}</td>
                                                    <td class="desc-cell">
                                                        <span class="desc-text">${t.description || '-'}</span>
                                                        ${t.project ? `<span class="project-tag">${t.project.name}</span>` : ''}
                                                    </td>
                                                    <td class="type-cell">
                                                        <span class="badge ${t.type === 'Earning' ? 'badge-earning' : t.type === 'Payment' ? 'badge-payment' : 'badge-other'}">
                                                            ${t.type === 'Earning' ? 'Hakediş' : t.type === 'Payment' ? 'Ödeme' : 'Devir'}
                                                        </span>
                                                    </td>
                                                    <td class="amount-cell text-right font-mono">${t.amount < 0 ? formatCurrency(Math.abs(t.amount)) : '-'}</td>
                                                    <td class="amount-cell text-right font-mono">${t.amount > 0 ? formatCurrency(t.amount) : '-'}</td>
                                                    <td class="balance-cell text-right font-mono" style="font-weight:700; ${isNegative ? 'color:#dc2626;' : ''}">${formatCurrency(Math.abs(currentBalance))}</td>
                                                </tr>
                                            `;
                }).reverse().join('')}
                                    </tbody>
                                </table>
                                <div class="footer">
                                    Dijital Ekstre dökümüdür.
                                </div>
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

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-cyan-50/30 border-cyan-100">
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-cyan-600">Toplam Hakediş</CardTitle>
                            <CardDescription className="text-2xl font-black text-cyan-900">{formatCurrency(totalEarnings)}</CardDescription>
                        </div>
                        <TrendingUp className="h-8 w-8 text-cyan-200" />
                    </CardHeader>
                </Card>

                <Card className="bg-emerald-50/30 border-emerald-100">
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-emerald-600">Toplam Ödenen</CardTitle>
                            <CardDescription className="text-2xl font-black text-emerald-900">{formatCurrency(totalPayments)}</CardDescription>
                        </div>
                        <Wallet className="h-8 w-8 text-emerald-200" />
                    </CardHeader>
                </Card>

                <Card className={cn(
                    "border-slate-200",
                    isIndebted ? "bg-red-50/30 border-red-100" : "bg-emerald-50/30 border-emerald-100"
                )}>
                    <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                                {isIndebted ? "Ödenecek Bakiye" : "Personelden Alacak (Fazla Ödeme)"}
                            </CardTitle>
                            <CardDescription className={cn(
                                "text-2xl font-black",
                                isIndebted ? "text-red-700" : "text-emerald-700"
                            )}>
                                {formatCurrency(balance)}
                            </CardDescription>
                        </div>
                        <History className={cn("h-8 w-8", isIndebted ? "text-red-200" : "text-emerald-200")} />
                    </CardHeader>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/5 py-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Cari Hareketler (Ekstre)
                        </CardTitle>
                        <CardDescription>Personelin tüm hakediş ve ödeme dökümü</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Ekstre Yazdır
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div id="personnel-statement-table">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30">
                                    <TableHead className="w-[120px]">Tarih</TableHead>
                                    <TableHead>Açıklama / Proje</TableHead>
                                    <TableHead>Tür</TableHead>
                                    <TableHead className="text-right">Borç (Hakediş)</TableHead>
                                    <TableHead className="text-right">Alacak (Ödeme)</TableHead>
                                    <TableHead className="text-right font-bold">Bakiye</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                                            Hareket bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    (() => {
                                        let currentRunningBalance = transactions.reduce((s, t) => s + t.amount, 0);
                                        const rows = transactions.map((t, idx) => {
                                            const rowBalance = currentRunningBalance;
                                            currentRunningBalance -= t.amount;
                                            return (
                                                <TableRow key={t.id} className="hover:bg-muted/10 transition-colors border-b-[0.5px]">
                                                    <TableCell className="py-1.5 px-3 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                                                        {format(new Date(t.date), "dd MMM yyyy", { locale: tr })}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3">
                                                        <div className="text-[11px] font-medium leading-tight">{t.description || '-'}</div>
                                                        {t.project && (
                                                            <div className="text-[9px] text-muted-foreground italic mt-0.5">
                                                                {t.project.name}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3">
                                                        {t.type === 'Earning' ? (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-cyan-50 text-cyan-700 border-cyan-200">Hakediş</Badge>
                                                        ) : t.type === 'Payment' ? (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">Ödeme</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1 bg-slate-50 text-slate-700">Devir</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-[11px] text-cyan-700">
                                                        {t.amount < 0 ? formatCurrency(Math.abs(t.amount)) : '-'}
                                                    </TableCell>
                                                    <TableCell className="py-1.5 px-3 text-right font-mono text-[11px] text-emerald-700">
                                                        {t.amount > 0 ? formatCurrency(t.amount) : '-'}
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "py-1.5 px-3 text-right font-mono text-[11px] font-bold",
                                                        rowBalance < 0 ? "text-red-600" : "text-emerald-600"
                                                    )}>
                                                        {formatCurrency(Math.abs(rowBalance))}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        });
                                        return rows;
                                    })()
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
