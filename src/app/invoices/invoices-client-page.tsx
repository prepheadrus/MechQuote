'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ArrowUpRight, ArrowDownLeft, Trash2, RotateCcw, FileDown, Calculator } from "lucide-react";
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { InvoiceDetailDialog } from '@/components/invoices/invoice-detail-dialog';
import { RepairProductsButton } from '@/components/invoices/repair-products-button';
import { ReturnInvoiceDialog } from '@/components/invoices/return-invoice-dialog';
import { CancelInvoiceDialog } from '@/components/invoices/cancel-invoice-dialog';
import { RestoreInvoiceButton } from '@/components/invoices/restore-invoice-button';
import { cn } from "@/lib/utils";
import { deleteInvoice } from '@/actions/invoices';
import { useToast } from "@/hooks/use-toast";
import { ConsolidatedInvoiceDialog } from '@/components/invoices/consolidated-invoice-dialog';
import { BulkProductMatcher } from '@/components/products/bulk-product-matcher';
import { useInvoices } from '@/hooks/use-invoices';

// Dynamically import InvoiceUploader with SSR disabled
const InvoiceUploader = dynamic(
    () => import('@/components/invoices/invoice-uploader').then((mod) => mod.InvoiceUploader),
    { ssr: false }
);

// Helper component to show stats
function InvoiceStats({ items }: { items: any[] }) {
    if (!items) return null;

    const total = items.length;
    const matched = items.filter(i => i.linkedProductId).length;
    const remaining = total - matched;

    if (total === 0) return <span className="text-xs text-muted-foreground">Ürün yok</span>;

    return (
        <div className="flex gap-2 text-xs">
            <span className={cn(
                "px-2 py-1 rounded font-medium",
                remaining === 0 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
            )}>
                {matched}/{total} Eşleşti
            </span>
        </div>
    );
}

interface InvoicesClientPageProps {
    initialInvoices: any[];
}

export function InvoicesClientPage({ initialInvoices }: InvoicesClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();

    // React Query ile faturaları çek
    const {
        invoices: queryInvoices,
        isLoading: isLoadingQuery,
        deleteInvoice,
        refetch: refetchInvoices,
    } = useInvoices();

    // Fallback: Eğer query boşsa initial data kullan (SSR için)
    const invoices = queryInvoices.length > 0 ? queryInvoices : initialInvoices;

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isConsolidating, setIsConsolidating] = useState(false);
    
    // Bulk Matching State
    const [bulkMatcherOpen, setBulkMatcherOpen] = useState(false);
    const [bulkMatcherItems, setBulkMatcherItems] = useState<any[]>([]);
    
    // ✅ YENİ: Cancel Invoice State
    const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
    const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<{ id: string; number: string } | null>(null);
    
        const toggleSelection = (id: string) => {
            setSelectedIds(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        };
    
        const handleBulkExportExcel = useCallback(() => {
            const selectedInvoices = invoices.filter(i => selectedIds.includes(i.id));
            if (selectedInvoices.length === 0) return;
    
            const workbook = XLSX.utils.book_new();
            const numInvoices = selectedInvoices.length;
    
            // Structure:
            // Rows 1-2: Main Title
            // Rows 4-5: PROJECT GLOBAL CONTROL (The "Where to type" area)
            // Rows 7-(7+numInvoices+1): INVOICE SUMMARY TABLE
            // Rows (10+numInvoices)-End: ITEM LIST
    
            const allRows: any[][] = [
                ['PROJE SATIŞ VE KAR ANALİZ RAPORU (DİNAMİK HESAPLAMA ÇİZELGESİ)'],
                [`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`],
                [''],
                ['[ BÖLÜM 1: PROJE GENELİ FİYATLANDIRMA KONTROLÜ ]'],
                ['PROJE TOPLAM MALİYETİ', 'DÖVİZ', 'HEDEF TOPLAM SATIŞ TUTARI (BURAYA YAZINIZ)', 'PROJE GENEL KAR MARJI (%)'],
                ['', '', '', ''], // Initial values placeholder for formatting Row 6
                [''],
                ['[ BÖLÜM 2: FATURA BAZLI MALİYET ÖZETİ ]'],
                ['Sıra', 'Tedarikçi Firma / Ünvan', 'Fatura No', 'Fatura Tarihi', 'Maliyet (KDV Dahil)', 'Döviz', 'Fatura Hedef Satış', 'Fatura Kar Marjı (%)']
            ];
    
            const globalStatsRow = 6; // Data is in Row 6
            const summaryStartRow = 10; // Fatura list start row (Excel index)
            const summaryEndRow = summaryStartRow + numInvoices - 1;
    
            // Populate Summary Table
            selectedInvoices.forEach((inv, idx) => {
                const r = summaryStartRow + idx;
                allRows.push([
                    idx + 1,
                    inv.type === 'Incoming' ? String(inv.senderName || '') : String(inv.receiverName || ''),
                    String(inv.invoiceNumber || ''),
                    new Date(inv.invoiceDate).toLocaleDateString('tr-TR'),
                    Number(inv.totalAmount || 0),
                    String(inv.currency || 'TRY'),
                    Number(inv.totalAmount || 0) * 1.25, // Initial 25% target
                    { f: `=IF(E${r}>0, (G${r}/E${r})-1, 0)` } // Margin formula
                ]);
            });
    
            // Add Global Formulas to Row 6 (Total Area)
            const costSumFormula = `SUM(E${summaryStartRow}:E${summaryEndRow})`;
            const targetSumFormula = `SUM(G${summaryStartRow}:G${summaryEndRow})`;
    
            allRows[5] = [
                { f: costSumFormula }, // PROJE TOPLAM MALİYETİ (A6)
                'TRY',
                '', // Input Cell (C6) - user types here
                { f: `=IF(AND(C6<>"", A6>0), (C6/A6)-1, IF(A6>0, (${targetSumFormula})/A6, 0))` } // Global Margin (D6)
            ];
    
            allRows.push([''], ['']);
            allRows.push(['[ BÖLÜM 3: ÜRÜN BAZLI DETAYLI SATIŞ LİSTESİ ]']);
            allRows.push([
                'Sıra', 'Ürün / Hizmet Açıklaması', 'Marka / Model', 'Miktar', 'Birim', 'Alış Birim Fiyat (NET)', 'Alış Net Tutar', 'Alış KDV (%)', 'Alış Toplam (KDV D.)', 'Para Birimi', '|',
                'UYGULANAN KAR (%)', 'SATIŞ BİRİM FİYAT (NET)', 'SATIŞ NET TOPLAM', 'SATIŞ KDV TUTARI', 'SATIŞ GENEL TOPLAM (KDV D.)', '|', 'Kaynak Firma', 'Fatura Referans'
            ]);
    
            const itemTableTitleRowIdx = allRows.length; // Row after headers
            let globalQty = 0;
            let globalNet = 0;
            let globalGrand = 0;
            let globalOrder = 1;
    
            selectedInvoices.forEach(inv => {
                const company = inv.type === 'Incoming' ? inv.senderName : inv.receiverName;
                (inv.items || []).forEach((item: any) => {
                    const qty = Number(item.quantity || 0);
                    const unitPrice = Number(item.unitPrice || 0);
                    let vatRate = Number(item.vatRate || (item.taxRate || 0));
                    if (vatRate > 1) vatRate = vatRate / 100;
    
                    const lineNetExVat = unitPrice * qty;
                    const lineTotalIncVat = lineNetExVat * (1 + vatRate);
    
                    globalQty += qty;
                    globalNet += lineNetExVat;
                    globalGrand += lineTotalIncVat;
    
                    const rIdx = allRows.length + 1; // Current Excel row index
                    const summaryRange = `$C$${summaryStartRow}:$H$${summaryEndRow}`;
    
                    allRows.push([
                        globalOrder++,
                        item.name || '',
                        `${item.brand || ''} ${item.model || ''}`.trim(),
                        qty,
                        item.unit || 'Adet',
                        unitPrice,
                        lineNetExVat,
                        vatRate,
                        lineTotalIncVat,
                        inv.currency,
                        '|',
                        // Kar Oranı (L): Eğer C6'da genel hedef varsa D6'yı kullan, yoksa faturasına bak
                        { f: `=IF($C$6<>"", $D$6, VLOOKUP(S${rIdx}, ${summaryRange}, 6, 0))` },
                        { f: `=F${rIdx} * (1 + L${rIdx})` }, // M: Satış Birim
                        { f: `=D${rIdx} * M${rIdx}` },       // N: Satış Net
                        { f: `=N${rIdx} * H${rIdx}` },       // O: Satış KDV
                        { f: `=N${rIdx} + O${rIdx}` },        // P: Satış Genel
                        '|',
                        company,
                        inv.invoiceNumber
                    ]);
                });
            });
    
            const lastItemRow = allRows.length;
            // Total row for items
            allRows.push([
                'GENEL TOPLAM', '', '',
                globalQty, '', '',
                globalNet, '',
                globalGrand,
                '', '', '', '',
                { f: `=SUM(N${itemTableTitleRowIdx + 1}:N${lastItemRow})` },
                { f: `=SUM(O${itemTableTitleRowIdx + 1}:O${lastItemRow})` },
                { f: `=SUM(P${itemTableTitleRowIdx + 1}:P${lastItemRow})` },
                '', '', ''
            ]);
    
            const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    
            // --- Formatting & Column Widths ---
            const fmt = '#,##0.00';
            const pct = '0.00%';
    
            // Global Area Formatting (Row 6)
            ['A6', 'C6'].forEach(ref => { if (worksheet[ref]) worksheet[ref].z = fmt; });
            if (worksheet['D6']) worksheet['D6'].z = pct;
    
            // Summary Table Formatting
            for (let r = summaryStartRow - 1; r < summaryEndRow; r++) {
                [4, 6].forEach(c => { // Col E and G
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell) cell.z = fmt;
                });
                const marginCell = worksheet[XLSX.utils.encode_cell({ r, c: 7 })]; // Col H
                if (marginCell) marginCell.z = pct;
            }
    
            // Details Table Formatting
            for (let r = itemTableTitleRowIdx; r < allRows.length; r++) {
                // Numeric Columns
                [3, 5, 6, 8, 12, 13, 14, 15].forEach(c => {
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell) cell.z = (c === 3) ? '#,##0' : fmt;
                });
                // Percent Columns
                [7, 11].forEach(c => {
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell) cell.z = pct;
                });
            }
    
            worksheet['!cols'] = [
                { wch: 8 },   // A (Sıra)
                { wch: 45 },  // B (Açıklama)
                { wch: 25 },  // C (Marka/Model)
                { wch: 10 },  // D (Miktar)
                { wch: 10 },  // E (Birim)
                { wch: 15 },  // F (Alış Birim)
                { wch: 18 },  // G (Alış Net)
                { wch: 12 },  // H (Alış KDV)
                { wch: 20 },  // I (Alış Toplam)
                { wch: 10 },  // J (Döviz)
                { wch: 3 },   // K (|)
                { wch: 18 },  // L (Kâr %)
                { wch: 22 },  // M (Satış Birim)
                { wch: 22 },  // N (Satış Net)
                { wch: 18 },  // O (Satış KDV)
                { wch: 25 },  // P (Satış Genel)
                { wch: 3 },   // Q (|)
                { wch: 30 },  // R (Firma)
                { wch: 20 }   // S (No)
            ];
    
            XLSX.utils.book_append_sheet(workbook, worksheet, "Satiş Analiz");
            XLSX.writeFile(workbook, `Birlestirilmis_Fiyatlandirma_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
            setSelectedIds([]);
            toast({ title: "Başarılı", description: `${selectedInvoices.length} fatura birleştirilip analiz raporu oluşturuldu.` });
        }, [selectedIds, invoices, toast]);
    
    
        const exportInvoiceToExcel = useCallback((invoice: any) => {
            const typeLabel = invoice.type === 'Incoming' ? 'Gelen' : (invoice.type === 'Outgoing' ? 'Giden' : 'İade');
            const companyName = invoice.type === 'Incoming' ? invoice.senderName : invoice.receiverName;
            const vkn = invoice.type === 'Incoming' ? (invoice.senderVkn || '') : (invoice.receiverVkn || '');
    
            // Construct ALL rows in a single array first
            const allRows: any[][] = [
                ['FATURA DETAY RAPORU'],
                [''],
                ['Fatura Türü:', typeLabel],
                ['Fatura No:', invoice.invoiceNumber],
                ['Tarih:', new Date(invoice.invoiceDate).toLocaleDateString('tr-TR')],
                ['Firma Adı:', companyName],
                ['VKN / TCKN:', vkn],
                ['Durum:', invoice.status],
                [''],
                ['GENEL TOPLAM BILGILERI'],
                ['Matrah (Ara Toplam):', invoice.subTotal || 0],
                ['Toplam İskonto:', invoice.totalDiscountAmount || 0],
                ['Toplam KDV:', invoice.totalTaxAmount || 0],
                ['GENEL TOPLAM:', invoice.totalAmount || 0],
                ['Para Birimi:', invoice.currency],
                [''],
                ['--- KALEM DETAYLARI ---'],
                ['Sıra', 'Ürün/Hizmet Tanımı', 'Marka', 'Model', 'Miktar', 'Birim', 'Birim Fiyat', 'Brüt Tutar', 'İskonto %', 'İskonto Tutarı', 'Net Tutar (KDV H.)', 'KDV %', 'KDV Tutarı', 'Satır Toplamı', 'Para Birimi', 'Eşleşme']
            ];
    
            let totalQty = 0;
            let totalGross = 0;
            let totalDisc = 0;
            let totalNet = 0;
            let totalVat = 0;
            let totalGrand = 0;
    
            (invoice.items || []).forEach((item: any, idx: number) => {
                const qty = Number(item.quantity || 0);
                const unitPrice = Number(item.unitPrice || 0);
                
                let discRate = Number(item.discountRate || 0);
                if (discRate > 1) discRate = discRate / 100;
    
                let vatRate = Number(item.vatRate || (item.taxRate || 0));
                if (vatRate > 1) vatRate = vatRate / 100;
    
                const lineGross = unitPrice * qty;
                const lineDiscount = lineGross * discRate;
                const lineNetExVat = lineGross - lineDiscount;
                const lineVatAmount = lineNetExVat * vatRate;
                const lineTotalIncVat = lineNetExVat + lineVatAmount;
    
                totalQty += qty;
                totalGross += lineGross;
                totalDisc += lineDiscount;
                totalNet += lineNetExVat;
                totalVat += lineVatAmount;
                totalGrand += lineTotalIncVat;
    
                allRows.push([
                    idx + 1,
                    item.name || '',
                    item.brand || '',
                    item.model || '',
                    qty,
                    item.unit || 'Adet',
                    unitPrice,
                    lineGross,
                    discRate * 100,
                    lineDiscount,
                    lineNetExVat,
                    vatRate * 100,
                    lineVatAmount,
                    lineTotalIncVat,
                    invoice.currency,
                    item.linkedProductId ? 'Eşleşti' : 'Bekliyor'
                ]);
            });
    
            // Totals Row
            allRows.push([
                'TOPLAM', '', '', '',
                totalQty, '', '',
                totalGross, '',
                totalDisc,
                totalNet, '',
                totalVat,
                totalGrand,
                invoice.currency, ''
            ]);
    
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.aoa_to_sheet(allRows);
    
            // --- Post-processing: Apply Number Formats ---
            const fmt = '#,##0.00';
            const qtyFmt = '#,##0';
            const pctFmt = '0"%"';
    
            // 1. Summary Number cells (Rows 11-14, index 10-13, Column B, index 1)
            for (let r = 10; r <= 13; r++) {
                const cell = worksheet[XLSX.utils.encode_cell({ r, c: 1 })];
                if (cell && cell.t === 'n') cell.z = fmt;
            }
    
            // 2. Item table cells (Starting from row 18, index 17)
            const rowCount = allRows.length;
            for (let r = 18; r < rowCount; r++) {
                // Miktar (Col 4)
                const qtyCell = worksheet[XLSX.utils.encode_cell({ r, c: 4 })];
                if (qtyCell && qtyCell.t === 'n') qtyCell.z = qtyFmt;
    
                // Unit Price (Col 6), Gross (Col 7), Disc Tutar (Col 9), Net (Col 10), Vat Tutar (Col 12), Total (Col 13)
                [6, 7, 9, 10, 12, 13].forEach(c => {
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell && cell.t === 'n') cell.z = fmt;
                });
    
                // Percentages (Col 8, 11)
                [8, 11].forEach(c => {
                    const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
                    if (cell && cell.t === 'n') cell.z = pctFmt;
                });
            }
    
            // Adjust column widths
            worksheet['!cols'] = [
                { wch: 8 }, { wch: 45 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
                { wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 },
                { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 15 }
            ];
    
            XLSX.utils.book_append_sheet(workbook, worksheet, "Fatura Raporu");
            const dateStr = new Date(invoice.invoiceDate).toISOString().split('T')[0];
            const safeCompanyName = (companyName || 'Bilinmeyen_Firma').replace(/[<>:"/\\|?*]/g, '').trim();
            const fileName = `${safeCompanyName}_${invoice.invoiceNumber}_${dateStr}.xlsx`;
    
            XLSX.writeFile(workbook, fileName);
    
            toast({ title: "Başarılı", description: "Fatura Excel raporu indirildi." });
        }, [toast]);
        
        const sortInvoices = (list: any[]) => {
            return [...list].sort((a, b) => {
                const aHasUnmapped = a.items?.some((i: any) => !i.linkedProductId) || false;
                const bHasUnmapped = b.items?.some((i: any) => !i.linkedProductId) || false;
    
                // Priority 1: Unmapped items first
                if (aHasUnmapped && !bHasUnmapped) return -1;
                if (!aHasUnmapped && bHasUnmapped) return 1;
    
                // Priority 2: Newest date first
                return new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime();
            });
        };
    
        const incomingInvoices = sortInvoices(invoices.filter(i => i.type === 'Incoming'));    const outgoingInvoices = sortInvoices(invoices.filter(i => i.type === 'Outgoing'));
    const returnInvoices = sortInvoices(invoices.filter(i => i.type === 'PurchaseReturn'));

    const handleDelete = async (id: string) => {
        if (confirm('Bu faturayı silmek istediğinizden emin misiniz?')) {
            await deleteInvoice(id);
            // The UI will update automatically via query invalidation from the hook.
        }
    };
    
    // ✅ YENİ: Handle Cancel Invoice
    const handleOpenCancelDialog = (invoice: { id: string; invoiceNumber: string }) => {
        setSelectedInvoiceForCancel({ id: invoice.id, number: invoice.invoiceNumber });
        setIsCancelDialogOpen(true);
    };
    
    const handleCancelSuccess = () => {
        refetchInvoices(); // React Query ile yenile
    };

    const handleExportExcel = () => {
        if (invoices.length === 0) {
            toast({ title: "Uyarı", description: "Dışarı aktarılacak fatura bulunamadı." });
            return;
        }

        const exportData = invoices.map(invoice => {
            let typeLabel = '';
            switch (invoice.type) {
                case 'Incoming': typeLabel = 'Gelen'; break;
                case 'Outgoing': typeLabel = 'Giden'; break;
                case 'PurchaseReturn': typeLabel = 'İade'; break;
                default: typeLabel = invoice.type;
            }

            return {
                'Tür': typeLabel,
                'Firma Adı': invoice.type === 'Incoming' ? invoice.senderName : invoice.receiverName,
                'Fatura No': invoice.invoiceNumber,
                'Tarih': new Date(invoice.invoiceDate).toLocaleDateString('tr-TR'),
                'Matrah': invoice.subTotal || 0,
                'İskonto': invoice.totalDiscountAmount || 0,
                'KDV': invoice.totalTaxAmount || 0,
                'Genel Toplam': invoice.totalAmount || 0,
                'Para Birimi': invoice.currency,
                'Durum': invoice.status
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        // Column widths
        const wscols = [
            { wch: 10 }, // Tür
            { wch: 40 }, // Firma Adı
            { wch: 20 }, // Fatura No
            { wch: 15 }, // Tarih
            { wch: 12 }, // Matrah
            { wch: 12 }, // İskonto
            { wch: 12 }, // KDV
            { wch: 15 }, // Genel Toplam
            { wch: 10 }, // Para Birimi
            { wch: 15 }  // Durum
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Faturalar");

        // Sheet 2: Detailed Item List
        const itemsData: any[] = [];
        invoices.forEach(invoice => {
            if (invoice.items && Array.isArray(invoice.items)) {
                invoice.items.forEach((item: any) => {
                    itemsData.push({
                        'Fatura No': invoice.invoiceNumber,
                        'Tarih': new Date(invoice.invoiceDate).toLocaleDateString('tr-TR'),
                        'Firma': invoice.type === 'Incoming' ? invoice.senderName : invoice.receiverName,
                        'Ürün Adı': item.name,
                        'Marka': item.brand || '',
                        'Model': item.model || '',
                        'Miktar': item.quantity || 0,
                        'Birim': item.unit || 'Adet',
                        'Birim Fiyat': item.unitPrice || 0,
                        'İskonto %': (item.discountRate || 0) * 100,
                        'KDV %': (item.vatRate || 0) * 100,
                        'Para Birimi': invoice.currency,
                        'Net Tutar': (item.totalAmount || 0)
                    });
                });
            }
        });

        if (itemsData.length > 0) {
            const itemsWorksheet = XLSX.utils.json_to_sheet(itemsData);
            const itemsWscols = [
                { wch: 20 }, // Fatura No
                { wch: 15 }, // Tarih
                { wch: 30 }, // Firma
                { wch: 40 }, // Ürün Adı
                { wch: 15 }, // Marka
                { wch: 15 }, // Model
                { wch: 10 }, // Miktar
                { wch: 10 }, // Birim
                { wch: 12 }, // Birim Fiyat
                { wch: 10 }, // İskonto %
                { wch: 10 }, // KDV %
                { wch: 10 }, // Para Birimi
                { wch: 15 }  // Net Tutar
            ];
            itemsWorksheet['!cols'] = itemsWscols;
            XLSX.utils.book_append_sheet(workbook, itemsWorksheet, "Kalem Detayları");
        }

        XLSX.writeFile(workbook, `Faturalar_Detayli_Rapor_${new Date().toISOString().split('T')[0]}.xlsx`);

        toast({ title: "Başarılı", description: "Excel dosyası (Özet + Detay) oluşturuldu." });
    };

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden gap-6 p-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Faturalar</h2>
                    <p className="text-muted-foreground">
                        Gelen ve giden faturalarınızı buradan yönetebilirsiniz.
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <Button variant="default" onClick={() => setIsConsolidating(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 animate-in fade-in slide-in-from-right-4">
                            <Calculator className="h-4 w-4" />
                            {selectedIds.length} Faturayı Birleştir ve Yönet
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExportExcel} className="gap-2">
                        <FileDown className="h-4 w-4" />
                        Excel'e Aktar
                    </Button>
                    <ReturnInvoiceDialog onInvoiceCreated={handleActionSuccess} />
                    <RepairProductsButton />
                    <Button onClick={() => document.getElementById('uploader-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Fatura Ekle
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="incoming" className="w-full flex-1 flex flex-col overflow-hidden">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
                    <TabsTrigger value="incoming">
                        <ArrowDownLeft className="mr-2 h-4 w-4" />
                        Gelen Faturalar
                    </TabsTrigger>
                    <TabsTrigger value="outgoing">
                        <ArrowUpRight className="mr-2 h-4 w-4" />
                        Giden Faturalar
                    </TabsTrigger>
                    <TabsTrigger value="returns">
                        <RotateCcw className="mr-2 h-4 w-4" />
                        İade Faturaları
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="incoming" className="mt-6 space-y-4 flex-1 overflow-y-auto pr-2 pb-10">
                    <Card id="uploader-section">
                        <CardHeader>
                            <CardTitle>Fatura Yükle</CardTitle>
                            <CardDescription>
                                Yeni gelen e-arşiv faturalarınızı buraya yükleyin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <InvoiceUploader onUploadComplete={handleActionSuccess} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Gelen Faturalar Listesi</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {incomingInvoices && incomingInvoices.length > 0 ? (
                                <div className="space-y-4">
                                    {incomingInvoices.map(invoice => (
                                        <div key={invoice.id} className={cn(
                                            "flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group",
                                            selectedIds.includes(invoice.id) && "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                        )}>
                                            <div className="flex gap-3 items-center flex-1 min-w-[300px]">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                    checked={selectedIds.includes(invoice.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelection(invoice.id);
                                                    }}
                                                />
                                                <div className="bg-primary/10 p-1.5 rounded-full hidden sm:block shrink-0">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-sm truncate max-w-[450px]" title={typeof invoice.senderName === 'string' ? invoice.senderName : ''}>
                                                        {typeof invoice.senderName === 'string' ? invoice.senderName : 'Geçersiz İsim'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        <span className="font-mono bg-muted px-1 rounded h-5 flex items-center">{typeof invoice.invoiceNumber === 'string' ? invoice.invoiceNumber : 'NO'}</span>
                                                        <span>{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Amount Breakdown */}
                                            <div className="hidden md:flex flex-1 justify-end items-center mr-2 gap-2">
                                                <div className="flex flex-col items-end w-24">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Brüt</span>
                                                    <span className="font-medium text-sm text-slate-500 truncate w-full text-right">
                                                        {((invoice.subTotal || 0) + (invoice.totalDiscountAmount || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">{invoice.currency}</span>
                                                    </span>
                                                </div>

                                                {invoice.totalDiscountAmount > 0 && (
                                                    <div className="flex flex-col items-end w-24">
                                                        <span className="text-[10px] text-red-600/60 uppercase tracking-wider">İskonto</span>
                                                        <span className="font-medium text-sm text-red-600/80 truncate w-full text-right">
                                                            -{invoice.totalDiscountAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">{invoice.currency}</span>
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex flex-col items-end w-24">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Matrah</span>
                                                    <span className="font-medium text-sm text-muted-foreground truncate w-full text-right">
                                                        {invoice.subTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">{invoice.currency}</span>
                                                    </span>
                                                </div>

                                                <div className="flex flex-col items-end w-24">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">KDV</span>
                                                    <span className="font-medium text-sm text-orange-600/80 truncate w-full text-right">
                                                        {invoice.totalTaxAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">{invoice.currency}</span>
                                                    </span>
                                                </div>

                                                <div className="flex flex-col items-end w-28 border-l pl-4 ml-2">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold text-foreground">Toplam</span>
                                                    <span className="font-bold text-base text-foreground truncate w-full text-right">
                                                        {invoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px]">{invoice.currency}</span>
                                                    </span>
                                                </div>

                                                <div className="w-px h-8 bg-border mx-2" />

                                                <div className="flex flex-col items-end min-w-[100px]">
                                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mutabakat</span>
                                                    <div className="flex items-center gap-1 justify-end w-full">
                                                        <div className={cn(
                                                            "text-xs px-1.5 py-0.5 rounded border",
                                                            (invoice.status === 'Ödendi' || invoice.status === 'Paid') && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30",
                                                            (invoice.status === 'İşlendi' || invoice.status === 'Processed') && "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30",
                                                            (invoice.status === 'İptal' || invoice.status === 'Cancelled') && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30",
                                                            (invoice.status === 'Draft' || invoice.status === 'Taslak') && "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800"
                                                        )}>
                                                            {invoice.status === 'Draft' ? 'Taslak' :
                                                                invoice.status === 'Sent' ? 'Gönderildi' :
                                                                    invoice.status === 'Paid' ? 'Ödendi' :
                                                                        invoice.status === 'Processed' ? 'İşlendi' :
                                                                            invoice.status === 'Cancelled' ? 'İptal' :
                                                                                invoice.status}
                                                        </div>
                                                        <InvoiceStats items={invoice.items} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                {/* Mobile Amount (Only Total) */}
                                                <div className="md:hidden text-right mr-2">
                                                    <div className="font-bold text-sm">{invoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currency}</div>
                                                </div>

                                                {/* Detay ve Eşleşme Butonları */}
                                                <div className="flex items-center gap-1">
                                                    {invoice.items?.some((i: any) => !i.linkedProductId) && (
                                                        <InvoiceDetailDialog
                                                            invoice={invoice}
                                                            onInvoiceUpdate={handleActionSuccess}
                                                            trigger={
                                                                <Button variant="outline" size="sm" className="h-8 gap-1 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/20 dark:border-amber-900/50 dark:text-amber-400">
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                    <span className="hidden sm:inline">Eşle</span>
                                                                </Button>
                                                            }
                                                        />
                                                    )}
                                                    <InvoiceDetailDialog invoice={invoice} onInvoiceUpdate={handleActionSuccess} />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        onClick={() => exportInvoiceToExcel(invoice)}
                                                        title="Excel'e Aktar"
                                                    >
                                                        <FileDown className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* ✅ YENİ: İptal Et Butonu */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-orange-600 hover:bg-orange-50"
                                                        onClick={() => handleOpenCancelDialog(invoice)}
                                                        title="Faturayı İptal Et (Veriyi Koru)"
                                                    >
                                                        <RotateCcw className="h-4 w-4 mr-1" />
                                                        İptal Et
                                                    </Button>
                                                    
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(invoice.id)}
                                                        title="Faturayı Sil (Kalıcı)"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                    <FileText className="h-10 w-10 mb-2 opacity-50" />
                                    <p>Henüz kayıtlı gelen fatura yok.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="outgoing" className="mt-6 flex-1 overflow-y-auto pr-2 pb-10">
                    <Card>
                        <CardHeader>
                            <CardTitle>Giden Faturalar</CardTitle>
                            <CardDescription>
                                Müşterilerinize kestiğiniz faturalar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {outgoingInvoices && outgoingInvoices.length > 0 ? (
                                <div className="space-y-4">
                                    {outgoingInvoices.map(invoice => (
                                        <div key={invoice.id} className={cn(
                                            "flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group",
                                            selectedIds.includes(invoice.id) && "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                        )}>
                                            {/* Simplified display for now */}
                                            <div className="flex gap-3 items-center flex-1">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                    checked={selectedIds.includes(invoice.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelection(invoice.id);
                                                    }}
                                                />
                                                <div className="bg-blue-100 p-1.5 rounded-full hidden sm:block shrink-0 dark:bg-blue-900">
                                                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">{invoice.receiverName || 'Müşteri'}</div>
                                                    <div className="text-xs text-muted-foreground">{invoice.invoiceNumber} • {new Date(invoice.invoiceDate).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-sm mr-4">{invoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currency}</div>
                                            <div className="flex items-center gap-1">
                                                <InvoiceDetailDialog invoice={invoice} onInvoiceUpdate={handleActionSuccess} />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(invoice.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                                    <FileText className="h-12 w-12 mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium">Henüz fatura oluşturulmadı</h3>
                                    <p className="mb-4">Yeni bir satış faturası oluşturmak için yukarıdaki butonu kullanın.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="returns" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>İade Faturaları</CardTitle>
                            <CardDescription>
                                Tedarikçilere kesilen iade faturaları.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {returnInvoices && returnInvoices.length > 0 ? (
                                <div className="space-y-4">
                                    {returnInvoices.map(invoice => (
                                        <div key={invoice.id} className={cn(
                                            "flex items-center justify-between p-2 border rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors border-l-4 border-l-amber-500",
                                            selectedIds.includes(invoice.id) && "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                        )}>
                                            <div className="flex gap-3 items-center flex-1">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                                                    checked={selectedIds.includes(invoice.id)}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelection(invoice.id);
                                                    }}
                                                />
                                                <div className="bg-amber-100 p-1.5 rounded-full hidden sm:block shrink-0 dark:bg-amber-900">
                                                    <RotateCcw className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">{invoice.receiverName || 'Tedarikçi'}</div>
                                                    <div className="text-xs text-muted-foreground">İADE • {invoice.invoiceNumber} • {new Date(invoice.invoiceDate).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="font-bold text-sm mr-4 text-amber-700 dark:text-amber-400">
                                                {invoice.totalAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {invoice.currency}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <InvoiceDetailDialog invoice={invoice} onInvoiceUpdate={handleActionSuccess} />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(invoice.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-amber-50/50 dark:bg-amber-950/10">
                                    <RotateCcw className="h-12 w-12 mb-4 opacity-50 text-amber-500" />
                                    <h3 className="text-lg font-medium">İade faturası bulunmuyor</h3>
                                    <p className="mb-4">Tedarikçiye ürün iadesi yapmak için "İade Faturası Ekle" butonunu kullanın.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ConsolidatedInvoiceDialog
                open={isConsolidating}
                onOpenChange={setIsConsolidating}
                invoices={invoices.filter(i => selectedIds.includes(i.id))}
            />

            {/* Bulk Product Matcher */}
            <BulkProductMatcher
                open={bulkMatcherOpen}
                onOpenChange={setBulkMatcherOpen}
                invoiceItems={bulkMatcherItems}
                onMatchComplete={(count) => {
                    toast({
                        title: "🎉 Toplu Eşleştirme",
                        description: `${count} ürün otomatik eşleştirildi!`,
                        duration: 3000,
                    });
                    // Refresh invoices
                    window.location.reload();
                }}
            />
            
            {/* ✅ YENİ: Cancel Invoice Dialog */}
            {selectedInvoiceForCancel && (
                <CancelInvoiceDialog
                    open={isCancelDialogOpen}
                    onOpenChange={setIsCancelDialogOpen}
                    invoiceId={selectedInvoiceForCancel.id}
                    invoiceNumber={selectedInvoiceForCancel.number}
                    onSuccess={handleCancelSuccess}
                />
            )}
        </div>
    );
}
