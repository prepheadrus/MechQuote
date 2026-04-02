'use client';

import React, { forwardRef, useMemo } from 'react';
import Image from 'next/image';

interface RFQDocumentProps {
    proposal: {
        quoteNumber: string;
        projectName: string;
    };
    supplier?: {
        name: string;
        email?: string;
        phone?: string;
    };
    items: Array<{
        name: string;
        brand: string;
        model?: string;
        quantity: number;
        unit: string;
        groupName?: string;
    }>;
    firma: {
        ad: string;
        logo?: string;
        email: string;
        telefon: string;
    };
}

export const RFQDocument = forwardRef<HTMLDivElement, RFQDocumentProps>(
    ({ proposal, supplier, items, firma }, ref) => {
        const date = new Date().toLocaleDateString('tr-TR');

        // Debug log
        console.log('[RFQDocument] Received items:', items.length, items);

        const { groupedItems, sortedGroupNames } = useMemo(() => {
            const groups: Record<string, typeof items> = {};
            const names: string[] = [];

            items.forEach((item) => {
                const groupName = item.groupName || 'Diğer';
                if (!groups[groupName]) {
                    groups[groupName] = [];
                    names.push(groupName);
                }
                groups[groupName].push(item);
            });

            return { groupedItems: groups, sortedGroupNames: names };
        }, [items]);

        return (
            <div ref={ref} className="bg-white text-slate-800 font-sans p-[10mm] w-[210mm] min-h-[297mm] mx-auto screen:mb-8 print:p-8">
                {/* Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-4">
                    <div className="flex items-center gap-3">
                        {firma.logo && (
                          <div className="relative h-12 w-32">
                            <Image
                              src={firma.logo}
                              fill
                              className="object-contain"
                              alt="Logo"
                              unoptimized={firma.logo.startsWith('http')}
                            />
                          </div>
                        )}
                        <div>
                            <h1 className="font-bold text-lg text-slate-900 uppercase leading-tight">{firma.ad}</h1>
                            <p className="text-[10px] text-slate-500 font-medium">Fiyat Teklif İsteme Formu (RFQ)</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-base leading-tight">RFQ</p>
                        <p className="text-[9px] text-slate-500">Tarih: {date}</p>
                    </div>
                </div>

                {/* Info Box - Professional & Detailed */}
                <div className="mb-4">
                    <div className="p-3 border rounded bg-slate-50/50">
                        <h3 className="text-[9px] font-bold text-slate-500 uppercase mb-1">TEDARİKÇİ</h3>
                        <p className="font-bold text-slate-900 text-sm mb-3">{supplier?.name || 'Sayın İlgili,'}</p>

                        <div className="text-[10px] text-slate-700 leading-relaxed space-y-2">
                            <p>
                                <strong className="text-slate-900">Regnum Prime Mühendislik</strong> olarak bir proje kapsamında kullanılmak üzere
                                ekte belirtilen teknik bileşenlerin fiyatlandırılmasına ihtiyacımız bulunmaktadır.
                            </p>
                            <p>
                                Ekte yer alan formda teknik detayları, ölçüleri ve miktarları belirtilen malzemeler için;
                                projenin toplam hacmi ve ileride oluşabilecek sürekliliği göz önünde bulundurularak,
                                <strong className="text-blue-600">en rekabetçi fiyat ve ödeme koşullarınızı içeren</strong>
                                proforma teklifinizi tarafımıza iletmenizi rica ederiz.
                            </p>
                            <p>
                                Tekliflerinizin değerlendirilmesi aşamasında <strong className="text-slate-900">kalite, termin süresi ve teknik şartnameye tam uygunluk</strong>
                                kriterleri öncelikli olarak dikkate alınacaktır.
                            </p>
                            <p className="text-slate-600 italic mt-3">
                                Değerli iş birliğiniz için teşekkür eder, iyi çalışmalar dileriz.
                            </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-300">
                            <p className="text-[10px] font-bold text-slate-900">Saygılarımızla,</p>
                            <p className="text-[9px] text-slate-600">Regnum Prime Mühendislik</p>
                        </div>
                    </div>
                </div>

                {/* Table - Optimized Heights */}
                <table className="w-full text-left border-collapse mb-4 print:break-inside-avoid">
                    <thead>
                        <tr className="bg-slate-900 text-white text-[9px] uppercase">
                            <th className="p-1.5 w-8 text-center">#</th>
                            <th className="p-1.5">Malzeme / Hizmet Tanımı</th>
                            <th className="p-1.5 w-32">Marka / Model</th>
                            <th className="p-1.5 w-16 text-center">Miktar</th>
                            <th className="p-1.5 w-12 text-center">Birim</th>
                            <th className="p-1.5 w-28 border-l border-slate-700 bg-slate-800 text-center">Birim Fiyat</th>
                            <th className="p-1.5 w-24 bg-slate-800 text-center">Termin</th>
                        </tr>
                    </thead>
                    <tbody className="text-[10px]">
                        {sortedGroupNames.map((groupName: string, gIdx: number) => (
                            <React.Fragment key={groupName}>
                                <tr className="bg-slate-100 font-bold border-b border-slate-300">
                                    <td colSpan={7} className="px-2 py-1 text-slate-900 text-[9px] uppercase tracking-wider">{groupName}</td>
                                </tr>
                                {groupedItems[groupName].map((item: any, iIdx: number) => (
                                    <tr key={iIdx} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-1 py-1 text-center text-slate-400 font-mono text-[9px]">{iIdx + 1}</td>
                                        <td className="px-2 py-1 font-medium leading-tight">{item.name}</td>
                                        <td className="px-2 py-1 text-slate-600 leading-tight">{item.brand} {item.model ? `/ ${item.model}` : ''}</td>
                                        <td className="px-2 py-1 text-center font-bold">{item.quantity}</td>
                                        <td className="px-2 py-1 text-center text-slate-500">{item.unit}</td>
                                        <td className="p-1 border-l border-slate-200 bg-slate-50/30"></td>
                                        <td className="p-1 bg-slate-50/30"></td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                {/* Requirements - Professional & Comprehensive */}
                <div className="text-[10px] text-slate-600 space-y-3 mb-12 print:break-inside-avoid">
                    <div className="border-t-2 border-slate-300 pt-3">
                        <p className="font-bold text-slate-900 uppercase text-[11px] mb-2 flex items-center gap-2">
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px]">TEKLİF ŞARTLARI</span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="font-bold text-slate-800 mb-1 text-[10px]">💰 Fiyatlandırma:</p>
                                <ul className="list-disc pl-4 space-y-1 text-[9px]">
                                    <li>Fiyatlar <strong className="text-slate-900">KDV hariç</strong> olarak belirtilmelidir</li>
                                    <li><strong className="text-slate-900">Nakliye ve sigorta</strong> durumu açıkça yazılmalıdır</li>
                                    <li>Alternatif ürün önerileri varsa ayrıca iletilmelidir</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 mb-1 text-[10px]">📋 Ödeme Koşulları:</p>
                                <ul className="list-disc pl-4 space-y-1 text-[9px]">
                                    <li><strong className="text-slate-900">Ödeme vadesi</strong> (örn: 30/60/90 gün) belirtilmelidir</li>
                                    <li>Peşin ödeme için <strong className="text-slate-900">iskonto oranı</strong> varsa yazılmalıdır</li>
                                    <li>Döviz cinsi teklifler için <strong className="text-slate-900">geçerli kurlar</strong> belirtilmelidir</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 mb-1 text-[10px]">📦 Teslimat:</p>
                                <ul className="list-disc pl-4 space-y-1 text-[9px]">
                                    <li><strong className="text-slate-900">Termin süresi</strong> (hafta/gün) net olarak yazılmalıdır</li>
                                    <li>Teslimat şekli (<strong className="text-slate-900">EXW, FOB, CIF, DAP</strong>) belirtilmelidir</li>
                                    <li>Ambalaj ve paketleme koşulları açıklanmalıdır</li>
                                </ul>
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 mb-1 text-[10px]">✅ Garanti ve Teknik:</p>
                                <ul className="list-disc pl-4 space-y-1 text-[9px]">
                                    <li><strong className="text-slate-900">Garanti süresi ve kapsamı</strong> açıkça belirtilmelidir</li>
                                    <li>Teknik şartname uygunluğu <strong className="text-slate-900">madde madde</strong> yazılmalıdır</li>
                                    <li>Menşe ülkesi ve <strong className="text-slate-900">kalite sertifikaları</strong> belirtilmelidir</li>
                                </ul>
                            </div>
                        </div>
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-[9px] text-blue-800">
                                <strong className="uppercase">📅 Önemli:</strong> Teklifinizin <strong className="text-slate-900">geçerlilik süresini</strong> (min. 15 gün) ve <strong className="text-slate-900">referans numaranızı</strong> mutlaka belirtiniz.
                                Eksik veya geç gelen teklifler değerlendirmeye alınmayacaktır.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto border-t pt-4 text-[9px] text-slate-400 text-center print:break-inside-avoid">
                    <p className="font-bold text-slate-600 uppercase mb-1">{firma.ad}</p>
                    <p>{firma.email} • {firma.telefon}</p>
                </div>
            </div>
        );
    }
);

RFQDocument.displayName = 'RFQDocument';
