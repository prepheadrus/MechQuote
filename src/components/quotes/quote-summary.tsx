/**
 * Quote Summary Component
 * 
 * Teklif özeti, toplamalar ve aksiyon butonları
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SarrafDisplay } from '@/components/quotes/quote-utils';
import {
    FileDown,
    ClipboardList,
    History as HistoryIcon,
    Copy,
    Loader2,
    Check,
    Percent,
    TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteSummaryProps {
    calculatedTotals: {
        grandTotalSellExVAT: number;
        grandTotalSellWithVAT: number;
        vatAmount: number;
        grandTotalDiscount: number;
        grandTotalProfit: number;
        grandTotalProfitMargin: number;
    };
    includeVAT: boolean;
    setIncludeVAT: (value: boolean) => void;
    isSaving: boolean;
    onPrint: () => void;
    onSaveAsTemplate: () => void;
    onDiffViewer: () => void;
    onSaveAsNewVersion: () => void;
    onSaveChanges: () => void;
}

export function QuoteSummary({
    calculatedTotals,
    includeVAT,
    setIncludeVAT,
    isSaving,
    onPrint,
    onSaveAsTemplate,
    onDiffViewer,
    onSaveAsNewVersion,
    onSaveChanges,
}: QuoteSummaryProps) {
    const displayTotal = includeVAT ? calculatedTotals.grandTotalSellWithVAT : calculatedTotals.grandTotalSellExVAT;

    return (
        <div className="sticky bottom-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-blur]:bg-card/90 border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-[1920px] mx-auto p-6">
                <div className="flex items-center justify-between gap-6">
                    {/* Sol Taraf: Toplam Göstergesi */}
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">
                                {includeVAT ? 'KDV Dahil Toplam' : 'KDV Hariç Toplam'}
                            </span>
                            <SarrafDisplay 
                                amount={displayTotal} 
                                size="xl" 
                                className="text-blue-700 dark:text-blue-400 font-black tracking-tighter" 
                            />
                        </div>

                        {!includeVAT && (
                            <>
                                <div className="text-xl text-slate-300 font-thin mb-1">=</div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em] leading-none mb-2">Genel Toplam</span>
                                    <SarrafDisplay 
                                        amount={calculatedTotals.grandTotalSellWithVAT} 
                                        size="xl" 
                                        className="text-blue-700 dark:text-blue-400 font-black tracking-tighter" 
                                    />
                                </div>
                            </>
                        )}

                        <div className="hidden xl:flex items-center gap-10 border-l-2 border-slate-200/60 dark:border-slate-800 pl-10">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-orange-600 mb-1">
                                    <Percent className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">İskonto</span>
                                </div>
                                <SarrafDisplay 
                                    amount={calculatedTotals.grandTotalDiscount} 
                                    size="md" 
                                    className="text-orange-700 font-black" 
                                />
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 text-green-600 mb-1">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Net Kâr</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <SarrafDisplay 
                                        amount={calculatedTotals.grandTotalProfit} 
                                        size="md" 
                                        className="text-green-700 font-black" 
                                    />
                                    <span className="text-xs font-black text-green-600/70">
                                        %{(calculatedTotals.grandTotalProfitMargin * 100).toFixed(1)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Orta Taraf: Mod Değiştiriciler */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setIncludeVAT(false)}
                            className={cn(
                                "text-[10px] font-black px-6 py-2 rounded-xl transition-all uppercase tracking-tight",
                                !includeVAT
                                    ? "bg-white dark:bg-slate-700 shadow-md text-blue-700 dark:text-blue-400 scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            KDV Hariç
                        </button>
                        <button
                            type="button"
                            onClick={() => setIncludeVAT(true)}
                            className={cn(
                                "text-[10px] font-black px-6 py-2 rounded-xl transition-all uppercase tracking-tight",
                                includeVAT
                                    ? "bg-white dark:bg-slate-700 shadow-md text-blue-700 dark:text-blue-400 scale-105"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            )}
                        >
                            KDV Dahil
                        </button>
                    </div>

                    {/* Sağ Taraf: Aksiyon Butonları */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 border-r-2 border-slate-200 dark:border-slate-800 pr-6">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={onPrint} 
                                            className="h-11 w-11 rounded-full text-slate-500 hover:text-blue-600 hover:bg-white shadow-sm transition-all"
                                        >
                                            <FileDown className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">PDF İndir</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={onSaveAsTemplate} 
                                            className="h-11 w-11 rounded-full text-slate-500 hover:text-emerald-600 hover:bg-white shadow-sm transition-all"
                                        >
                                            <ClipboardList className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Şablon Yap</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={onDiffViewer} 
                                            className="h-11 w-11 rounded-full text-slate-500 hover:text-amber-600 hover:bg-white shadow-sm transition-all"
                                        >
                                            <HistoryIcon className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Versiyonlar</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={onSaveAsNewVersion} 
                                            disabled={isSaving} 
                                            className="h-11 w-11 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 shadow-sm transition-all"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Copy className="h-5 w-5" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Yeni Versiyon</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>

                        <Button
                            onClick={onSaveChanges}
                            disabled={isSaving}
                            className="h-12 px-8 rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)] transition-all hover:scale-[1.05] active:scale-[0.95] gap-3"
                        >
                            {isSaving ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Check className="h-6 w-6 stroke-[3.5px]" />
                            )}
                            KAYDET
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
