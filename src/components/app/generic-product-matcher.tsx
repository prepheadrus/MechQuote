'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, Link as LinkIcon, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product } from "@prisma/client";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, getProductList, searchProducts } from "@/actions/products";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface GenericProductMatcherProps {
    searchTerm: string;
    onMatch: (product: Product) => void;
    matchedProductId?: string | null;
    triggerLabel?: string;
    refreshTrigger?: number; // Force refresh when this changes (e.g., after creating product)
}

function CreateProductDialog({
    open,
    onOpenChange,
    initialName,
    onProductCreated,
    onProductCreatedCallback // New callback to notify parent
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName: string;
    onProductCreated: (product: Product) => void;
    onProductCreatedCallback?: () => void;
}) {
    const [name, setName] = useState(initialName || '');
    const [brand, setBrand] = useState('Diğer');
    const [price, setPrice] = useState(0);
    const [unit, setUnit] = useState('Adet');
    const [loading, setLoading] = useState(false);

    // Sync name when dialog opens or initialName changes
    useEffect(() => {
        if (open) {
            setName(initialName);
        }
    }, [open, initialName]);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const result = await createProduct({
                name: name,
                brand: brand || 'Diğer',
                model: '',
                category: 'Genel',
                unit: unit,
                listPrice: Number(price),
                currency: 'TRY',
                vatRate: 0.20,
                basePrice: Number(price),
                priceIncludesVat: false,
                code: `AUTO-${Date.now().toString().slice(-6)}`, // Otomatik kod
                description: null,
                discountRate: 0,
                installationTypeId: null,
                supplierId: null,
                technicalSpecifications: null,
                brochureUrl: null,
                isDeleted: false,
                deletedAt: null
            });

            if (!result.success || !result.data) {
                throw new Error(result.error || 'Ürün oluşturulamadı');
            }

            onOpenChange(false);
            onProductCreated(result.data);
            onProductCreatedCallback?.(); // Notify parent to refresh
            toast({ title: "Başarılı", description: "Yeni ürün oluşturuldu. Şimdi eşleştirebilirsiniz." });
        } catch (error: any) {
            toast({ title: "Hata", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] shadow-2xl border-2">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Hızlı Ürün Oluştur</DialogTitle>
                    <DialogDescription>Listede bulamadığınız ürünü mühendislik standartlarında hemen ekleyin.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">Ürün Teknik İsmi</Label>
                        <Textarea 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="min-h-[80px] text-sm font-medium border-slate-300 focus:border-primary resize-none"
                            placeholder="Ürün adını giriniz..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">Marka</Label>
                            <Input value={brand} onChange={e => setBrand(e.target.value)} className="font-medium border-slate-300" />
                        </div>
                        <div className="grid gap-2">
                            <Label className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">Birim</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger className="font-medium border-slate-300"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Adet">Adet</SelectItem>
                                    <SelectItem value="Metre">Metre</SelectItem>
                                    <SelectItem value="Kg">Kg</SelectItem>
                                    <SelectItem value="Kutu">Kutu</SelectItem>
                                    <SelectItem value="Takım">Takım</SelectItem>
                                    <SelectItem value="Set">Set</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label className="font-bold text-slate-700 uppercase text-[11px] tracking-wider">Liste Fiyatı (TL)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-bold">₺</span>
                            <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="pl-8 font-mono font-bold text-lg border-slate-300" />
                        </div>
                    </div>
                </div>
                <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 mt-2 rounded-b-lg gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="px-8">İptal</Button>
                    <Button onClick={handleCreate} disabled={loading} className="px-8 shadow-md">
                        {loading ? 'Kaydediliyor...' : 'Ürünü Kaydet ve Eşle'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function GenericProductMatcher({ searchTerm: initialSearchTerm, onMatch, matchedProductId, triggerLabel, refreshTrigger }: GenericProductMatcherProps) {
    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [results, setResults] = useState<Product[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Arama Mantığı (auto-refreshes when refreshCounter or refreshTrigger changes)
    useEffect(() => {
        const search = async () => {
            if (!open || !searchTerm || searchTerm.trim().length < 2) {
                if (!open) setResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Normalize search term - keep original for searchProducts which handles Turkish chars
                const normalizedSearch = searchTerm.toLocaleLowerCase('tr').replace(/['"]/g, '').replace(/[x\*]/g, ' ');
                const tokens = normalizedSearch.split(/[\s\-\/\.\,]+/).filter(t => t.length >= 2);
                const queryNumbers = tokens.filter(t => /\d/.test(t)).map(t => t.replace(/\D/g, ''));

                // Perform search on server side - now handles Turkish case-insensitivity
                const res = await searchProducts(searchTerm);
                const candidates = (res.success && res.data ? res.data : []) as Product[];

                console.log('[GenericProductMatcher] Search results:', candidates.length);
                if (candidates.length > 0) {
                    console.log('[GenericProductMatcher] Top 3:');
                    candidates.slice(0, 3).forEach((p, i) => {
                        console.log(`  ${i + 1}. ${p.name} (${p.code || 'N/A'})`);
                    });
                }

                // The server now handles intelligent ranking, but we can refine it
                // and just show the top results returned from the server.
                setResults(candidates.slice(0, 50));
            } catch (error) {
                console.error('[GenericProductMatcher] Search error:', error);
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        };

        // Reduced debounce from 300ms to 150ms for faster response
        const timer = setTimeout(search, 150);
        return () => clearTimeout(timer);
    }, [searchTerm, open, refreshCounter, refreshTrigger]); // Added refresh dependencies

    // Dialog açıldığında önerilen ürünü bulmaya çalış
    useEffect(() => {
        if (open && initialSearchTerm) {
            setSearchTerm(initialSearchTerm);
        }
    }, [open, initialSearchTerm]);

    const handleSelect = (product: Product) => {
        onMatch(product);
        setOpen(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-8 text-xs px-2 gap-1 w-full justify-start",
                            matchedProductId
                                ? "text-green-600 bg-green-50 hover:bg-green-100 border-green-200"
                                : "text-muted-foreground hover:text-primary border-dashed border"
                        )}
                    >
                        {matchedProductId ? <Check className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                        <span className="truncate">{triggerLabel || (matchedProductId ? "Eşleşti" : "Ürün Eşle")}</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="p-0 gap-0 sm:max-w-[1100px] max-w-[95vw] max-h-[90vh] h-[85vh] flex flex-col shadow-2xl border-2">
                    <div className="p-5 border-b bg-slate-50/50 flex-shrink-0">
                        <DialogTitle className="text-lg font-bold text-slate-800">Ürün Eşleştirme</DialogTitle>
                        <DialogDescription className="text-slate-500">Listeden uygun ürünü seçin veya mühendislik standartlarında yeni kart oluşturun.</DialogDescription>
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex items-center border-b px-5 py-3 bg-white sticky top-0 z-10 flex-shrink-0">
                            <Search className="mr-3 h-5 w-5 shrink-0 opacity-40 text-primary" />
                            <textarea
                                className="flex min-h-[50px] w-full rounded-md bg-transparent py-3 text-sm font-medium outline-none placeholder:text-muted-foreground resize-none"
                                placeholder="Ürün ara veya seç…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <ScrollArea className="flex-1 min-h-[400px] w-full">
                            {isSearching ? (
                                <div className="py-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                                    <div className="mt-2 text-xs text-muted-foreground font-medium">Katalog taranıyor...</div>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="py-12 text-center px-8">
                                    <div className="bg-slate-50 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                                        <Search className="h-6 w-6 text-slate-300" />
                                    </div>
                                    <div className="text-sm font-semibold text-slate-600">Sonuç bulunamadı</div>
                                    <div className="text-xs text-muted-foreground mt-1 max-w-[300px] mx-auto">
                                        Aradığınız ürün katalogda kayıtlı değil. Aşağıdaki butonla teknik ismi koruyarak yeni kart açabilirsiniz.
                                    </div>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1">
                                    {results.map(product => (
                                        <div
                                            key={product.id}
                                            onClick={() => handleSelect(product)}
                                            className="flex flex-col items-start gap-1.5 py-3 px-4 cursor-pointer hover:bg-primary/5 rounded-lg group transition-all border border-transparent hover:border-primary/20"
                                        >
                                            <div className="flex justify-between w-full gap-4">
                                                <span className="font-bold text-sm text-slate-800 leading-tight group-hover:text-primary transition-colors">
                                                    {product.name}
                                                </span>
                                                <span className="font-mono text-xs font-bold text-primary whitespace-nowrap bg-primary/5 px-2 py-1 rounded">
                                                    {formatCurrency(product.listPrice)} {product.currency}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-[10px]">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{product.brand}</span>
                                                {product.model && <span className="text-muted-foreground border-l pl-2 italic">{product.model}</span>}
                                                {product.code && <span className="text-muted-foreground border-l pl-2 font-mono">Kod: {product.code}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <div className="p-3 border-t bg-slate-100/80 mt-auto">
                            <Button 
                                variant="default" 
                                className="w-full justify-start gap-4 h-auto py-4 px-6 shadow-lg hover:shadow-xl transition-all border-2 border-primary/20 hover:border-primary/50 group/newcard" 
                                onClick={() => setCreateOpen(true)}
                            >
                                <div className="bg-white/30 p-2 rounded-lg group-hover/newcard:scale-110 transition-transform">
                                    <Plus className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex flex-col items-start text-left overflow-hidden">
                                    <span className="text-[13px] font-black uppercase tracking-widest text-white">Yeni Ürün Kartı Oluştur</span>
                                    <span className="text-xs opacity-90 italic truncate w-full text-white/90">
                                        "{searchTerm}"
                                    </span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <CreateProductDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                initialName={searchTerm}
                onProductCreated={(product) => {
                    handleSelect(product);
                    setRefreshCounter(prev => prev + 1); // Trigger refresh
                }}
                onProductCreatedCallback={() => setRefreshCounter(prev => prev + 1)}
            />
        </>
    );
}