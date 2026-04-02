
'use client';

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, ArrowRight, ArrowDown, ArrowUp, Minus, Plus, RefreshCw } from 'lucide-react';
import { getProposalVersions, getProposalDiff } from '@/actions/proposals'; // Bu action'ları import edeceğiz
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProposalDiffViewerProps {
    currentProposalId: string;
    rootProposalId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProposalDiffViewer({ currentProposalId, rootProposalId, isOpen, onOpenChange }: ProposalDiffViewerProps) {
    const [versions, setVersions] = useState<any[]>([]);
    const [selectedOldId, setSelectedOldId] = useState<string>('');
    const [selectedNewId, setSelectedNewId] = useState<string>(currentProposalId);
    const [diffData, setDiffData] = useState<any>(null);
    const [isLoadingVersions, setIsLoadingVersions] = useState(false);
    const [isLoadingDiff, setIsLoadingDiff] = useState(false);

    // Load versions when dialog opens
    useEffect(() => {
        if (isOpen && rootProposalId) {
            loadVersions();
        }
    }, [isOpen, rootProposalId]);

    // Load diff when selections change
    useEffect(() => {
        if (selectedOldId && selectedNewId && isOpen) {
            loadDiff();
        }
    }, [selectedOldId, selectedNewId]);

    const loadVersions = async () => {
        setIsLoadingVersions(true);
        try {
            const result = await getProposalVersions(rootProposalId);
            if (result.success && result.data) {
                setVersions(result.data);
                // Default: Compare previous version with current (if exists)
                const sorted = [...result.data].sort((a, b) => b.version - a.version);
                const currentIndex = sorted.findIndex(v => v.id === currentProposalId);

                if (currentIndex !== -1) {
                    setSelectedNewId(currentProposalId);
                    // Select previous version if available
                    if (currentIndex + 1 < sorted.length) {
                        setSelectedOldId(sorted[currentIndex + 1].id);
                    } else if (sorted.length > 1) {
                        // If current is the oldest, compare with newest? Or just select itself (no diff)
                        setSelectedOldId(sorted[0].id === currentProposalId ? sorted[1]?.id : sorted[0].id);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingVersions(false);
        }
    };

    const loadDiff = async () => {
        if (!selectedOldId || !selectedNewId) return;
        setIsLoadingDiff(true);
        try {
            const result = await getProposalDiff(selectedOldId, selectedNewId);
            if (result.success) {
                setDiffData(result.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingDiff(false);
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
    const formatPercent = (val: number) => `%${val.toFixed(2)}`;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-2 border-b">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-blue-600" />
                            Teklif Versiyon Karşılaştırması
                        </DialogTitle>
                        <DialogDescription>
                            İki versiyon arasındaki finansal ve içerik farklarını analiz edin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center gap-4 mt-6 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Baz Alınan Versiyon (Eski)</label>
                            <Select value={selectedOldId} onValueChange={setSelectedOldId}>
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue placeholder="Versiyon seç..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {versions.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id} disabled={v.id === selectedNewId}>
                                            v{v.version} - {formatDate(v.createdAt)} ({formatCurrency(v.totalAmount)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-center pt-5 text-slate-400">
                            <ArrowRight className="h-5 w-5" />
                        </div>

                        <div className="flex-1">
                            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Hedef Versiyon (Yeni)</label>
                            <Select value={selectedNewId} onValueChange={setSelectedNewId}>
                                <SelectTrigger className="bg-white border-slate-200">
                                    <SelectValue placeholder="Versiyon seç..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {versions.map((v: any) => (
                                        <SelectItem key={v.id} value={v.id} disabled={v.id === selectedOldId}>
                                            v{v.version} - {formatDate(v.createdAt)} ({formatCurrency(v.totalAmount)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-black/5">
                    {isLoadingDiff ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                            <p>Farklar analiz ediliyor...</p>
                        </div>
                    ) : diffData ? (
                        <div className="h-full flex flex-col">
                            {/* Özet Kartları */}
                            <div className="grid grid-cols-3 gap-4 p-6 pb-2">
                                <DiffCard
                                    title="Toplam Tutar Farkı"
                                    oldVal={diffData.general.totalAmount.old}
                                    newVal={diffData.general.totalAmount.new}
                                    diff={diffData.general.totalAmount.diff}
                                    percent={diffData.general.totalAmount.percent}
                                    formatter={formatCurrency}
                                />
                                <DiffCard
                                    title="Net Kâr Farkı"
                                    oldVal={diffData.profit.old}
                                    newVal={diffData.profit.new}
                                    diff={diffData.profit.diff}
                                    percent={diffData.profit.percent}
                                    formatter={formatCurrency}
                                    inverseColors={false}
                                />
                                <DiffCard
                                    title="Kâr Marjı Değişimi"
                                    oldVal={diffData.profit.marginOld}
                                    newVal={diffData.profit.marginNew}
                                    diff={diffData.profit.marginNew - diffData.profit.marginOld}
                                    percent={null} // Margin yüzdesinin yüzdesi olmaz, puan farkı olur
                                    formatter={(v: number) => `%${v.toFixed(2)}`}
                                    suffix="Puan"
                                />
                            </div>

                            <Tabs defaultValue="changes" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
                                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                                    <TabsTrigger value="changes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none py-3 px-1 text-sm">
                                        Değişiklikler
                                        {diffData.items.updated.length > 0 && <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{diffData.items.updated.length}</Badge>}
                                    </TabsTrigger>
                                    <TabsTrigger value="added" className="data-[state=active]:border-b-2 data-[state=active]:border-green-600 data-[state=active]:shadow-none rounded-none py-3 px-1 text-sm">
                                        Eklenenler
                                        {diffData.items.added.length > 0 && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 hover:bg-green-100">{diffData.items.added.length}</Badge>}
                                    </TabsTrigger>
                                    <TabsTrigger value="removed" className="data-[state=active]:border-b-2 data-[state=active]:border-red-600 data-[state=active]:shadow-none rounded-none py-3 px-1 text-sm">
                                        Silinenler
                                        {diffData.items.removed.length > 0 && <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 hover:bg-red-100">{diffData.items.removed.length}</Badge>}
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex-1 overflow-hidden mt-4 bg-white dark:bg-slate-900 rounded-lg border shadow-sm">
                                    <ScrollArea className="h-full">
                                        <TabsContent value="changes" className="m-0 p-0">
                                            {diffData.items.updated.length === 0 ? (
                                                <EmptyState message="Mevcut kalemlerde bir değişiklik bulunamadı." />
                                            ) : (
                                                <div className="divide-y">
                                                    {diffData.items.updated.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div>
                                                                    <div className="font-semibold text-sm">{item.new.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.new.brand || '-'} / {item.new.model || '-'}</div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {item.changes.map((c: string) => (
                                                                        <Badge key={c} variant="outline" className="text-[10px] uppercase bg-yellow-50 text-yellow-700 border-yellow-200">
                                                                            {c === 'quantity' ? 'Miktar' : c === 'margin' ? 'Kâr Marjı' : c === 'price' ? 'Fiyat' : c}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100/50 dark:bg-slate-800/50 p-3 rounded-md">
                                                                <div className="space-y-1">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">ESKİ DEĞERLER</span>
                                                                    <DiffRow label="Miktar" val={item.old.quantity} change={item.changes.includes('quantity')} />
                                                                    <DiffRow label="Satış Fiyatı" val={formatCurrency(item.old.unitPrice)} change={item.changes.includes('price')} />
                                                                    <DiffRow label="Kâr Marjı" val={`%${(item.old.profitMargin * 100).toFixed(1)}`} change={item.changes.includes('margin')} />
                                                                </div>
                                                                <div className="space-y-1 border-l pl-4">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">YENİ DEĞERLER</span>
                                                                    <DiffRow label="Miktar" val={item.new.quantity} change={item.changes.includes('quantity')} highlight />
                                                                    <DiffRow label="Satış Fiyatı" val={formatCurrency(item.new.unitPrice)} change={item.changes.includes('price')} highlight />
                                                                    <DiffRow label="Kâr Marjı" val={`%${(item.new.profitMargin * 100).toFixed(1)}`} change={item.changes.includes('margin')} highlight />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="added" className="m-0 p-0">
                                            {diffData.items.added.length === 0 ? (
                                                <EmptyState message="Yeni eklenen kalem yok." />
                                            ) : (
                                                <div className="divide-y">
                                                    {diffData.items.added.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-green-50/30">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                                    <Plus className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-sm">{item.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.quantity} {item.unit} x {formatCurrency(item.unitPrice)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-sm text-green-700">+{formatCurrency(item.quantity * item.unitPrice)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="removed" className="m-0 p-0">
                                            {diffData.items.removed.length === 0 ? (
                                                <EmptyState message="Silinen kalem yok." />
                                            ) : (
                                                <div className="divide-y">
                                                    {diffData.items.removed.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-red-50/30 opacity-70">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                                                    <Minus className="h-4 w-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-sm line-through decoration-red-400">{item.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.quantity} {item.unit}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="font-bold text-sm text-red-700">-{formatCurrency(item.quantity * item.unitPrice)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </ScrollArea>
                                </div>
                            </Tabs>
                        </div>
                    ) : (
                        <EmptyState message="Karşılaştırma yapmak için iki versiyon seçin." />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DiffCard({ title, oldVal, newVal, diff, percent, formatter, suffix, inverseColors }: any) {
    const isPositive = diff > 0;
    const isNeutral = diff === 0;

    // Default colors: Green is good (Profit up), Red is bad (Profit down)
    // For Cost: Green is good (Cost down), Red is bad (Cost up) -> inverseColors=true

    let colorClass = isPositive ? "text-green-600" : "text-red-600";
    let bgClass = isPositive ? "bg-green-100" : "bg-red-100";
    let Icon = isPositive ? ArrowUp : ArrowDown;

    if (inverseColors) {
        colorClass = isPositive ? "text-red-600" : "text-green-600";
        bgClass = isPositive ? "bg-red-100" : "bg-green-100";
    }

    if (isNeutral) {
        colorClass = "text-slate-500";
        bgClass = "bg-slate-100";
        Icon = Minus;
    }

    return (
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</h3>
            <div className="flex items-end justify-between">
                <div>
                    <div className="text-2xl font-bold tracking-tight">{formatter(newVal)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Eski: <span className="line-through opacity-70">{formatter(oldVal)}</span></div>
                </div>
                {!isNeutral && (
                    <div className={cn("flex items-center px-2 py-1 rounded-md text-xs font-bold gap-1", bgClass, colorClass)}>
                        <Icon className="h-3 w-3" />
                        {percent !== null && <span>%{Math.abs(percent).toFixed(1)}</span>}
                        {suffix && <span className="ml-0.5">{Math.abs(diff).toFixed(2)} {suffix}</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

function DiffRow({ label, val, change, highlight }: any) {
    return (
        <div className={cn("flex justify-between items-center py-0.5", change && (highlight ? "text-blue-700 font-bold" : "text-slate-400 line-through"))}>
            <span className="text-muted-foreground">{label}:</span>
            <span>{val}</span>
        </div>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Minus className="h-6 w-6 text-slate-400" />
            </div>
            <p>{message}</p>
        </div>
    )
}
