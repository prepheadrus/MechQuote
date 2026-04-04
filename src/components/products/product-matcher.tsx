import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check, Link as LinkIcon, Search, AlertCircle, ArrowRight, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Product, InvoiceItem } from "@prisma/client";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct, ensureProductInPrisma, getProductDetails, getProductList, updateProduct, addPurchaseHistory, getUniqueCategories } from "@/actions/products";
import { findSuggestedProductId, getInvoices, linkInvoiceItemToProduct } from "@/actions/invoices";
import { suggestProductDetails } from "@/actions/matching";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Wand2, Loader2, ChevronsUpDown, Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspace } from '@/components/workspace/workspace-context';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

interface ProductMatcherProps {
    invoiceItem: InvoiceItem;
    onMatch: (productId: string) => void;
}

function CreateProductDialog({
    open,
    onOpenChange,
    invoiceItem,
    onProductCreated
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceItem: InvoiceItem;
    onProductCreated: (productId: string) => void;
}) {
    const [name, setName] = useState(invoiceItem.name || '');
    const [brand, setBrand] = useState('Diğer');
    const [model, setModel] = useState('');
    const [code, setCode] = useState('');
    const [category, setCategory] = useState('Genel');
    const [price, setPrice] = useState(invoiceItem.listPrice || invoiceItem.unitPrice || 0);
    const [unit, setUnit] = useState(invoiceItem.unit || 'Adet');
    const [vatRate, setVatRate] = useState(invoiceItem.taxRate?.toString() || '20');
    const [loading, setLoading] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    
    // Category Selector State
    const [categories, setCategories] = useState<string[]>([]);
    const [catOpen, setCatOpen] = useState(false);
    const [catSearch, setCatSearch] = useState('');

    const fetchCategories = async () => {
        const res = await getUniqueCategories();
        if (res.success && res.data) {
            setCategories(res.data);
        }
    };

    const handleAutoSuggest = async () => {
        setIsSuggesting(true);
        try {
            const suggestion = await suggestProductDetails(invoiceItem.name);
            if (suggestion) {
                setName(suggestion.suggestedName);
                setCode(suggestion.suggestedCode);
                // Only use the suggested category if confidence is high, otherwise stick to current or Genel
                if (suggestion.suggestedCategory && suggestion.confidence > 0.5) {
                    setCategory(suggestion.suggestedCategory);
                } else {
                    setCategory('Genel');
                }
            }
        } finally {
            setIsSuggesting(false);
        }
    };

    useEffect(() => {
        if (open) {
            // Reset form when opened
            setName(invoiceItem.name);
            setPrice(invoiceItem.listPrice || invoiceItem.unitPrice || 0);
            setUnit(invoiceItem.unit || 'Adet');
            setVatRate(invoiceItem.taxRate?.toString() || '20');
            setModel('');
            setCode('');
            setCategory('Genel');
            
            fetchCategories();
            handleAutoSuggest();
        }
    }, [open, invoiceItem]);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const result = await createProduct({
                name: name,
                brand: brand || 'Diğer',
                model: model || '',
                category: category || 'Genel',
                unit: unit,
                listPrice: Number(price),
                currency: 'TRY',
                vatRate: Number(vatRate) / 100,
                basePrice: Number(price),
                priceIncludesVat: false,
                code: code || null,
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
            onProductCreated(result.data.id);

            toast({
                title: "Başarılı",
                description: "Ürün oluşturuldu ve eşleştirildi."
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Hata",
                description: error.message || 'Ürün oluşturulamadı',
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle>Yeni Ürün Oluştur</DialogTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 gap-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200"
                            onClick={handleAutoSuggest}
                            disabled={isSuggesting}
                        >
                            {isSuggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                            Akıllı Öneri
                        </Button>
                    </div>
                    <DialogDescription>
                        Fatura kaleminden yeni bir stok kartı oluşturun.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="flex justify-between">
                            Ürün Adı
                            {name !== invoiceItem.name && (
                                <span className="text-[10px] text-blue-600 font-normal">Temizlendi</span>
                            )}
                        </Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                        <div className="text-[10px] text-muted-foreground truncate italic">
                            Orijinal: {invoiceItem.name}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category">Kategori</Label>
                            <Popover open={catOpen} onOpenChange={setCatOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={catOpen}
                                        className="w-full justify-between font-normal"
                                    >
                                        {category || "Kategori Seç..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                    <Command>
                                        <CommandInput 
                                            placeholder="Kategori ara veya yaz..." 
                                            value={catSearch}
                                            onValueChange={setCatSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty className="p-0">
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full justify-start text-xs text-blue-600 py-2 h-auto"
                                                    onClick={() => {
                                                        setCategory(catSearch);
                                                        setCatOpen(false);
                                                    }}
                                                >
                                                    <Plus className="mr-2 h-3 w-3" />
                                                    Yeni Ekle: "{catSearch}"
                                                </Button>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {categories.map((c) => (
                                                    <CommandItem
                                                        key={c}
                                                        value={c}
                                                        onSelect={(currentValue) => {
                                                            setCategory(currentValue);
                                                            setCatOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                category === c ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {c}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="code">Ürün Kodu</Label>
                            <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="Örn: TR-1002" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="brand">Marka</Label>
                            <Input id="brand" value={brand} onChange={e => setBrand(e.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="model">Model</Label>
                            <Input id="model" value={model} onChange={e => setModel(e.target.value)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="price">Liste Fiyatı (TRY)</Label>
                            <Input id="price" type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="unit">Birim</Label>
                            <Select value={unit} onValueChange={setUnit}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Adet">Adet</SelectItem>
                                    <SelectItem value="Kutu">Kutu</SelectItem>
                                    <SelectItem value="Takım">Takım</SelectItem>
                                    <SelectItem value="Kg">Kg</SelectItem>
                                    <SelectItem value="Metre">Metre</SelectItem>
                                    <SelectItem value="Saat">Saat</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="vat">KDV Oranı (%)</Label>
                        <Select value={vatRate} onValueChange={setVatRate}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">%0</SelectItem>
                                <SelectItem value="1">%1</SelectItem>
                                <SelectItem value="10">%10</SelectItem>
                                <SelectItem value="20">%20</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                    <Button onClick={handleCreate} disabled={loading} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Oluştur ve Eşle
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ProductMatcher({ invoiceItem, onMatch }: ProductMatcherProps) {
    const [open, setOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [createProductOpen, setCreateProductOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestedProductId, setSuggestedProductId] = useState<string | null>(null);

    // History & Anomaly State
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [anomalyWarning, setAnomalyWarning] = useState<string | null>(null);
    const { openPeek } = useWorkspace();

    // Auto-fill search term & Suggestion Logic
    useEffect(() => {
        if (open && invoiceItem.name) {
            setSearchTerm(invoiceItem.name);
            // Check for previous matches
            findSuggestedProductId(invoiceItem.name).then(res => {
                if (res.success && res.data) {
                    setSuggestedProductId(res.data);
                }
            });
        }
    }, [open, invoiceItem.name]);

    // Fuzzy search logic with Suggestion Boosting
    useEffect(() => {
        const search = async () => {
            if (!searchTerm || searchTerm.trim().length === 0) {
                setResults([]);
                return;
            }
            setIsSearching(true);
            try {
                // Advanced Token Search
                // 1. Normalize search term
                // Replace dimension separators (x, *, X) and other common delimiters with space
                const normalizedSearch = searchTerm.toLocaleLowerCase('tr')
                    .replace(/['"]/g, '')
                    .replace(/[x\*]/g, ' ');

                // 2. Split into tokens by whitespace and punctuation
                const tokens = normalizedSearch.split(/[\s\-\/\.\,]+/).filter(t => t.length >= 1);

                if (tokens.length === 0) {
                    setResults([]);
                    return;
                }

                // Get all products from server
                const res = await getProductList();
                const candidates = (res.success && res.data ? res.data : []) as Product[];

                // Advanced Token Search with Scoring
                // Calculate a score for each product based on how many tokens match
                const scoredResults = candidates.map(p => {
                    // Combine all searchable fields into one large string
                    const searchableText = [
                        p.name,
                        p.brand,
                        p.model,
                        p.code
                    ].filter(Boolean).join(' ').toLocaleLowerCase('tr');

                    let score = 0;
                    // Count matches: +1 for each token found in the searchable text
                    tokens.forEach(token => {
                        if (searchableText.includes(token)) {
                            score += 1;
                        }
                    });

                    // Bonus: +1 if the exact phrase is found (for better ordering of exact matches)
                    if (searchableText.includes(normalizedSearch)) {
                        score += 2;
                    }

                    // BOOST SCORE IF SUGGESTED
                    if (suggestedProductId && p.id === suggestedProductId) {
                        score += 1000; // Force to top
                    }

                    return { product: p, score };
                });

                // Filter out zero matches and sort by score descending
                const filteredResults = scoredResults
                    .filter(item => item.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .map(item => item.product);

                // Slice results to limit rendering
                setResults(filteredResults.slice(0, 50));
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(search, 300); // Slightly increased debounce for better perf
        return () => clearTimeout(timer);
    }, [searchTerm, suggestedProductId]);

    // Anomaly Check Logic
    const checkPriceAnomaly = (history: any[], newPrice: number) => {
        if (!history || history.length === 0) return null;

        // Sort by date descending
        const sorted = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const lastPurchase = sorted[0];

        if (!lastPurchase) return null;

        const lastPrice = lastPurchase.netPrice || lastPurchase.listPrice || 0;
        if (lastPrice === 0) return null;

        const diff = newPrice - lastPrice;
        const percentChange = (diff / lastPrice) * 100;

        if (percentChange > 50) {
            return `Dikkat: Fiyat son alımdan %${percentChange.toFixed(0)} daha YÜKSEK! (Son: ${formatCurrency(lastPrice)})`;
        } else if (percentChange < -50) {
            return `Dikkat: Fiyat son alımdan %${Math.abs(percentChange).toFixed(0)} daha DÜŞÜK! (Son: ${formatCurrency(lastPrice)})`;
        }

        return null;
    };

    const handleSelect = async (product: Product) => {
        try {
            // Ensure product exists in Prisma before matching
            const result = await ensureProductInPrisma({
                id: product.id?.toString(),
                name: product.name,
                brand: product.brand || undefined,
                model: product.model || undefined,
                category: product.category || undefined,
                unit: product.unit || undefined,
                listPrice: product.listPrice,
                currency: product.currency,
                vatRate: product.vatRate,
                basePrice: product.basePrice,
                priceIncludesVat: product.priceIncludesVat
            });

            if (!result.success) {
                throw new Error(result.error || 'Ürün senkronize edilemedi');
            }

            setSelectedProduct(product);
            setOpen(false); // Close matching dialog
            setConfirmOpen(true); // Open confirmation

            // FETCH HISTORY
            setIsLoadingHistory(true);
            setPurchaseHistory([]);
            setAnomalyWarning(null);

            const details = await getProductDetails(product.id!.toString());
            if (details.success && details.data?.history) {
                setPurchaseHistory(details.data.history);

                // Check Anomaly
                const newPrice = invoiceItem.listPrice || invoiceItem.unitPrice || 0;
                // Calculate net price for comparison if discount exists
                const discountRate = invoiceItem.discountRate || 0;
                const newNetPrice = newPrice * (1 - discountRate / 100);

                const warning = checkPriceAnomaly(details.data.history, newNetPrice);
                setAnomalyWarning(warning);
            }
            setIsLoadingHistory(false);

        } catch (error: any) {
            toast({
                title: "Hata",
                description: error.message || 'Ürün seçimi başarısız',
                variant: "destructive"
            });
            setIsLoadingHistory(false);
        }
    };


    const handleConfirmUpdate = async (newPrice?: number) => {
        if (!selectedProduct?.id) return;

        try {
            const listPrice = newPrice || invoiceItem.listPrice || invoiceItem.unitPrice || 0;
            const discountRate = invoiceItem.discountRate || 0;
            const basePrice = listPrice * (1 - discountRate / 100);

            // 1. Update Product Card (Server side)
            await updateProduct(selectedProduct.id!, {
                listPrice: Number(listPrice),
                currency: 'TRY',
                discountRate: Number(discountRate) / 100, // PRISMA/PROPOSAL expectation: decimal (0.23)
                basePrice: Number(basePrice),
                vatRate: Number(invoiceItem.taxRate || 20) / 100, // Prisma expects decimal
                priceIncludesVat: false
            });

            // 2. Log History
            // Fetch parent invoice to get date and supplier info
            const invoiceRes = await getInvoices(); // Simplified: we target the one we need by ID if possible
            const invoice = invoiceRes.success ? invoiceRes.data?.find(inv => inv.id === invoiceItem.invoiceId) : null;

            if (invoice) {
                await addPurchaseHistory({
                    productId: selectedProduct.id!,
                    supplierId: invoice.customerId,
                    supplierName: invoice.senderName || 'Bilinmeyen Tedarikçi',
                    date: invoice.invoiceDate,
                    listPrice: listPrice,
                    discountRate: discountRate / 100, // Consistent with product record
                    netPrice: basePrice,
                    currency: 'TRY',
                    invoiceId: invoice.id
                });
            }

            // 3. Link the invoice item to the product
            await linkInvoiceItemToProduct(invoiceItem.id, selectedProduct.id.toString());

            // Call parent onMatch to refresh UI
            onMatch(selectedProduct.id.toString());

            toast({
                title: "Başarılı",
                description: "Ürün güncellendi ve fiyat geçmişine işlendi!",
                variant: "default"
            });
            setConfirmOpen(false);
        } catch (error) {
            console.error("Update failed", error);
            toast({
                title: "Hata",
                description: "Ürün güncellenirken bir hata oluştu.",
                variant: "destructive"
            });
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-7 text-xs px-2 gap-1",
                            invoiceItem.linkedProductId
                                ? "text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200"
                                : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        {invoiceItem.linkedProductId ? (
                            <>
                                <Check className="h-3 w-3" />
                                <span>Eşleşti</span>
                            </>
                        ) : (
                            <>
                                <LinkIcon className="h-3 w-3" />
                                <span>Eşle</span>
                            </>
                        )}
                    </Button>
                </DialogTrigger>
                <DialogContent className="p-0 gap-0 sm:max-w-[800px] w-full" aria-describedby={undefined}>
                    <div className="p-4 border-b">
                        <DialogTitle className="text-base">Ürün Eşleştirme</DialogTitle>
                    </div>

                    {/* Custom Search and List UI - Replacing cmdk for better reliability */}
                    <div className="flex flex-col">
                        <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
                                placeholder="Ürün ara (Ad, Marka, Model)..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="h-[60vh] p-1">
                            {isSearching ? (
                                <div className="py-6 text-center text-xs text-muted-foreground">Aranıyor...</div>
                            ) : (
                                <>
                                    {results.length === 0 && (
                                        <div className="py-6 text-center text-xs text-muted-foreground">
                                            "{searchTerm}" için sonuç bulunamadı
                                        </div>
                                    )}

                                    {results.length > 0 && (
                                        <div className="px-1 py-1">
                                            <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">Sonuçlar</div>
                                            {results.map(product => (
                                                <div
                                                    key={product.id}
                                                    className="flex items-center gap-2 pr-2 hover:bg-accent group"
                                                >
                                                    <div
                                                        onClick={() => handleSelect(product)}
                                                        className="flex-1 flex flex-col items-start gap-1 py-3 px-2 cursor-pointer transition-colors"
                                                    >
                                                        <div className="font-medium w-full flex justify-between items-start">
                                                            <span>{product.name}</span>
                                                            <span className="font-mono text-xs font-normal text-muted-foreground group-hover:text-accent-foreground shrink-0 ml-2">
                                                                {formatCurrency(product.listPrice)} {product.currency}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2 text-xs text-muted-foreground group-hover:text-accent-foreground/70 w-full overflow-hidden">
                                                            <span className="truncate max-w-[150px] bg-muted group-hover:bg-background px-1.5 rounded-sm">{product.brand}</span>
                                                            <span className="truncate opacity-75">{product.model}</span>
                                                            {product.code && <span className="truncate opacity-50 border-l pl-2">{product.code}</span>}
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPeek(`/products/${product.id}`, `${product.name} Kartı`);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4 text-primary" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="border-t mt-1 pt-1 bg-muted/10 p-1">
                                        <div className="text-xs font-semibold text-muted-foreground px-2 py-1.5 mb-1">İşlemler</div>
                                        <div
                                            onClick={() => {
                                                setOpen(false);
                                                setCreateProductOpen(true);
                                            }}
                                            className="flex items-center gap-2 py-3 px-2 cursor-pointer hover:bg-blue-50 text-blue-600 rounded-sm transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span className="font-semibold">Yeni Ürün Oluştur</span>
                                                <span className="text-[10px] text-muted-foreground opacity-80">
                                                    "{searchTerm}" sistemde yoksa ekleyin
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <CreateProductDialog
                open={createProductOpen}
                onOpenChange={setCreateProductOpen}
                invoiceItem={invoiceItem}
                onProductCreated={async (id) => {
                    await linkInvoiceItemToProduct(invoiceItem.id, id);
                    onMatch(id);
                    toast({
                        title: "Ürün Oluşturuldu",
                        description: "Yeni ürün başarıyla eklendi ve faturayla eşleştirildi.",
                    });
                }}
            />

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Ürün Eşleştirme Kontrolü</DialogTitle>
                        <DialogDescription>Ürün fiyat geçmişini kontrol ederek onayı tamamlayın.</DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 overflow-y-auto">
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm border-b pb-2">Seçilen Ürün & Yeni Fiyat</h4>
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                                <div className="border rounded p-3 bg-muted/20">
                                    <div className="text-xs text-muted-foreground">Sistem Fiyatı</div>
                                    <div className="font-semibold">{formatCurrency(selectedProduct?.listPrice || 0)} {selectedProduct?.currency}</div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <div className="border rounded p-3 bg-green-50 border-green-200">
                                    <div className="text-xs text-green-700">Fatura Fiyatı</div>
                                    <div className="font-semibold text-green-700">{formatCurrency(invoiceItem.listPrice || invoiceItem.unitPrice)} TRY</div>
                                </div>
                            </div>

                            {anomalyWarning && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm animate-pulse">
                                    <AlertTriangle className="h-5 w-5 shrink-0" />
                                    <span className="font-semibold">{anomalyWarning}</span>
                                </div>
                            )}

                            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-md text-xs">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                Eşleştirme sonrası ürünün liste fiyatı fatura fiyatıyla güncellenecektir.
                            </div>
                        </div>

                        <div className="space-y-2 border-l pl-4 md:h-[400px] flex flex-col">
                            <h4 className="font-semibold text-sm border-b pb-2 flex justify-between items-center">
                                <span>Satınalma Geçmişi</span>
                                {isLoadingHistory && <span className="text-xs text-muted-foreground font-normal">Yükleniyor...</span>}
                            </h4>
                            <ScrollArea className="flex-1 -mr-4 pr-4">
                                {purchaseHistory.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        {isLoadingHistory ? 'Geçmiş aranıyor...' : 'Henüz satın alma geçmişi bulunmuyor.'}
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="h-8">
                                                <TableHead className="text-xs">Tarih</TableHead>
                                                <TableHead className="text-xs">Tedarikçi</TableHead>
                                                <TableHead className="text-xs text-right">Net Fiyat</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {purchaseHistory.map((h, i) => (
                                                <TableRow key={i} className="h-8">
                                                    <TableCell className="text-xs py-1">
                                                        {new Date(h.date).toLocaleDateString('tr-TR')}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-1 truncate max-w-[120px]" title={h.supplierName || ''}>
                                                        {h.supplierName || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs py-1 text-right font-medium">
                                                        {formatCurrency(h.netPrice)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>İptal</Button>
                        <Button onClick={() => handleConfirmUpdate(invoiceItem.listPrice || invoiceItem.unitPrice)}>
                            {anomalyWarning ? 'Yine de Onayla' : 'Eşleştir ve Güncelle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
