'use client';

import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getLatestPurchaseInfo } from '@/actions/products';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Loader2, Info, Calendar, User, Tag, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductLastPurchaseInfoProps {
    productId?: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export function ProductLastPurchaseInfo({ productId, children, disabled }: ProductLastPurchaseInfoProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchInfo = async () => {
        if (!productId || hasFetched) return;
        setLoading(true);
        try {
            const res = await getLatestPurchaseInfo(productId);
            if (res.success) {
                setData(res.data);
            }
        } catch (error) {
            console.error('Info fetch failed', error);
        } finally {
            setLoading(false);
            setHasFetched(true);
        }
    };

    return (
        <TooltipProvider delayDuration={300}>
            <Tooltip onOpenChange={(open) => !disabled && open && fetchInfo()}>
                <TooltipTrigger asChild>
                    <div className="group cursor-help">
                        {children}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="w-80 p-0 shadow-xl border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <Info className="h-3.5 w-3.5 text-blue-400" />
                            <span>Son Satınalma Bilgisi</span>
                        </div>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950">
                        {loading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            </div>
                        ) : data ? (
                            <div className="space-y-3">
                                <div className="pb-2 mb-1 border-b">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">Ürün</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                        {data.product?.name || 'İsimsiz Ürün'}
                                    </p>
                                    {(data.product?.brand || data.product?.model) && (
                                        <p className="text-[11px] text-slate-500 mt-1">
                                            {data.product?.brand} {data.product?.model ? `| ${data.product?.model}` : ''}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex items-start gap-2">
                                        <div className="bg-slate-100 p-1.5 rounded shrink-0">
                                            <User className="h-3.5 w-3.5 text-slate-600" />
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Tedarikçi</p>
                                            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate" title={data.supplierName}>
                                                {data.supplierName || 'Bilinmeyen'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <div className="bg-slate-100 p-1.5 rounded shrink-0">
                                            <Calendar className="h-3.5 w-3.5 text-slate-600" />
                                        </div>
                                        <div>
                                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Tarih</p>
                                            <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">
                                                {formatDate(data.date)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                    <div className="bg-slate-50 p-2.5 rounded-md border border-slate-100 flex flex-col justify-between">
                                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-tighter">Liste Fiyatı</p>
                                        <p className="text-[13px] font-mono font-bold text-slate-700">
                                            {formatCurrency(data.listPrice, data.currency)}
                                            {data.product?.unit && <span className="text-[10px] ml-1 font-normal text-slate-400">/{data.product.unit}</span>}
                                        </p>
                                    </div>
                                    <div className="bg-red-50 p-2.5 rounded-md border border-red-100 flex flex-col justify-between">
                                        <p className="text-[9px] text-red-600 uppercase font-bold tracking-tighter">İskonto</p>
                                        <p className="text-[13px] font-mono font-black text-red-700">
                                            %{data.discountRate > 1 ? data.discountRate : (data.discountRate * 100).toFixed(0)}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-md border border-green-100 col-span-2 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-green-600 uppercase font-black tracking-tight">Fatura Net Alış Fiyatı</p>
                                            <p className="text-xl font-mono font-black text-green-700 tracking-tighter leading-tight">
                                                {formatCurrency(data.netPrice, data.currency)}
                                            </p>
                                        </div>
                                        <div className="bg-green-100 p-1.5 rounded-full shrink-0">
                                            <ArrowRight className="h-5 w-5 text-green-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <p className="text-[10px] text-slate-400 italic leading-tight">
                                        * Bu fiyatlar son kaydedilen faturadan alınmıştır. Teklifteki güncel katalog fiyatından farklılık gösterebilir.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-4 text-center">
                                <p className="text-xs text-slate-400">Bu ürün için henüz bir satınalma kaydı bulunmuyor.</p>
                            </div>
                        )}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
