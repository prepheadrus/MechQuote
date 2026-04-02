'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Loader2, Sparkles, AlertTriangle, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import { InvoiceItem, Product } from "@prisma/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";
import { matchProduct } from '@/actions/matching';
import { linkInvoiceItemToProduct } from '@/actions/invoices';
import { getProducts as fetchProducts } from '@/actions/products';
import { FeedbackButtons } from './feedback-buttons';
import { CreateProductFromItemDialog } from './create-product-from-item-dialog';
import { findBestProductMatch, searchProducts } from '@/services/product-search-service';

interface BulkProductMatcherProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceItems: (InvoiceItem & { invoice?: any })[];
    onMatchComplete: (matchedCount: number, matchedItemIds?: string[]) => void;
}

interface MatchResult {
    itemId: string;
    itemName: string;
    matchedProductId: string | null;
    matchedProductName: string | null;
    confidence: number;
    status: 'pending' | 'matched' | 'not_found';
}

export function BulkProductMatcher({
    open,
    onOpenChange,
    invoiceItems,
    onMatchComplete
}: BulkProductMatcherProps) {
    const [isMatching, setIsMatching] = useState(false);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [products, setProducts] = useState<Product[]>([]);
    const [createProductForItem, setCreateProductForItem] = useState<MatchResult | null>(null);

    useEffect(() => {
        if (open) {
            loadProducts();
        }
    }, [open]);

    const loadProducts = async () => {
        const res = await fetchProducts();
        if (res.success && res.data) {
            setProducts(res.data);
        }
    };

    useEffect(() => {
        if (open && invoiceItems.length > 0 && products.length > 0 && results.length === 0) {
            performAutoMatch();
        }
    }, [open, invoiceItems, products]);

    const performAutoMatch = async () => {
        setIsMatching(true);
        setProgress({ current: 0, total: invoiceItems.length });
        const matchResults: MatchResult[] = [];

        try {
            const batchSize = 10;
            for (let i = 0; i < invoiceItems.length; i += batchSize) {
                const batch = invoiceItems.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                    batch.map(async (item) => {
                        if (item.linkedProductId) {
                            const product = products.find(p => p.id === item.linkedProductId);
                            return {
                                itemId: item.id,
                                itemName: item.name,
                                matchedProductId: item.linkedProductId,
                                matchedProductName: product?.name || 'Ürün eşleştirildi',
                                confidence: 1.0,
                                status: 'matched' as const
                            };
                        }

                        // Use new centralized search service
                        const matchResult = findBestProductMatch(item.name, products, 5); // Lower threshold: 5 instead of 10

                        console.log('[BulkMatcher] Matching:', item.name);
                        console.log('[BulkMatcher] Products searched:', products.length);
                        if (matchResult) {
                            console.log(`  → Matched: ${matchResult.product.name} (Score: ${matchResult.score}, Confidence: ${matchResult.confidence})`);
                        } else {
                            console.log('  → No match found (threshold: 5)');
                            // Show top 3 close matches for debugging
                            const allResults = searchProducts(products, item.name);
                            if (allResults.length > 0) {
                                console.log('  → Close matches (below threshold):');
                                allResults.slice(0, 3).forEach((r, i) => {
                                    console.log(`    ${i + 1}. ${r.product.name} (Score: ${r.score})`);
                                });
                            }
                        }

                        if (matchResult && matchResult.product) {
                            // SADECE yüksek confidence'lı eşleşmeleri göster (0.6+ = medium/high)
                            if (matchResult.confidence === 'high' || matchResult.confidence === 'medium') {
                                return {
                                    itemId: item.id,
                                    itemName: item.name,
                                    matchedProductId: matchResult.product.id,
                                    matchedProductName: matchResult.product.name,
                                    confidence: matchResult.score / 100, // Normalize to 0-1
                                    status: 'matched' as const
                                };
                            } else {
                                // Düşük confidence → Eşleşme yok
                                return {
                                    itemId: item.id,
                                    itemName: item.name,
                                    matchedProductId: null,
                                    matchedProductName: null,
                                    confidence: matchResult.score / 100,
                                    status: 'not_found' as const
                                };
                            }
                        }
                        return {
                            itemId: item.id,
                            itemName: item.name,
                            matchedProductId: null,
                            matchedProductName: null,
                            confidence: 0,
                            status: 'not_found' as const
                        };
                    })
                );
                matchResults.push(...batchResults);
                setProgress({ current: i + batch.length, total: invoiceItems.length });
            }
            setResults(matchResults);

            // SADECE yüksek confidence'lı eşleşmeleri otomatik seç (0.8+ = %80+ emin)
            const autoSelected = new Set(
                matchResults
                    .filter(r => r.status === 'matched' && r.confidence >= 0.8 && r.matchedProductId)
                    .map(r => r.itemId)
            );
            setSelectedItems(autoSelected);

            console.log('[BulkProductMatcher] Auto-match complete:', {
                total: matchResults.length,
                matched: matchResults.filter(r => r.status === 'matched').length,
                highConfidence: matchResults.filter(r => r.confidence >= 0.8).length,
                autoSelected: autoSelected.size
            });
        } catch (error) {
            console.error('Bulk matching failed:', error);
            toast({
                title: "Hata",
                description: "Toplu eşleştirme sırasında bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsMatching(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allMatched = new Set(
                results.filter(r => r.status === 'matched' && r.matchedProductId).map(r => r.itemId)
            );
            setSelectedItems(allMatched);
            console.log('[BulkProductMatcher] Select All:', allMatched.size, 'items');
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelectItem = (itemId: string, checked: boolean) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
            newSelected.add(itemId);
        } else {
            newSelected.delete(itemId);
        }
        setSelectedItems(newSelected);
        console.log('[BulkProductMatcher] Selected item:', itemId, checked, '→ Total:', newSelected.size);
    };

    const handleConfirmMatch = async () => {
        if (selectedItems.size === 0) {
            toast({ title: "Uyarı", description: "Lütfen en az bir ürün seçin." });
            return;
        }
        setIsMatching(true);
        let successCount = 0;
        let failCount = 0;
        const matchedItemIds: string[] = [];

        try {
            const itemsToMatch = results.filter(r => selectedItems.has(r.itemId));
            console.log('[BulkProductMatcher] Starting to save:', itemsToMatch.length, 'items');
            for (let i = 0; i < itemsToMatch.length; i++) {
                const result = itemsToMatch[i];
                if (result.matchedProductId) {
                    console.log('[BulkProductMatcher] Linking item:', result.itemId, 'to product:', result.matchedProductId);
                    const linkResult = await linkInvoiceItemToProduct(result.itemId, result.matchedProductId);
                    console.log('[BulkProductMatcher] Link result:', linkResult);
                    if (linkResult.success) {
                        successCount++;
                        matchedItemIds.push(result.itemId);
                    } else {
                        failCount++;
                        console.error('[BulkProductMatcher] Failed to link:', result.itemId, linkResult.error);
                    }
                }
            }
            console.log('[BulkProductMatcher] Complete:', { success: successCount, fail: failCount, matchedItemIds });
            toast({
                title: "Başarılı",
                description: `${successCount} ürün başarıyla eşleştirildi.${failCount > 0 ? ` ${failCount} başarısız.` : ''}`,
            });
            onMatchComplete(successCount, matchedItemIds);
            onOpenChange(false);
        } catch (error) {
            console.error('[BulkProductMatcher] Confirm matching failed:', error);
            toast({
                title: "Hata",
                description: "Eşleştirme kaydedilirken bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setIsMatching(false);
        }
    };

    const getStatusIcon = (status: MatchResult['status'], confidence: number) => {
        if (status === 'matched') {
            if (confidence >= 0.8) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            if (confidence >= 0.5) return <CheckCircle2 className="h-5 w-5 text-yellow-600" />;
            return <AlertCircle className="h-5 w-5 text-orange-600" />;
        }
        return <X className="h-5 w-5 text-red-600" />;
    };

    const getStatusText = (status: MatchResult['status'], confidence: number) => {
        if (status === 'matched') {
            if (confidence >= 0.8) return `Eşleşti (%${(confidence * 100).toFixed(0)})`;
            if (confidence >= 0.5) return `Orta (%${(confidence * 100).toFixed(0)})`;
            return `Düşük (%${(confidence * 100).toFixed(0)})`;
        }
        return 'Eşleşme Bulunamadı';
    };

    const matchedCount = results.filter(r => r.status === 'matched').length;
    const notFoundCount = results.filter(r => r.status === 'not_found').length;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5" />
                            Toplu Ürün Eşleştirme
                        </DialogTitle>
                        <DialogDescription>
                            {invoiceItems.length} fatura kalemi için otomatik eşleştirme yapılıyor.
                        </DialogDescription>
                    </DialogHeader>
                    {isMatching && progress.total > 0 && (
                        <div className="w-full">
                            <div className="flex items-center gap-2 mb-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">
                                    Eşleştiriliyor: {progress.current} / {progress.total}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {!isMatching && results.length > 0 && (
                        <div className="flex gap-4">
                            <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Eşleşen: {matchedCount}
                            </Badge>
                            <Badge variant="secondary" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Bulunamadı: {notFoundCount}
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                                Seçili: {selectedItems.size}
                            </Badge>
                        </div>
                    )}
                    <ScrollArea className="flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox
                                            checked={results.filter(r => r.status === 'matched' && r.matchedProductId).length > 0 && selectedItems.size === results.filter(r => r.status === 'matched' && r.matchedProductId).length}
                                            onCheckedChange={handleSelectAll}
                                            disabled={isMatching}
                                        />
                                    </TableHead>
                                    <TableHead>Ürün Adı</TableHead>
                                    <TableHead>Eşleşen Ürün</TableHead>
                                    <TableHead className="text-right">Birim Fiyat</TableHead>
                                    <TableHead>Miktar</TableHead>
                                    <TableHead>Durum</TableHead>
                                    <TableHead className="w-[150px]">Geri Bildirim</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map((result, index) => (
                                    <TableRow key={`${result.itemId}-${index}`}>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedItems.has(result.itemId)}
                                                onCheckedChange={(checked) => handleSelectItem(result.itemId, checked as boolean)}
                                                disabled={result.status !== 'matched' || isMatching}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{result.itemName}</TableCell>
                                        <TableCell>
                                            {result.matchedProductName ? (
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(result.status, result.confidence)}
                                                    <span className={result.confidence >= 0.8 ? 'text-green-600' : result.confidence >= 0.5 ? 'text-yellow-600' : 'text-orange-600'}>
                                                        {result.matchedProductName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-sm">Eşleşme yok</span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCreateProductForItem(result)}
                                                        className="h-7 text-xs gap-1"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Yeni Ürün
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(invoiceItems.find(i => i.id === result.itemId)?.unitPrice || 0)}
                                        </TableCell>
                                        <TableCell>
                                            {invoiceItems.find(i => i.id === result.itemId)?.quantity || 0}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(result.status, result.confidence)}
                                                <span className="text-sm text-muted-foreground">
                                                    {getStatusText(result.status, result.confidence)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <FeedbackButtons
                                                invoiceItemId={result.itemId || invoiceItems.find(i => i.name === result.itemName)?.id || 'unknown'}
                                                invoiceItemName={result.itemName}
                                                matchedProductId={result.matchedProductId}
                                                matchedProductName={result.matchedProductName}
                                                confidence={result.confidence}
                                                onFeedbackSubmitted={async (type, newProductId) => {
                                                    if (type === 'corrected' && newProductId) {
                                                        const product = products.find(p => p.id === newProductId);
                                                        if (product) {
                                                            const updatedResults = results.map(r => {
                                                                if (r.itemId === result.itemId) {
                                                                    return {
                                                                        ...r,
                                                                        matchedProductId: newProductId,
                                                                        matchedProductName: product.name,
                                                                        confidence: 1.0,
                                                                        status: 'matched' as const
                                                                    };
                                                                }
                                                                return r;
                                                            });
                                                            setResults(updatedResults);
                                                            try {
                                                                await linkInvoiceItemToProduct(result.itemId, newProductId);
                                                                console.log('[BulkProductMatcher] Manual match saved:', result.itemId, '→', newProductId);
                                                                const newSelected = new Set(selectedItems);
                                                                newSelected.add(result.itemId);
                                                                setSelectedItems(newSelected);
                                                                toast({
                                                                    title: "Kaydedildi",
                                                                    description: "Manuel eşleştirme kaydedildi.",
                                                                    duration: 2000,
                                                                });
                                                            } catch (error) {
                                                                console.error('[BulkProductMatcher] Failed to save manual match:', error);
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMatching}>İptal</Button>
                        <Button
                            onClick={handleConfirmMatch}
                            disabled={isMatching || selectedItems.size === 0}
                            className="gap-2"
                        >
                            {isMatching ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
                            ) : (
                                <><Check className="h-4 w-4" /> Seçili Ürünleri Eşleştir ({selectedItems.size})</>
                            )}
                        </Button>
                        {selectedItems.size === 0 && results.length > 0 && (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    const allMatched = new Set(
                                        results.filter(r => r.status === 'matched' && r.matchedProductId).map(r => r.itemId)
                                    );
                                    setSelectedItems(allMatched);
                                    console.log('[BulkProductMatcher] Quick select all:', allMatched.size, 'items');
                                }}
                                disabled={isMatching}
                                className="gap-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Tümünü Seç ({results.filter(r => r.status === 'matched' && r.matchedProductId).length})
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {createProductForItem && (
                <CreateProductFromItemDialog
                    open={!!createProductForItem}
                    onOpenChange={(open) => {
                        if (!open) setCreateProductForItem(null);
                    }}
                    invoiceItem={createProductForItem}
                    onProductCreated={(product, item) => {
                        const updatedResults = results.map(r => {
                            if (r.itemId === item.itemId) {
                                return {
                                    ...r,
                                    matchedProductId: product.id,
                                    matchedProductName: product.name,
                                    confidence: 1.0,
                                    status: 'matched' as const
                                };
                            }
                            return r;
                        });
                        setResults(updatedResults);
                        linkInvoiceItemToProduct(item.itemId, product.id).then(() => {
                            console.log('[BulkProductMatcher] New product created and linked:', product.name);
                            const newSelected = new Set(selectedItems);
                            newSelected.add(item.itemId);
                            setSelectedItems(newSelected);
                            setCreateProductForItem(null);
                        });
                    }}
                />
            )}
        </>
    );
}
