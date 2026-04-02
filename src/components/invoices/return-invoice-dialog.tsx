'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, RotateCcw, Plus, Calculator, ArrowLeft, ArrowRight, Save, Loader2, Check, ChevronsUpDown, Mail, Phone } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getPurchasedProductsBySupplier, createReturnInvoice } from '@/actions/invoices';
import { getSuppliers } from '@/actions/suppliers';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { GlobalProjectSelector } from '@/components/projects/global-project-selector';

interface ReturnInvoiceDialogProps {
    onInvoiceCreated?: () => void;
}

export function ReturnInvoiceDialog({ onInvoiceCreated }: ReturnInvoiceDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1); // 1: Supplier, 2: Products, 3: Review
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Supplier
    const [supplierName, setSupplierName] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [openCombobox, setOpenCombobox] = useState(false);

    // Step 2: Product Selection
    const [availableProducts, setAvailableProducts] = useState<any[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Map<string, any>>(new Map()); // productId -> { ...product, returnQuantity: 1, returnPrice: lastPrice }
    const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

    // Fetch suppliers on mount
    useEffect(() => {
        const loadSuppliers = async () => {
            const result = await getSuppliers();
            if (result.success && result.data) {
                setSuppliers(result.data);
            }
        };
        loadSuppliers();
    }, []);

    // Navigation Handlers
    const handleNextToProducts = async () => {
        if (!supplierName.trim()) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Lütfen bir tedarikçi seçin.' });
            return;
        }

        setIsLoading(true);
        const result = await getPurchasedProductsBySupplier(supplierName);
        setIsLoading(false);

        if (result.success && result.data) {
            setAvailableProducts(result.data);
            setStep(2);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error || 'Ürünler getirilemedi.' });
        }
    };

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

    const handleNextToReview = () => {
        if (selectedProducts.size === 0) {
            toast({ variant: 'destructive', title: 'Uyarı', description: 'En az bir ürün seçmelisiniz.' });
            return;
        }
        setStep(3);
    };

    const calculateTotal = () => {
        let total = 0;
        selectedProducts.forEach(p => {
            total += (p.returnQuantity || 0) * (p.returnPrice || 0);
        });
        return total;
    };

    const handleCreateInvoice = async () => {
        setIsLoading(true);
        try {
            const items = Array.from(selectedProducts.values()).map(p => ({
                name: p.name,
                productId: p.productId,
                quantity: p.returnQuantity,
                unitPrice: p.returnPrice,
                totalPrice: p.returnQuantity * p.returnPrice,
                unit: p.unit
            }));

            const totalAmount = calculateTotal();
            const taxInclusiveTotal = totalAmount * 1.20;

            const result = await createReturnInvoice({
                supplierName,
                customerId: selectedSupplier?.id && !selectedSupplier.id.startsWith('virtual-') ? selectedSupplier.id : undefined,
                invoiceDate: new Date(),
                currency: 'TRY', // Defaulting to TRY for now
                totalAmount: totalAmount,
                taxInclusiveTotal: taxInclusiveTotal,
                items,
                projectId: selectedProjectId
            });

            if (result.success) {
                toast({ title: 'Başarılı', description: 'İade faturası oluşturuldu.' });
                setIsOpen(false);
                setStep(1);
                setSupplierName('');
                setSelectedProducts(new Map());
                setSelectedProjectId(undefined);
                if (onInvoiceCreated) onInvoiceCreated();
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Hata', description: 'Bir hata oluştu.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-dashed">
                    <RotateCcw className="h-4 w-4" />
                    İade Faturası Ekle
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col w-full">
                <DialogHeader>
                    <DialogTitle>İade Faturası Oluşturma Sihirbazı</DialogTitle>
                    <DialogDescription>
                        {step === 1 && "İade yapılacak tedarikçiyi belirleyin."}
                        {step === 2 && "İade edilecek ürünleri seçin."}
                        {step === 3 && "Fatura detaylarını onaylayın."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {step === 1 && (
                        <div className="flex flex-col gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Tedarikçi Seçimi</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Tedarikçi adı ara..."
                                        className="pl-9 h-12 text-lg"
                                        value={supplierName}
                                        onChange={(e) => setSupplierName(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="h-[300px] border rounded-md overflow-hidden relative">
                                    <div className="absolute inset-0 overflow-y-auto p-2 space-y-1">
                                        {suppliers
                                            .filter(s => s.name.toLowerCase().includes(supplierName.toLowerCase()))
                                            .length > 0 ? (
                                            suppliers
                                                .filter(s => s.name.toLowerCase().includes(supplierName.toLowerCase()))
                                                .map(supplier => (
                                                    <div
                                                        key={supplier.id}
                                                        onClick={() => {
                                                            setSupplierName(supplier.name);
                                                            setSelectedSupplier(supplier);
                                                        }}
                                                        className={cn(
                                                            "p-3 rounded-md cursor-pointer hover:bg-accent transition-colors border border-transparent",
                                                            supplierName === supplier.name ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                                                        )}
                                                    >
                                                        <div className="font-semibold flex items-center justify-between">
                                                            {supplier.name}
                                                            {supplierName === supplier.name && <Check className="h-4 w-4" />}
                                                        </div>
                                                        <div className={cn("text-xs flex flex-col gap-1 mt-1", supplierName === supplier.name ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                                            {supplier.contactName && <span>Yetkili: {supplier.contactName}</span>}
                                                            <div className="flex items-center gap-3 opacity-90">
                                                                {supplier.phone && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={cn("text-[10px] px-1 rounded", supplierName === supplier.name ? "bg-primary-foreground/20" : "bg-slate-100 dark:bg-slate-800")}>TEL</span>
                                                                        <span>{supplier.phone}</span>
                                                                    </div>
                                                                )}
                                                                {supplier.email && (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className={cn("text-[10px] px-1 rounded", supplierName === supplier.name ? "bg-primary-foreground/20" : "bg-slate-100 dark:bg-slate-800")}>POSTA</span>
                                                                        <span>{supplier.email}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
                                                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-2">
                                                    <Search className="h-6 w-6 opacity-30" />
                                                </div>
                                                <p>"{supplierName}" ile eşleşen tedarikçi bulunamadı.</p>
                                                <p className="text-xs mt-1 opacity-70">
                                                    Listede olmayan bir firma için önce Tedarikçiler sayfasına ekleme yapmalısınız.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <h3 className="font-medium text-lg">"{supplierName}" firmasından alınan ürünler</h3>
                                    <p className="text-sm text-muted-foreground">İade etmek istediğiniz ürünleri listeden seçin.</p>
                                </div>
                                <div className="relative w-full">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ürün adı, fatura no veya kod ara..."
                                        className="pl-10 h-10 w-full"
                                        value={productSearchTerm}
                                        onChange={(e) => setProductSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="border rounded-md overflow-hidden">
                                <div className="max-h-[500px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="w-[40px]"></TableHead>
                                                <TableHead>Ürün</TableHead>
                                                <TableHead>Fatura Tarihi</TableHead>
                                                <TableHead>Fatura No</TableHead>
                                                <TableHead className="text-right">Alım Miktarı</TableHead>
                                                <TableHead className="text-right">Net Fiyat</TableHead>
                                                <TableHead className="text-right">KDV</TableHead>
                                                <TableHead className="text-right">Toplam</TableHead>
                                                <TableHead className="w-[100px] text-center border-l bg-amber-50/50">İade Miktarı</TableHead>
                                                <TableHead className="w-[120px] text-right bg-amber-50/50">İade Fiyatı</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {availableProducts
                                                .filter(p => {
                                                    const terms = productSearchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
                                                    const searchTarget = `${p.name} ${p.originalName || ''} ${p.invoiceNumber} ${p.productId}`.toLowerCase();
                                                    return terms.every(term => searchTarget.includes(term));
                                                })
                                                .map(product => {
                                                    const isSelected = selectedProducts.has(product.productId);
                                                    const selectedData = selectedProducts.get(product.productId);

                                                    return (
                                                        <TableRow key={product.productId} data-state={isSelected ? 'selected' : undefined}>
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onCheckedChange={(c) => handleProductSelect(product, !!c)}
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-medium">
                                                                <div className="font-semibold text-sm">{product.name}</div>
                                                                {product.originalName && product.originalName !== product.name && (
                                                                    <div className="text-xs text-muted-foreground italic flex items-center gap-1 mt-0.5" title="Faturadaki İsim">
                                                                        <span className="opacity-70">Fatura:</span> {product.originalName}
                                                                    </div>
                                                                )}
                                                                <div className="text-[10px] text-muted-foreground mt-0.5 bg-slate-100 dark:bg-slate-800 inline-block px-1 rounded">
                                                                    {product.unit || 'Adet'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-xs">{new Date(product.lastDate).toLocaleDateString()}</div>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs">
                                                                {product.invoiceNumber}
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs">
                                                                {product.quantity}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                                {formatCurrency(product.netPrice)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                                {formatCurrency(product.taxAmount)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                                {formatCurrency(product.totalAmount)}
                                                            </TableCell>

                                                            <TableCell className="p-2 border-l bg-amber-50/30">
                                                                {isSelected && (
                                                                    <Input
                                                                        type="number"
                                                                        className="h-8 text-center bg-white"
                                                                        value={selectedData.returnQuantity}
                                                                        onChange={(e) => handleQuantityChange(product.productId, parseFloat(e.target.value))}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="p-2 bg-amber-50/30">
                                                                {isSelected && (
                                                                    <Input
                                                                        type="number"
                                                                        className="h-8 text-right bg-white"
                                                                        value={selectedData.returnPrice}
                                                                        onChange={(e) => handlePriceChange(product.productId, parseFloat(e.target.value))}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            {availableProducts.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                                                        Bu tedarikçiden kayıtlı ürün alış geçmişi bulunamadı.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-md border border-blue-100 dark:border-blue-900">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400">Proje Bağlantısı (Opsiyonel)</Label>
                                    <GlobalProjectSelector
                                        value={selectedProjectId}
                                        onSelect={(id) => setSelectedProjectId(id)}
                                        placeholder="İadeyi bir projeye bağlamak için arayın..."
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Bu iade faturası seçilen projenin maliyetlerinden düşülecektir.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md border border-amber-200 dark:border-amber-900">
                                <div className="flex items-center gap-4">
                                    <div className="bg-amber-100 p-2 rounded-full dark:bg-amber-900">
                                        <RotateCcw className="h-6 w-6 text-amber-700 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg text-amber-900 dark:text-amber-100">İade Faturası Özeti</h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300">
                                            <b>{supplierName}</b> firmasına {selectedProducts.size} kalem ürün iade ediliyor.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="border rounded-md p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ürün</TableHead>
                                            <TableHead className="text-center">Miktar</TableHead>
                                            <TableHead className="text-right">Birim Fiyat</TableHead>
                                            <TableHead className="text-right">Tutar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Array.from(selectedProducts.values()).map(item => (
                                            <TableRow key={item.productId}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell className="text-center">{item.returnQuantity} {item.unit}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.returnPrice)}</TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatCurrency(item.returnQuantity * item.returnPrice)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="flex justify-end p-4 border-t mt-4">
                                    <div className="text-right">
                                        <div className="text-sm text-muted-foreground">Ara Toplam</div>
                                        <div className="text-2xl font-bold">{formatCurrency(calculateTotal())}</div>
                                        <div className="text-xs text-muted-foreground">+ KDV Dahil değildir (Fatura üzerinde hesaplanır)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isLoading}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
                        </Button>
                    )}

                    <div className="flex-1"></div>

                    {step === 1 && (
                        <Button onClick={handleNextToProducts} disabled={!supplierName || isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                            Devam Et
                        </Button>
                    )}

                    {step === 2 && (
                        <Button onClick={handleNextToReview} disabled={selectedProducts.size === 0}>
                            Devam Et <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}

                    {step === 3 && (
                        <Button onClick={handleCreateInvoice} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Faturayı Oluştur
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
