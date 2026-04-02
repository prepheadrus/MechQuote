'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Printer, FileDown, ChevronDown, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintDocument } from '@/components/app/print-document';
import { RFQDocument } from '@/components/app/rfq-document';
import { calculateItemTotals } from '@/lib/pricing';
import { usePrintQuote } from '@/hooks/use-print-quote';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { getProposalForPrint } from '@/actions/proposals';
import { getSuppliers } from '@/actions/suppliers';
import type { Proposal, ProposalItem, Customer, Settings } from '@prisma/client';

// --- Type Definitions ---
// Reusing types from DB or adapting locally if needed for calculation
// We can use the imported types `Proposal`, `ProposalItem`, `Customer`, `Settings`

type CalculatedItem = ProposalItem & {
    unitPrice: number;
    total: number;
};

// --- Main Component ---
interface PrintQuoteClientPageProps {
    initialData: {
        proposal: Proposal;
        items: ProposalItem[];
        customer: Customer;
        settings?: Settings;
    };
}

export function PrintQuoteClientPage({ initialData }: PrintQuoteClientPageProps) {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const isRFQ = searchParams.get('rfq') === 'true';
    const isHeadless = searchParams.get('headless') === 'true';
    const rfqItemIds = searchParams.get('items')?.split(',') || [];
    const rfqSupplierId = searchParams.get('supplierId');

    const proposalId = params.id as string;
    const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);

    const [data, setData] = React.useState(initialData);
    const [supplier, setSupplier] = React.useState<any>(null);
    const [error, setError] = React.useState<string | null>(null);

    useEffect(() => {
        if (isRFQ && rfqSupplierId) {
            getSuppliers().then(res => {
                if (res.success && res.data) {
                    const found = res.data.find((s: any) => s.id === rfqSupplierId);
                    if (found) setSupplier(found);
                }
            });
        }
    }, [isRFQ, rfqSupplierId]);

    // Data is now provided by the server component, so client-side fetching is removed.
    // The isLoading state can be simplified or removed if data is guaranteed.
    const isLoading = !data;

    const { proposal, items, customer, settings } = data;


    // --- Print Hook ---
    const { printRef, handlePrint } = usePrintQuote({
        teklifNo: proposal?.quoteNumber || 'teklif',
    });

    const calculatedData = useMemo(() => {
        if (!proposal || !items) {
            return null;
        }

        let subtotal = 0;
        let totalVat = 0;

        const calculatedItems: CalculatedItem[] = items.map(item => {
            // Mapping DB ProposalItem to what calculateItemTotals expects
            // Check if any required fields are missing/named differently
            const totals = calculateItemTotals({
                ...item,
                exchangeRate: item.currency === 'USD' ? (proposal.exchangeRateUSD || 1) : item.currency === 'EUR' ? (proposal.exchangeRateEUR || 1) : 1,
            });
            subtotal += totals.totalTlSell;
            totalVat += totals.totalVatAmount; // ✅ Use totalVatAmount from calculateItemTotals
            return {
                ...item,
                unitPrice: totals.tlSellPrice,
                total: totals.totalTlSell,
            };
        });


        const totalWithVat = subtotal + totalVat;

        return { ...proposal, items: calculatedItems, grandTotal: subtotal, grandTotalWithVAT: totalWithVat, vatAmount: totalVat };
    }, [proposal, items]);

    const handleExportToExcel = useCallback(() => {
        if (!calculatedData || !customer) return;

        const wb = XLSX.utils.book_new();

        const groupedItems = calculatedData.items.reduce((acc, item) => {
            const groupName = item.groupName || 'Diğer';
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(item);
            return acc;
        }, {} as Record<string, CalculatedItem[]>);

        // Grup açıklamalarını topla
        const groupDescriptions: Record<string, string> = {};
        calculatedData.items.forEach(item => {
            const groupName = item.groupName || 'Diğer';
            if (item.groupDescription && !groupDescriptions[groupName]) {
                groupDescriptions[groupName] = item.groupDescription;
            }
        });

        const wsData: (string | number)[][] = [];

        // Header
        wsData.push(['Teklif Bilgileri']);
        wsData.push(['Teklif No:', calculatedData.quoteNumber, '', 'Müşteri:', customer.name]);
        const address = typeof customer.address === 'string' ? customer.address : (customer.address ? JSON.stringify(customer.address) : '');
        wsData.push(['Proje:', calculatedData.projectName, '', 'Adres:', address]);
        wsData.push(['Tarih:', calculatedData.createdAt ? new Date(calculatedData.createdAt).toLocaleDateString('tr-TR') : '', '', 'E-posta:', (customer.email || '') as any]);
        wsData.push(['', '', '', 'Telefon:', (customer.phone || '') as any]);
        wsData.push([]); // Boş satır

        // Items Table
        wsData.push(['#', 'Grup', 'Açıklama', 'Marka', 'Model', 'Miktar', 'Birim', 'Birim Fiyat (TL)', 'Toplam Fiyat (TL)']);

        let itemIndex = 1;
        Object.entries(groupedItems).forEach(([groupName, items]) => {
            // Grup başlığı
            wsData.push([itemIndex++, groupName, '', '', '', '', '', '', '']);

            // Grup açıklaması (varsa)
            if (groupDescriptions[groupName]) {
                wsData.push(['', '', groupDescriptions[groupName], '', '', '', '', '', '']);
            }

            // Ürün satırları
            items.forEach(item => {
                wsData.push([
                    itemIndex++,
                    '',
                    item.name,
                    item.brand || '',
                    item.model || '',
                    item.quantity || 0,
                    item.unit || '',
                    item.unitPrice || 0,
                    item.total || 0,
                ]);
            });

            wsData.push([]); // Grup sonrası boş satır
        });
        wsData.push([]); // Boş satır

        // Totals
        wsData.push(['', '', '', '', '', '', '', 'Ara Toplam', calculatedData.grandTotal]);
        wsData.push(['', '', '', '', '', '', '', 'KDV Toplam', calculatedData.vatAmount]);
        wsData.push(['', '', '', '', '', '', '', 'Genel Toplam', calculatedData.grandTotalWithVAT]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Teklif');
        XLSX.writeFile(wb, `Teklif-${calculatedData.quoteNumber}.xlsx`);

    }, [calculatedData, customer]);

    const handleDownloadProfessionalPDF = useCallback(async () => {
        if (!calculatedData) return;
        setIsGeneratingPDF(true);
        try {
            const filename = `${isRFQ ? 'RFQ' : 'Teklif'}-${calculatedData.quoteNumber}`;

            // Build URL with items parameter for RFQ
            const urlParams = new URLSearchParams();
            urlParams.set('proposalId', proposalId);
            urlParams.set('isRFQ', String(isRFQ));
            urlParams.set('filename', encodeURIComponent(filename));

            // Add items parameter for RFQ filtering
            if (isRFQ && rfqItemIds && rfqItemIds.length > 0) {
                urlParams.set('items', rfqItemIds.join(','));
            }

            const url = `/api/generate-pdf?${urlParams.toString()}`;

            console.log('[PDF Download] URL:', url);

            const response = await fetch(url);
            if (!response.ok) throw new Error('PDF üretilemedi');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${filename}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error(err);
            alert('Profesyonel PDF oluşturulurken bir hata oluştu. Lütfen tarayıcı yazdırma özelliğini deneyin.');
        } finally {
            setIsGeneratingPDF(false);
        }
    }, [calculatedData, proposalId, isRFQ, rfqItemIds]);

    const firma = useMemo(() => {
        if (!settings) return {
            logo: '/logo.png',
            ad: 'Firma Adı',
            adres: 'Firma Adresi',
            email: 'info@firma.com',
            telefon: '05xx xxx xx xx',
            bankaHesaplari: []
        };

        return {
            logo: settings.logo || '/logo.png',
            ad: settings.companyTitle || settings.companyName || 'Firma Adı', // Prefer Short Name
            adres: settings.address || '',
            email: settings.email || '',
            telefon: settings.phoneNumber || '',
            // Map other fields if PrintDocument expects them
            // CompanyProfile type in PrintDocument might expect specific keys
            kapakAdı: settings.companyTitle || settings.companyName, // Prefer Short Name for Cover/Header
            resmiUnvan: settings.companyName || settings.companyTitle || undefined,
            altBaslik: settings.companySlogan || undefined,
            web: settings.website || undefined,
            vergiDairesi: settings.taxOffice || '',
            vergiNumarasi: settings.taxNumber || '',
            bankaHesaplari: (() => {
                try {
                    const accounts = settings.bankAccounts;
                    if (typeof accounts === 'string') {
                        return JSON.parse(accounts).map((acc: any) => ({
                            bankaAdi: acc.bankName || 'Banka',
                            subeAdi: acc.subeAdi || '',
                            hesapNumarasi: acc.hesapNumarasi || '',
                            iban: acc.iban || ''
                        }));
                    }
                    return [];
                } catch {
                    return [];
                }
            })()
        };
    }, [settings]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center print:hidden">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <h1 className="text-xl font-semibold">Teklif Verileri Yükleniyor...</h1>
                </div>
            </div>
        );
    }

    if (error || !calculatedData || !data.customer || !firma) {
        return (
            <div className="flex h-screen w-full items-center justify-center print:hidden">
                <div className="flex flex-col items-center gap-4 text-center p-8">
                    <h1 className="text-xl font-semibold text-destructive">Veri Hatası</h1>
                    <p className="text-muted-foreground max-w-md">
                        {error || 'Teklif, müşteri veya firma bilgileri yüklenemedi. Lütfen tekrar deneyin.'}
                    </p>
                    <Button onClick={() => router.back()}>Geri Dön</Button>
                </div>
            </div>
        );
    }

    // Ensure types match what PrintDocument expects
    const validCustomer = {
        ...data.customer,
        name: data.customer.name || 'İsimsiz Müşteri',
        email: data.customer.email || undefined,
        phone: data.customer.phone || undefined,
        address: data.customer.address || undefined
    };

    const validProposal = {
        ...calculatedData,
        termsAndConditions: calculatedData.termsAndConditions || undefined,
        exchangeRates: {
            USD: proposal?.exchangeRateUSD || 0,
            EUR: proposal?.exchangeRateEUR || 0
        },
        items: calculatedData.items.map(item => ({
            ...item,
            id: item.id || `temp-${Math.random()}`
        }))
    };

    const rfqItems = useMemo(() => {
        if (!isRFQ) return [];

        // RFQ mode'da items parametresi ZORUNLU olmalı
        if (rfqItemIds.length === 0 || (rfqItemIds.length === 1 && !rfqItemIds[0])) {
            console.error('[RFQ] No item IDs provided, returning empty array');
            return []; // Fallback to all items YASAK! Boş dönmeli
        }

        // Filter by database IDs OR form IDs (for unsaved items)
        const cleanItemIds = rfqItemIds.map(id => id.trim()).filter(Boolean);

        console.log(`[RFQ] Looking for IDs: ${cleanItemIds.join(', ')}`);
        console.log(`[RFQ] Available items: ${calculatedData.items.length}`);
        calculatedData.items.forEach((item, idx) => {
            console.log(`  [${idx}] id=${item.id}, formId=${(item as any).formId}`);
        });

        const filtered = calculatedData.items.filter(item => {
            // Check direct DB ID match
            if (item.id && cleanItemIds.includes(item.id)) return true;

            // Check form ID match (for unsaved items)
            const formId = (item as any).formId;
            if (formId && cleanItemIds.includes(formId)) return true;

            return false;
        });

        // Log filtering results for debugging
        console.log(`[RFQ] Filtering: ${cleanItemIds.length} IDs, Found: ${filtered.length} items`);

        // Return filtered items (empty array if no match - this is correct!)
        return filtered;
    }, [isRFQ, rfqItemIds, calculatedData.items]);

    return (
        <div data-print-page className={`bg-slate-50 dark:bg-slate-950 min-h-screen ${isHeadless ? 'py-0 bg-white' : 'py-8'} print:py-0 print:bg-white`}>
            {!isHeadless && (
                <div className="fixed top-4 right-4 z-50 print:hidden no-print flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Geri Dön
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button disabled={isGeneratingPDF} className={isRFQ ? "bg-purple-600 hover:bg-purple-700 shadow-lg" : "shadow-lg bg-blue-600 hover:bg-blue-700"}>
                                {isGeneratingPDF ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileDown className="mr-2 h-4 w-4" />
                                )}
                                {isRFQ ? 'RFQ Dışa Aktar' : 'Dışa Aktar'}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={handleDownloadProfessionalPDF} className="font-bold text-blue-600">
                                <FileDown className="mr-2 h-4 w-4" />
                                PDF İndir
                            </DropdownMenuItem>
                            {!isRFQ && (
                                <DropdownMenuItem onClick={handleExportToExcel}>
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Excel Olarak Dışa Aktar
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            {isRFQ ? (
                <RFQDocument
                    ref={printRef}
                    proposal={validProposal as any}
                    supplier={supplier}
                    items={rfqItems as any}
                    firma={firma as any}
                />
            ) : (
                <PrintDocument
                    ref={printRef}
                    teklif={validProposal as any}
                    customer={validCustomer as any}
                    firma={firma as any}
                />
            )}
        </div>
    );
}
