'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check } from 'lucide-react';
import { Product } from '@prisma/client';
import { toast } from "@/hooks/use-toast";
import { createProduct } from '@/actions/products';

interface MatchResult {
    itemId: string;
    itemName: string;
    matchedProductId: string | null;
    matchedProductName: string | null;
    confidence: number;
    status: 'pending' | 'matched' | 'not_found';
}

interface CreateProductFromItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceItem: MatchResult;
    onProductCreated: (product: Product, item: MatchResult) => void;
}

export function CreateProductFromItemDialog({
    open,
    onOpenChange,
    invoiceItem,
    onProductCreated
}: CreateProductFromItemDialogProps) {
    const [name, setName] = useState(invoiceItem.itemName || '');
    const [brand, setBrand] = useState('Firat');
    const [model, setModel] = useState('');
    const [code, setCode] = useState('');
    const [category, setCategory] = useState('Genel');
    const [price, setPrice] = useState(0);
    const [unit, setUnit] = useState('Adet');
    const [vatRate, setVatRate] = useState('20');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const result = await createProduct({
                name: name,
                brand: brand,
                model: model,
                category: category,
                unit: unit,
                listPrice: Number(price),
                currency: 'TRY',
                vatRate: Number(vatRate) / 100,
                basePrice: Number(price),
                priceIncludesVat: false,
                code: code || `AUTO-${Date.now().toString().slice(-6)}`,
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

            onProductCreated(result.data, invoiceItem);
            toast({ title: "Başarılı", description: "Yeni ürün oluşturuldu ve eşleştirildi." });
        } catch (error: any) {
            console.error('[CreateProduct] Error:', error);
            toast({ 
                title: "Hata", 
                description: error.message || 'Ürün oluşturulurken hata oluştu.', 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Yeni Ürün Oluştur</DialogTitle>
                    <DialogDescription>
                        &quot;{invoiceItem.itemName}&quot; için yeni ürün kartı oluşturun.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label className="font-bold">Ürün Adı</Label>
                        <Textarea
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="min-h-[60px]"
                            placeholder="Ürün adını giriniz..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Marka</Label>
                            <Input value={brand} onChange={e => setBrand(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Model</Label>
                            <Input value={model} onChange={e => setModel(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Ürün Kodu</Label>
                            <Input value={code} onChange={e => setCode(e.target.value)} placeholder="Otomatik atanacak..." />
                        </div>
                        <div className="grid gap-2">
                            <Label>Kategori</Label>
                            <Input value={category} onChange={e => setCategory(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Birim Fiyat (TL)</Label>
                            <Input 
                                type="number" 
                                value={price} 
                                onChange={e => setPrice(Number(e.target.value))} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>KDV Oranı (%)</Label>
                            <Input 
                                type="number" 
                                value={vatRate} 
                                onChange={e => setVatRate(e.target.value)} 
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Birim</Label>
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        İptal
                    </Button>
                    <Button onClick={handleCreate} disabled={loading} className="gap-2">
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Oluşturuluyor...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Oluştur ve Eşleştir
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
