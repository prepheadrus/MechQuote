
'use client';

import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';

// --- TYPES ---
interface PrintDocumentProps {
    teklif: {
        quoteNumber: string;
        version: number;
        createdAt: { seconds: number } | Date;
        customerName: string;
        projectName: string;
        customerId: string;
        totalAmount: number;
        exchangeRates: { USD: number, EUR: number };
        termsAndConditions?: string;
        items: Array<{
            id: string;
            name: string;
            brand: string;
            model?: string;
            quantity: number;
            unit: string;
            listPrice: number;
            currency: 'TRY' | 'USD' | 'EUR';
            discountRate: number;
            profitMargin: number;
            groupName?: string;
            unitPrice: number;
            total: number;
        }>;
        grandTotal: number;
        vatAmount: number;
        grandTotalWithVAT: number;
    };
    customer: {
        name: string;
        email?: string;
        phone?: string;
        address?: {
            street?: string;
            neighborhood?: string;
            postalCode?: string;
            buildingName?: string;
            city?: string;
            buildingNumber?: string;
            apartmentNumber?: string;
            district?: string;
        };
        taxNumber?: string;
    };
    firma: {
        ad: string;
        kapakAdı?: string;
        resmiUnvan?: string; // New field for Full Legal Title
        logo?: string;
        altBaslik?: string;
        adres: string;
        telefon: string;
        email: string;
        web?: string;
        vergiDairesi?: string;
        vergiNumarasi?: string;
        bankaHesaplari?: { bankaAdi: string; subeAdi?: string; hesapNumarasi?: string; iban: string }[];
    };
}


// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value);
};

const formatDate = (timestamp?: { seconds: number } | Date) => {
    if (!timestamp) return '-';
    if ('seconds' in timestamp) {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('tr-TR');
    }
    return timestamp.toLocaleDateString('tr-TR');
};

const formatAddress = (address: PrintDocumentProps['customer']['address']): string => {
    if (!address) return '';
    const parts: string[] = [];
    if (address.neighborhood) parts.push(address.neighborhood);
    if (address.street) parts.push(address.street);
    if (address.buildingName) parts.push(address.buildingName);

    let numberPart = '';
    if (address.buildingNumber) numberPart += `No: ${address.buildingNumber}`;
    if (address.apartmentNumber) numberPart += `/${address.apartmentNumber}`;
    if (numberPart) parts.push(numberPart);

    let cityPart = '';
    if (address.district) cityPart += address.district;
    if (address.district && address.city) cityPart += ' / ';
    if (address.city) cityPart += address.city;
    if (cityPart) parts.push(cityPart);

    if (address.postalCode) parts.push(address.postalCode);

    return parts.filter(Boolean).join(', ');
};

// --- SUB-COMPONENTS ---

const PrintHeader = ({ firma, teklif, quoteDate }: { firma: PrintDocumentProps['firma'], teklif: PrintDocumentProps['teklif'], quoteDate: string }) => (
    <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
        <div className="flex items-center gap-4">
            <div className="relative h-16 w-32 flex-shrink-0">
              <Image
                src={firma.logo || "/logo.png"}
                fill
                className="object-contain"
                alt="Logo"
                unoptimized={firma.logo?.startsWith('http')}
              />
            </div>
            <div className="flex flex-col justify-center">
                <h1 className="font-bold text-slate-900 text-lg leading-tight tracking-wide block">
                    {(firma.kapakAdı || firma.ad)?.toLocaleUpperCase('tr-TR').replace(/PRİME/g, 'PRIME')}
                </h1>
                {firma.altBaslik && <p className="text-xs text-blue-600 font-medium tracking-wide block">{firma.altBaslik}</p>}
            </div>
        </div>
        <div className="text-right">
            <div className="flex flex-col items-end">
                <p className="text-xl font-bold text-slate-900 tracking-tight block">TEKLİF</p>
                <div className="text-[10px] font-medium text-slate-500 mt-1 block">
                    <p>Teklif No: <span className="font-mono text-slate-700 font-bold">{teklif.quoteNumber}</span></p>
                    <p>Tarih: <span className="font-mono text-slate-700 font-bold">{quoteDate}</span></p>
                </div>
            </div>
        </div>
    </div>
);

const PrintCustomerInfo = ({ customer, teklif }: { customer: PrintDocumentProps['customer'], teklif: PrintDocumentProps['teklif'] }) => (
    <div className="flex gap-8 w-full mb-6">
        <div className="flex-1 p-4 rounded border border-slate-200">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">MÜŞTERİ BİLGİLERİ</h3>
            <p className="font-bold text-blue-600 text-sm mb-1">{customer.name}</p>
            <div className="text-[10px] text-slate-500 space-y-1">
                {customer.address && <p>{formatAddress(customer.address)}</p>}
                <div className="block">
                    {customer.email && <span className="mr-3">{customer.email}</span>}
                    {customer.phone && <span>{customer.phone}</span>}
                </div>
                {customer.taxNumber && <p>VKN: {customer.taxNumber}</p>}
            </div>
        </div>
        <div className="flex-1 p-4 rounded border border-slate-200">
            <h3 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-3 border-b border-slate-100 pb-2">PROJE BİLGİSİ</h3>
            <p className="font-semibold text-slate-800 uppercase text-sm">{teklif.projectName}</p>
        </div>
    </div>
);

const PrintFooter = ({ teklif, firma }: { teklif: PrintDocumentProps['teklif'], firma: PrintDocumentProps['firma'] }) => (
    <div className="space-y-4 print:space-y-2" style={{ orphans: 4, widows: 4 }}>
        <div className="w-full print:break-inside-avoid">
            <h6 className="font-bold text-slate-900 mb-1 uppercase tracking-wide text-[10px] print:text-[9px]">Önemli Notlar ve Şartlar</h6>
            <div className="whitespace-pre-wrap leading-relaxed text-[9pt] text-slate-600 bg-slate-50/50 p-3 rounded border border-slate-100 print:p-2 print:text-[11px] print:leading-tight print:bg-transparent">
                {teklif.termsAndConditions || 'Belirtilen şartlar teklif tarihinden itibaren 15 gün geçerlidir.'}
            </div>
        </div>

        {firma.bankaHesaplari && firma.bankaHesaplari.length > 0 && (
            <div className="w-full pt-4 border-t border-slate-100 print:pt-2">
                <h6 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[10px] print:text-[9px] print:mb-1">Banka Hesap Bilgileri</h6>
                <div className="grid grid-cols-3 gap-3 print:gap-2">
                    {firma.bankaHesaplari.map((account, index) => (
                        <div key={index} className="bg-white p-2.5 rounded border border-slate-200 shadow-sm print:shadow-none print:p-1.5 print:border-slate-100">
                            <p className="font-bold text-slate-900 text-[9px] truncate print:text-[8px]" title={account.bankaAdi}>{account.bankaAdi}</p>
                            {account.subeAdi && <p className="text-[8px] text-slate-500 truncate print:hidden">{account.subeAdi}</p>}
                            <p className="font-mono mt-1 text-slate-700 text-[9px] break-all leading-none print:text-[8px] print:mt-0.5">{account.iban}</p>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);

// --- MAIN COMPONENT ---

export const PrintDocument = forwardRef<HTMLDivElement, PrintDocumentProps>(
    ({ teklif, firma, customer }, ref) => {

        const quoteDate = formatDate(teklif.createdAt);

        const { groupedItems, sortedGroupNames, groupTotals, groupDescriptions } = useMemo(() => {
            const groups: Record<string, typeof teklif.items> = {};
            const names: string[] = [];
            const totals: Record<string, number> = {};
            const descriptions: Record<string, string> = {};

            teklif.items.forEach((item: any) => {
                const groupName = item.groupName || 'Diğer';
                if (!groups[groupName]) {
                    groups[groupName] = [];
                    names.push(groupName);
                    totals[groupName] = 0;
                    // Grup açıklamasını item'dan al (eğer varsa)
                    if (item.groupDescription) {
                        descriptions[groupName] = item.groupDescription;
                    }
                }
                groups[groupName].push(item);
                totals[groupName] += item.total;
            });

            return { groupedItems: groups, sortedGroupNames: names, groupTotals: totals, groupDescriptions: descriptions };
        }, [teklif.items]);

        return (
            <div ref={ref} className="bg-white text-slate-800 font-sans leading-relaxed block print:px-5 print:pt-8 print:pb-20">
                <style jsx global>{`
                    @media print {
                        @page {
                            margin-top: 12mm;
                            margin-bottom: 20mm;
                            margin-left: 0;
                            margin-right: 0;
                            size: A4 portrait;
                        }
                        @page :first {
                            margin-bottom: 10mm !important;
                        }
                        body {
                            -webkit-print-color-adjust: exact;
                        }
                        tr, td, th {
                            page-break-inside: avoid;
                        }
                        thead {
                            display: table-header-group;
                        }
                        tfoot {
                            display: table-row-group;
                        }
                    }
                `}</style>

                {/* --- COVER PAGE --- */}
                {/* CLASSIC RELIABLE LAYOUT: Header (Logo/Contact) - Content - Footer. Safe height 270mm. */}
                {/* --- COVER LETTER PAGE (Formal & Clean) --- */}
                <div className="w-[210mm] h-[270mm] bg-white p-[15mm] relative box-border print:shadow-none print:break-after-page" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>

                    {/* Header: Logo & Quote Info */}
                    <div className="flex justify-between items-start mb-12">
                        {/* Logo */}
                        <div className="relative h-20 w-40">
                            <Image
                              src={firma.logo || "/logo.png"}
                              fill
                              className="object-contain object-left"
                              alt="Firma Logosu"
                              unoptimized={firma.logo?.startsWith('http')}
                            />
                        </div>

                        {/* Quote Info - Right Aligned & Minimal */}
                        <div className="text-right space-y-1.5 mt-2">
                            <div className="text-sm text-slate-500">
                                <span className="font-medium mr-2">Teklif No:</span>
                                <span className="font-semibold text-slate-700">{teklif.quoteNumber}</span>
                            </div>
                            <div className="text-sm text-slate-500">
                                <span className="font-medium mr-2">Tarih:</span>
                                <span className="font-semibold text-slate-700">{quoteDate}</span>
                            </div>
                        </div>
                    </div>

                    {/* Body: Formal Letter Content */}
                    <div className="max-w-4xl w-full mt-12 pb-24">
                        {/* Salutation */}
                        <p className="font-bold text-slate-800 text-lg mb-6">
                            Sayın {customer.name},
                        </p>

                        {/* Letter Text - Readable & Spacious */}
                        <div className="space-y-6 text-[11pt] text-slate-700 leading-relaxed text-justify">
                            <p>
                                {teklif.projectName ? `${teklif.projectName} projesi kapsamında` : 'Projeniz için'} ihtiyaç duyulan mekanik tesisat ve uygulama gereksinimlerine yönelik hazırladığımız teknik ve ticari teklifimizi ekte bilgilerinize sunarız.
                            </p>
                            <p>
                                <span className="font-semibold text-slate-800">{firma.resmiUnvan || firma.ad}</span> olarak, projenizin özel gereksinimlerini dikkate alarak, en verimli, uzun ömürlü ve yönetmeliklere uygun çözümleri oluşturmayı temel ilke edindik. Uzman mühendislik kadromuzun titiz çalışması sonucu oluşturulan bu teklifin, beklentilerinizi teknik ve mali açıdan tam olarak karşılayacağına inanıyoruz.
                            </p>
                            <p>
                                Teklif kapsamındaki ürün ve hizmet detayları, marka tercihleri ve teknik özellikler ilerleyen sayfalarda detaylandırılmıştır. Süreçle ilgili her türlü sorunuz veya ilave talebiniz için ekibimizle dilediğiniz zaman iletişime geçebilirsiniz.
                            </p>
                            <p>
                                İş birliğimizin firmanız için değer yaratmasını diler, saygılarımızı sunarız.
                            </p>
                        </div>

                        {/* Signature Block */}
                        <div className="mt-16">
                            <p className="text-slate-800 font-medium mb-2">Saygılarımızla,</p>
                            <p className="text-xl font-bold text-slate-900">{firma.kapakAdı || firma.ad}</p>
                        </div>
                    </div>

                    {/* Footer: Centered 3-Line Professional Footer */}
                    <div className="absolute bottom-0 left-0 w-full border-t border-slate-200 pt-4 pb-0 flex flex-col items-center justify-center text-[10px] text-slate-500 tracking-wide">
                        <span className="font-semibold text-slate-600">REGNUM PRİME MÜHENDİSLİK SAN.TİC.LTD.ŞTİ.</span>
                        <span>Hacı Bayram Mah. Rüzgarlı Cad. Uçar 2 İşhanı No:7/46-44 Altındağ/Ankara</span>
                        <span className="mt-0.5">+90 (553) 469 75 01 &nbsp;|&nbsp; info@regnumprime.com &nbsp;|&nbsp; www.regnumprime.com</span>
                    </div>

                </div>

                {/* --- CONTENT PAGES --- */}
                <div className="w-[210mm] mx-auto bg-white p-[15mm] pt-[10mm] screen:shadow-2xl screen:my-8 screen:border screen:border-slate-200 print:w-full print:bg-transparent print:shadow-none mt-4">

                    {/* Header: Logo & Teklif No - OUTSIDE TABLE so it doesn't repeat on every page */}
                    <div className="mb-6">
                        <PrintHeader firma={firma} teklif={teklif} quoteDate={quoteDate} />
                    </div>

                    {/* Customer Info - OUTSIDE TABLE strictly */}
                    <div className="mb-8">
                        <PrintCustomerInfo customer={customer} teklif={teklif} />
                    </div>

                    <table className="w-full border-collapse table-fixed">
                        {/* Define Column Widths explicitly for stability */}
                        <colgroup>
                            <col className="w-[5%]" />
                            <col className="w-[35%]" />
                            <col className="w-[12%]" />
                            <col className="w-[12%]" />
                            <col className="w-[10%]" />
                            <col className="w-[13%]" />
                            <col className="w-[13%]" />
                        </colgroup>

                        <thead className="display-table-header-group">
                            {/* Column Headers - These will repeat on each page automatically */}
                            <tr className="bg-slate-100 text-slate-600 font-bold text-[10px] border-y border-slate-300 uppercase tracking-tight">
                                <th className="py-2.5 pl-2 text-center">#</th>
                                <th className="py-2.5 pl-2 text-left">Ürün / Hizmet Açıklaması</th>
                                <th className="py-2.5 text-center">Marka</th>
                                <th className="py-2.5 text-center">Model</th>
                                <th className="py-2.5 text-center">Miktar</th>
                                <th className="py-2.5 text-right">Birim Fiyat</th>
                                <th className="py-2.5 pr-2 text-right">Toplam</th>
                            </tr>
                        </thead>

                        <tbody className="display-table-row-group">

                            {sortedGroupNames.map((gName: string, gIdx: number) => (
                                <React.Fragment key={gName}>
                                    {/* Group Header Row */}
                                    <tr className="print:break-inside-avoid print:break-after-avoid">
                                        <td colSpan={7} className="p-0 border-none">
                                            <div className="py-1.5 px-3 font-bold text-black border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase tracking-wide mt-2">
                                                {gName}
                                            </div>
                                            {/* Grup Açıklaması */}
                                            {groupDescriptions[gName] && (
                                                <div className="py-1 px-3 text-[9px] text-slate-600 italic border-b border-slate-100 bg-slate-50/40">
                                                    {groupDescriptions[gName]}
                                                </div>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Items - Real Table Rows */}
                                    {groupedItems[gName].map((item: any, iIdx: number) => (
                                        <tr key={item.id || iIdx} className="border-b border-slate-50 print:break-inside-avoid">
                                            <td className="py-1.5 text-center text-slate-400 font-mono text-[9px] align-top">
                                                {iIdx + 1}
                                            </td>
                                            <td className="py-1.5 pl-2 pr-2 min-w-0 align-top">
                                                <p className="font-medium text-[9px] leading-tight text-slate-800 break-words">
                                                    {item.name}
                                                </p>
                                            </td>
                                            <td className="py-1.5 text-center text-[9px] uppercase font-medium text-slate-500 align-top">
                                                {item.brand}
                                            </td>
                                            <td className="py-1.5 text-center text-[8px] text-slate-500 align-top px-1">
                                                {item.model || '-'}
                                            </td>
                                            <td className="py-1.5 text-center font-mono text-[9px] align-top">
                                                {item.quantity} <span className="text-[8px] text-slate-400">{item.unit}</span>
                                            </td>
                                            <td className="py-1.5 text-right font-mono text-slate-600 text-[9px] align-top">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.unitPrice)}
                                            </td>
                                            <td className="py-1.5 pr-2 text-right font-mono font-bold text-slate-900 text-[9px] align-top">
                                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2 }).format(item.total)}
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Group Subtotal - break-before-avoid prevents it from being alone on a page */}
                                    <tr className="print:break-inside-avoid print:break-before-avoid" style={{ breakBefore: 'avoid', pageBreakBefore: 'avoid' }}>
                                        <td colSpan={7} className="p-0 border-none">
                                            <div className="flex justify-end items-center py-1.5 pr-2 border-b border-slate-100 bg-slate-50/20 mb-2">
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mr-4">{gName} ARA TOPLAM:</span>
                                                <span className="font-mono font-bold text-[9px] text-slate-600">
                                                    {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, style: 'currency', currency: 'TRY' }).format(groupTotals[gName])}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    {/* Final Totals & Summary - Consolidated and Isolated from main table to prevent header repetition */}
                    <div className="mt-8 print:break-inside-avoid">
                        <div className="w-full bg-slate-50/30 p-5 rounded-lg border-2 border-slate-100">
                            <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-4 border-b pb-2">TEKLİF İCMALİ VE GENEL TOPLAM</h4>
                            <table className="w-full text-[9px] border-collapse mb-5 table-fixed">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-500 font-bold border-y border-slate-200 uppercase tracking-tighter text-[8px]">
                                        <th className="py-2 pl-4 text-left w-2/3">BÖLÜM / GRUP AÇIKLAMASI</th>
                                        <th className="py-2 pr-4 text-right w-1/3">TOPLAM (KDV HARİÇ)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedGroupNames.map((gName) => (
                                        <tr key={gName} className="border-b border-white">
                                            <td className="py-2 pl-4 font-semibold text-slate-700">{gName}</td>
                                            <td className="py-2 pr-4 text-right font-mono text-slate-900">
                                                {formatCurrency(groupTotals[gName])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div className="w-80 ml-auto space-y-2 border-t border-slate-200 pt-4">
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                    <span>ARA TOPLAM (KDV HARİÇ)</span>
                                    <span className="font-mono">{formatCurrency(teklif.grandTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                    <span>KDV TOPLAMI (%20)</span>
                                    <span className="font-mono">{formatCurrency(teklif.vatAmount)}</span>
                                </div>
                                <div className="h-px bg-slate-300 my-1"></div>
                                <div className="flex justify-between items-end pt-1">
                                    <span className="font-bold text-slate-900 uppercase text-[10px]">GENEL TOPLAM</span>
                                    <span className="font-mono text-xl font-bold text-blue-600">{formatCurrency(teklif.grandTotalWithVAT)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Bank Accounts - Removed break-inside-avoid to allow it to start immediately */}
                    <div className="mt-8 pt-6 border-t border-slate-200 print:mt-4 print:pt-4">
                        <PrintFooter teklif={teklif} firma={firma} />
                    </div>
                </div>
            </div >
        );
    }
);

PrintDocument.displayName = 'PrintDocument';
