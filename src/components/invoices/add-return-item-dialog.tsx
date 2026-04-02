'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPurchasedProductsBySupplier, addInvoiceItems } from '@/actions/invoices';
import { formatCurrency } from '@/lib/formatters';
import { useToast } from "@/hooks/use-toast";

interface AddReturnItemDialogProps {
    invoiceId: string;
    supplierName: string;
    onItemsAdded?: () => void;
}

export function AddReturnItemDialog({ invoiceId, supplierName, onItemsAdded }: AddReturnItemDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Map<string, any>>(new Map());
    const { toast } = useToast();

    // Fetch products when dialog opens
    useEffect(() => {
        if (isOpen && supplierName) {
            const loadProducts = async () => {
                setIsLoading(true);
                const result = await getPurchasedProductsBySupplier(supplierName);
                setIsLoading(false);
                if (result.success && result.data) {
                    setProducts(result.data);
                } else {
                    toast({ variant: 'destructive', title: 'Hata', description: 'Ürünler yüklenemedi.' });
                }
            };
            loadProducts();
        }
    }, [isOpen, supplierName, toast]);

    const handleProductSelect = (product: any, isChecked: boolean) => {
        const newMap = new Map(selectedProducts);
        if (isChecked) {
            newMap.set(product.productId, {
                ...product,
                returnQuantity: 1,
                returnPrice: product.lastPrice
            });
        } else {
            newMap.delete(product.productId);
        }
        setSelectedProducts(newMap);
    };

    const handleQuantityChange = (productId: string, val: number) => {
        const product = selectedProducts.get(productId);
        if (product) {
            setSelectedProducts(new Map(selectedProducts).set(productId, { ...product, returnQuantity: val }));
        }
    };

    const handlePriceChange = (productId: string, val: number) => {
        const product = selectedProducts.get(productId);
        if (product) {
            setSelectedProducts(new Map(selectedProducts).set(productId, { ...product, returnPrice: val }));
        }
    };

    const handleSave = async () => {
        if (selectedProducts.size === 0) return;

        setIsLoading(true);
        const items = Array.from(selectedProducts.values()).map(p => ({
            name: p.name,
            productId: p.productId,
            quantity: p.returnQuantity,
            unitPrice: p.returnPrice,
            totalPrice: p.returnQuantity * p.returnPrice,
            unit: p.unit
        }));

        const result = await addInvoiceItems(invoiceId, items);
        setIsLoading(false);

        if (result.success) {
            toast({ title: 'Başarılı', description: 'Kalemler eklendi.' });
            setIsOpen(false);
            setSelectedProducts(new Map());
            onItemsAdded?.();
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error });
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.originalName && p.originalName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Yeni Kalem Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] h-[90vh] flex flex-col p-6">
                <DialogHeader className="px-1 py-2">
                    <DialogTitle className="text-xl">İade İçin Ürün Seçimi</DialogTitle>
                </DialogHeader>

                <div className="relative mb-4 px-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Ürün adı veya fatura ismi ara..."
                        className="pl-10 h-11 text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex-1 overflow-auto border rounded-md shadow-sm">
                    <Table>
                        <TableHeader className="sticky top-0 bg-secondary/50 z-10 backdrop-blur-sm">
                            <TableRow className="h-12 hover:bg-transparent border-b-2 border-border/50">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Ürün</TableHead>
                                <TableHead className="text-xs font-semibold">Fatura Tarihi</TableHead>
                                <TableHead className="text-xs font-semibold">Fatura No</TableHead>
                                <TableHead className="text-right text-xs font-semibold">Alım Miktarı</TableHead>
                                <TableHead className="text-right text-xs font-semibold">Net Fiyat</TableHead>
                                <TableHead className="text-right text-xs font-semibold">KDV</TableHead>
                                <TableHead className="text-right text-xs font-semibold">Toplam</TableHead>
                                <TableHead className="w-[140px] text-center border-l bg-amber-50/80 font-bold text-amber-900">İade Miktarı</TableHead>
                                <TableHead className="w-[160px] text-right bg-amber-50/80 font-bold text-amber-900">İade Fiyatı</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/50" />
                                        <span className="sr-only">Yükleniyor...</span>
                                    </TableCell>
                                </TableRow>
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => {
                                    const isSelected = selectedProducts.has(product.productId);
                                    const selection = selectedProducts.get(product.productId);

                                    return (
                                        <TableRow key={product.productId} className={`h-14 ${isSelected ? 'bg-amber-50/30' : 'hover:bg-muted/30'}`}>
                                            <TableCell className="py-2">
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => handleProductSelect(product, checked as boolean)}
                                                    className="h-5 w-5"
                                                />
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="font-semibold text-base leading-tight">{product.name}</div>
                                                {product.originalName && product.originalName !== product.name && (
                                                    <div className="text-xs text-muted-foreground italic mt-1 flex items-center gap-1">
                                                        <span className="bg-muted px-1 rounded text-[10px] uppercase tracking-wider">FATURA İSMİ</span>
                                                        {product.originalName}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="py-2">
                                                <div className="text-sm text-muted-foreground whitespace-nowrap">{new Date(product.lastDate).toLocaleDateString()}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm py-2 text-muted-foreground">
                                                {product.invoiceNumber}
                                            </TableCell>
                                            <TableCell className="text-right text-sm py-2 font-medium">
                                                <Badge variant="secondary" className="font-mono font-normal">
                                                    {product.quantity} {product.unit}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm py-2 text-muted-foreground">
                                                {formatCurrency(product.netPrice || product.lastPrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm py-2 text-muted-foreground">
                                                {formatCurrency(product.taxAmount || 0)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-sm font-semibold py-2">
                                                {formatCurrency(product.totalAmount || (product.lastPrice * product.quantity))}
                                            </TableCell>
                                            <TableCell className="p-2 border-l bg-amber-50/20">
                                                {isSelected ? (
                                                    <Input
                                                        type="number"
                                                        className="h-10 text-center bg-white text-base shadow-sm border-amber-200 focus:border-amber-400 focus:ring-amber-200"
                                                        value={selection.returnQuantity}
                                                        onChange={(e) => handleQuantityChange(product.productId, parseFloat(e.target.value))}
                                                        min={0}
                                                    />
                                                ) : <span className="text-center block text-muted-foreground/30 text-2xl font-light">-</span>}
                                            </TableCell>
                                            <TableCell className="p-2 bg-amber-50/20">
                                                {isSelected ? (
                                                    <Input
                                                        type="number"
                                                        className="h-10 text-right bg-white text-base shadow-sm border-amber-200 focus:border-amber-400 focus:ring-amber-200"
                                                        value={selection.returnPrice}
                                                        onChange={(e) => handlePriceChange(product.productId, parseFloat(e.target.value))}
                                                    />
                                                ) : <span className="text-right block text-muted-foreground/30 text-2xl font-light">-</span>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-lg">
                                        Ürün bulunamadı.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <DialogFooter className="mt-6 gap-2 sm:justify-between">
                    <div className="text-sm text-muted-foreground flex items-center">
                        {selectedProducts.size > 0 ? (
                            <span className="text-amber-700 font-medium flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-900 border-2">{selectedProducts.size}</Badge>
                                ürün seçildi
                            </span>
                        ) : 'Henüz ürün seçilmedi'}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsOpen(false)} size="lg">İptal</Button>
                        <Button onClick={handleSave} disabled={selectedProducts.size === 0 || isLoading} size="lg" className="px-8 bg-amber-600 hover:bg-amber-700">
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Listeye Ekle
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
