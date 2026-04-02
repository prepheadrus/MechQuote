'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatCurrency, formatDate } from '@/lib/formatters';

function PrintAiAnalysisContent() {
    const searchParams = useSearchParams();
    const insight = searchParams.get('insight');
    const statsStr = searchParams.get('stats');

    if (!insight) return <div>Insight not found</div>;

    const stats = statsStr ? JSON.parse(decodeURIComponent(statsStr)) : null;

    return (
        <div className="p-[15mm] bg-white min-h-screen font-sans text-slate-900 border" style={{ width: '210mm' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">MechQuote Finansal Rapor</h1>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Yönetici Stratejik Özeti</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold">{formatDate(new Date())}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-black">AI Tarafından Oluşturuldu</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            {stats && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-50 p-4 border-l-4 border-primary">
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Toplam Ciro</p>
                        <p className="text-lg font-bold">{formatCurrency(stats.financials.totalRevenue)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border-l-4 border-green-600">
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Net Kâr</p>
                        <p className="text-lg font-bold">{formatCurrency(stats.financials.totalProfit)}</p>
                    </div>
                    <div className="bg-slate-50 p-4 border-l-4 border-blue-600">
                        <p className="text-[10px] uppercase font-black text-slate-500 mb-1">Kazanma Oranı</p>
                        <p className="text-lg font-bold">%{stats.operationalStats.winRate.toFixed(1)}</p>
                    </div>
                </div>
            )}

            {/* AI Analysis Content */}
            <div className="prose prose-slate max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {insight}
                </ReactMarkdown>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Bu rapor MechQuote AI Karar Destek Sistemi tarafından otomatik olarak hazırlanmıştır.
                </p>
            </div>
        </div>
    );
}

export default function PrintAiAnalysisPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center uppercase font-black text-slate-400 tracking-widest">Rapor Hazırlanıyor...</div>}>
            <PrintAiAnalysisContent />
        </Suspense>
    );
}
