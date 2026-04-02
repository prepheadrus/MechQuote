'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Merge, AlertTriangle, Check, RefreshCw } from "lucide-react";
import { findDuplicateProducts, DuplicateGroup } from '@/actions/maintenance';
import { mergeProducts } from '@/actions/products';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";

export function MergeProductsDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [groups, setGroups] = useState<DuplicateGroup[]>([]);
    const [selectedMasters, setSelectedMasters] = useState<Record<string, string>>({}); // groupName -> masterProductId
    const { toast } = useToast();

    const loadDuplicates = async () => {
        setIsLoading(true);
        const result = await findDuplicateProducts();
        setIsLoading(false);
        if (result.success && result.data) {
            setGroups(result.data);

            // Auto-select the first product (usually oldest or based on sort) as default master
            const defaults: Record<string, string> = {};
            result.data.forEach(g => {
                // Heuristic: Prefer product with most relations or oldest created
                // For now, just picking the first one which is usually the one with 'asc' name,
                // but let's try to pick the one with most history if possible.
                const bestCandidate = g.products.reduce((prev, current) => {
                    const prevCount = (prev._count.invoiceItems + prev._count.proposalItems + prev._count.purchaseHistory);
                    const currCount = (current._count.invoiceItems + current._count.proposalItems + current._count.purchaseHistory);
                    return currCount > prevCount ? current : prev;
                });
                defaults[g.name] = bestCandidate.id;
            });
            setSelectedMasters(defaults);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error });
        }
    };

    useEffect(() => {
        if (isOpen) {
            loadDuplicates();
        }
    }, [isOpen]);

    const handleMergeGroup = async (groupIndex: number) => {
        const group = groups[groupIndex];
        const masterId = selectedMasters[group.name];

        if (!masterId) return;

        const duplicates = group.products.filter(p => p.id !== masterId).map(p => p.id);

        if (duplicates.length === 0) return;

        setIsMerging(true);
        const result = await mergeProducts(masterId, duplicates);
        setIsMerging(false);

        if (result.success) {
            toast({ title: 'Başarılı', description: 'Ürünler birleştirildi.' });
            // Remove group from list locally
            const newGroups = [...groups];
            newGroups.splice(groupIndex, 1);
            setGroups(newGroups);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Merge className="h-4 w-4" />
                    Çift Kayıtları Birleştir
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Mükerrer Ürün Yönetimi</DialogTitle>
                    <DialogDescription>
                        İsim benzerliğine göre bulunan çift kayıtları birleştirin.
                        Seçtiğiniz "Ana Kayıt" kalacak, diğerleri silinecek ve geçmiş verileri ana kayda aktarılacaktır.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Check className="h-12 w-12 text-green-500 mb-4" />
                            <p className="text-lg font-medium">Harika! Çift kayıt bulunamadı.</p>
                            <Button variant="link" onClick={loadDuplicates} className="mt-2">
                                <RefreshCw className="mr-2 h-4 w-4" /> Yeniden Tara
                            </Button>
                        </div>
                    ) : (
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-6 p-1">
                                {groups.map((group, idx) => (
                                    <Card key={idx} className="border-l-4 border-l-amber-500">
                                        <CardContent className="pt-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-amber-50">{group.products.length} Kayıt</Badge>
                                                    "{group.name}"
                                                </h3>
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleMergeGroup(idx)}
                                                    disabled={isMerging}
                                                    className="bg-amber-600 hover:bg-amber-700"
                                                >
                                                    {isMerging ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Bu Grubu Birleştir'}
                                                </Button>
                                            </div>

                                            <RadioGroup
                                                value={selectedMasters[group.name]}
                                                onValueChange={(val) => setSelectedMasters({ ...selectedMasters, [group.name]: val })}
                                            >
                                                <div className="space-y-3">
                                                    {group.products.map(product => (
                                                        <div key={product.id} className={`flex items-start space-x-3 p-3 rounded-md border ${selectedMasters[group.name] === product.id ? 'bg-green-50 border-green-200' : 'bg-card'}`}>
                                                            <RadioGroupItem value={product.id} id={`p-${product.id}`} className="mt-1" />
                                                            <Label htmlFor={`p-${product.id}`} className="flex-1 cursor-pointer">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <div className="font-medium">{product.name}</div>
                                                                        <div className="text-sm text-muted-foreground flex gap-2 mt-1">
                                                                            <Badge variant="secondary" className="text-[10px]">{product.brand || 'Markasız'}</Badge>
                                                                            <span className="text-xs border px-1 rounded bg-muted">{product.category}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <div className="font-mono">{formatCurrency(product.listPrice)} {product.currency}</div>
                                                                        <div className="text-[10px] text-muted-foreground mt-1">
                                                                            ID: ...{product.id.slice(-6)}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3 flex gap-4 text-xs text-muted-foreground bg-white/50 p-2 rounded">
                                                                    <div title="Fatura Kalemleri">
                                                                        🧾 {product._count.invoiceItems} Fatura
                                                                    </div>
                                                                    <div title="Teklif Kalemleri">
                                                                        📄 {product._count.proposalItems} Teklif
                                                                    </div>
                                                                    <div title="Alış Geçmişi">
                                                                        🕒 {product._count.purchaseHistory} Geçmiş
                                                                    </div>
                                                                </div>
                                                            </Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </RadioGroup>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
