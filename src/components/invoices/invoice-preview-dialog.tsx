import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Save, X, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { GlobalProjectSelector } from "@/components/projects/global-project-selector";
import { lookupCustomer } from "@/actions/customers";
import { Loader2 } from "lucide-react";
import { BulkProductMatcher } from "@/components/products/bulk-product-matcher";
import { useToast } from "@/hooks/use-toast";

interface InvoiceItem {
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unit?: string;
    taxRate?: number;
    taxAmount?: number;
    discountAmount?: number;
    discountRate?: number;
}

interface InvoiceData {
    senderName?: string;
    senderTaxId?: string;
    senderAddress?: string;
    senderPhone?: string;
    senderEmail?: string;
    senderTaxOffice?: string;
    receiverName?: string;
    invoiceNumber?: string;
    ettsn?: string;
    invoiceDate?: Date | string;
    currency?: string;
    items: InvoiceItem[];
    totalAmount?: number;
    subTotal?: number;
    totalDiscountAmount?: number;
    totalTaxAmount?: number;
    taxInclusiveTotal?: number;
    projectId?: string;
}

interface InvoicePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: InvoiceData | null;
    onConfirm: (data: InvoiceData) => void;
    onCancel: () => void;
    isSaving: boolean;
}

export function InvoicePreviewDialog({
    open,
    onOpenChange,
    data,
    onConfirm,
    onCancel,
    isSaving
}: InvoicePreviewDialogProps) {
    const [formData, setFormData] = useState<InvoiceData | null>(null);
    const [customerId, setCustomerId] = useState<string | undefined>();
    const [project, setProject] = useState<string | undefined>();
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [bulkMatcherOpen, setBulkMatcherOpen] = useState(false);
    const { toast } = useToast();

    // NEW: Track if items have suspicious discount
    const [hasSuspiciousDiscount, setHasSuspiciousDiscount] = useState(false);

    useEffect(() => {
        if (data) {
            setFormData(JSON.parse(JSON.stringify(data))); // Deep copy

            // Check for suspicious discounts (UBL-TR standard)
            const items = data.items || [];
            const generalDiscountRate = data.totalDiscountAmount && data.subTotal
                ? (data.totalDiscountAmount / data.subTotal) * 100
                : 0;

            const hasDiscount = items.some(item => item.discountRate && item.discountRate > 0);
            const allMatchGeneral = hasDiscount && items.every(item =>
                !item.discountRate || Math.abs((item.discountRate || 0) - generalDiscountRate) < 0.5
            );

            // If all items have same discount as general, it's likely AI mistake
            setHasSuspiciousDiscount(hasDiscount && allMatchGeneral && generalDiscountRate > 0);
        }
    }, [data]);

    // Auto-resolve customer on mount or when TaxID changes
    useEffect(() => {
        const resolveCustomer = async () => {
            if (!formData?.senderTaxId && !formData?.senderName) return;

            // Prefer TaxID for lookup
            const query = formData.senderTaxId || formData.senderName;
            if (!query || query.length < 3) return;

            setIsLookingUp(true);
            try {
                const result = await lookupCustomer(query);
                if (result.success && result.data) {
                    setCustomerId(result.data.id);
                    // Reset project when customer changes, unless it matches existing logic?
                    // Better to reset to avoid stale project selection
                    setProject(undefined);
                } else {
                    setCustomerId(undefined);
                }
            } catch (error) {
                console.error("Customer lookup failed", error);
            } finally {
                setIsLookingUp(false);
            }
        };

        const timeout = setTimeout(resolveCustomer, 1000); // Debounce
        return () => clearTimeout(timeout);
    }, [formData?.senderTaxId, formData?.senderName]);

    // Update formData with selected project when it changes
    useEffect(() => {
        if (formData && project) {
            // We don't necessarily need to put projectId into formData ITEMS, but into the final object passed to save.
            // But formData is what we pass to onConfirm usually? 
            // Let's check onConfirm usage.
            // onConfirm(formData).
            setFormData(prev => prev ? ({ ...prev, projectId: project }) : null);
        }
    }, [project]);

    if (!formData) return null;

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        if (!formData) return;
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Recalculate totals for the item
        if (field === 'quantity' || field === 'unitPrice' || field === 'discountRate' || field === 'discountAmount') {
            const qty = Number(newItems[index].quantity) || 0;
            const price = Number(newItems[index].unitPrice) || 0;
            let discRate = Number(newItems[index].discountRate) || 0;
            let discAmount = Number(newItems[index].discountAmount) || 0;

            if (field === 'discountRate') {
                discAmount = (qty * price) * (discRate / 100);
                newItems[index].discountAmount = discAmount;
            } else if (field === 'discountAmount') {
                if (qty * price > 0) {
                    discRate = (discAmount / (qty * price)) * 100;
                    newItems[index].discountRate = discRate;
                }
            } else {
                // If price or qty changed, update discount amount based on rate
                discAmount = (qty * price) * (discRate / 100);
                newItems[index].discountAmount = discAmount;
            }

            newItems[index].totalPrice = (qty * price) - discAmount;
        }

        updateTotals({ ...formData, items: newItems });
    };

    const handleDeleteItem = (index: number) => {
        if (!formData) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        updateTotals({ ...formData, items: newItems });
    };

    const handleAddItem = () => {
        if (!formData) return;
        const newItems = [...formData.items, {
            name: "",
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            unit: "Adet",
            taxRate: 20,
            taxAmount: 0,
            discountRate: 0,
            discountAmount: 0
        }];
        updateTotals({ ...formData, items: newItems });
    };

    const updateTotals = (newData: InvoiceData) => {
        const subTotal = newData.items.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
        // Recalculate tax roughly if not provided
        const taxAmount = newData.items.reduce((sum, item) => {
            const price = Number(item.totalPrice) || 0;
            const rate = Number(item.taxRate) || 0;
            return sum + (price * rate / 100);
        }, 0);

        const totalAmount = subTotal + taxAmount;

        setFormData({
            ...newData,
            subTotal,
            totalTaxAmount: taxAmount,
            totalAmount
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] max-h-[98vh] flex flex-col p-4">
                <DialogHeader className="px-1">
                    <DialogTitle>Fatura Önizleme ve Onay</DialogTitle>
                    <DialogDescription>
                        Fatura sisteme kaydedilmeden önce bilgileri kontrol edip düzenleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                {/* UBL-TR İSKONTO UYARISI */}
                {hasSuspiciousDiscount && formData?.totalDiscountAmount && formData.totalDiscountAmount > 0 && (
                    <div className="mx-4 bg-amber-50 border border-amber-300 rounded-lg p-3 shrink-0">
                        <div className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold text-lg">⚠️</span>
                            <div className="text-sm text-amber-900">
                                <p className="font-semibold mb-1">İskonto Uyarısı - UBL-TR Standardı</p>
                                <p>
                                    Yapay zeka, faturadaki <strong>genel iskonto</strong> ({formatCurrency(formData.totalDiscountAmount)})
                                    tüm ürünlere yansıtmış görünüyor.
                                </p>
                                <div className="mt-2 text-xs">
                                    <strong>UBL-TR faturalarında:</strong>
                                    <ul className="list-disc list-inside ml-2 mt-1 space-y-1">
                                        <li>İskonto sütunu %99 <strong>BOŞTUR</strong></li>
                                        <li>Genel iskonto SADECE alt toplamda görünür, ürünlere uygulanmaz</li>
                                        <li>Sistem otomatik olarak tüm ürünlerin iskonto oranını <strong>0</strong> olarak düzeltecek</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col gap-4 py-2">
                    {/* Header Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border shrink-0">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Firma Adı</Label>
                            <Input
                                className="h-8"
                                value={formData.senderName || ''}
                                onChange={e => setFormData({ ...formData, senderName: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Fatura No</Label>
                            <Input
                                className="h-8"
                                value={formData.invoiceNumber || ''}
                                onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Tarih</Label>
                            <Input
                                className="h-8"
                                type="date"
                                value={formData.invoiceDate ? new Date(formData.invoiceDate).toISOString().split('T')[0] : ''}
                                onChange={e => setFormData({ ...formData, invoiceDate: new Date(e.target.value) })}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs">VKN / TC</Label>
                            <Input
                                className="h-8"
                                value={formData.senderTaxId || ''}
                                onChange={e => setFormData({ ...formData, senderTaxId: e.target.value })}
                            />
                        </div>

                        {/* Contact Info Row */}
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <Label className="text-xs">Vergi Dairesi</Label>
                            <Input
                                className="h-8"
                                value={formData.senderTaxOffice || ''}
                                onChange={e => setFormData({ ...formData, senderTaxOffice: e.target.value })}
                                placeholder="Vergi Dairesi"
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                            <Label className="text-xs">Telefon</Label>
                            <Input
                                className="h-8"
                                value={formData.senderPhone || ''}
                                onChange={e => setFormData({ ...formData, senderPhone: e.target.value })}
                                placeholder="0212..."
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label className="text-xs">E-posta</Label>
                            <Input
                                className="h-8"
                                value={formData.senderEmail || ''}
                                onChange={e => setFormData({ ...formData, senderEmail: e.target.value })}
                                placeholder="info@..."
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2 md:col-span-4">
                            <Label className="text-xs">Adres</Label>
                            <Input
                                className="h-8"
                                value={formData.senderAddress || ''}
                                onChange={e => setFormData({ ...formData, senderAddress: e.target.value })}
                                placeholder="Firma Adresi"
                            />
                        </div>
                    </div>

                    {/* Project Selection Section */}
                    <div className="flex flex-col gap-2 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900 mt-2 shrink-0">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                Proje / Şantiye Bağlantısı (Opsiyonel)
                            </Label>
                            {customerId && (
                                <span className="text-[10px] text-blue-600/70 bg-blue-100/50 px-2 py-0.5 rounded-full">
                                    Cari Hesap Eşleşti ✅
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="text-xs text-muted-foreground">
                                {customerId
                                    ? "Bu faturayı seçili cariye ait bir projeye bağlayabilirsiniz."
                                    : isLookingUp
                                        ? "Cari hesap aranıyor..."
                                        : "Proje seçmek için önce geçerli bir VKN/TCKN giriniz."}
                            </div>
                            <div className="w-full">
                                <GlobalProjectSelector
                                    value={project}
                                    onSelect={(projectId) => setProject(projectId)}
                                    placeholder="Proje Ara / Seç..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Table - Flex 1 handles the height filling */}
                    <div className="flex-1 border rounded-lg overflow-hidden flex flex-col min-h-0 bg-background">
                        <div className="bg-muted/50 p-2 border-b font-medium text-sm flex justify-between items-center shrink-0">
                            <span>Fatura Kalemleri</span>
                            <Button variant="outline" size="sm" onClick={handleAddItem} className="h-7 text-xs">
                                <Plus className="w-3 h-3 mr-1" /> Ekle
                            </Button>
                        </div>
                        <ScrollArea className="flex-1 h-full w-full">
                            <Table>
                                <TableHeader>
                                    <TableRow className="h-8 hover:bg-transparent">
                                        <TableHead className="w-[40%] h-8 py-0">Hizmet / Ürün</TableHead>
                                        <TableHead className="w-[8%] h-8 py-0 text-right">Miktar</TableHead>
                                        <TableHead className="w-[8%] h-8 py-0">Birim</TableHead>
                                        <TableHead className="w-[10%] h-8 py-0 text-right">Birim Fiyat</TableHead>
                                        <TableHead className="w-[7%] h-8 py-0 text-right">İskonto %</TableHead>
                                        <TableHead className="w-[9%] h-8 py-0 text-right">İskonto T.</TableHead>
                                        <TableHead className="w-[7%] h-8 py-0 text-right">KDV %</TableHead>
                                        <TableHead className="w-[9%] h-8 py-0 text-right">KDV T.</TableHead>
                                        <TableHead className="w-[10%] h-8 py-0 text-right">Toplam</TableHead>
                                        <TableHead className="w-[5%] h-8 py-0"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {formData.items.map((item, idx) => (
                                        <TableRow key={idx} className="h-9 hover:bg-muted/50 even:bg-muted/20 border-b-0">
                                            <TableCell className="p-1">
                                                <Input
                                                    value={item.name}
                                                    onChange={e => handleItemChange(idx, 'name', e.target.value)}
                                                    className="h-7 text-xs px-2 border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    value={item.unit || ''}
                                                    onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                                                    className="h-7 text-xs px-2 border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    step="0.0001"
                                                    onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.discountRate || 0}
                                                    onChange={e => handleItemChange(idx, 'discountRate', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.discountAmount || 0}
                                                    onChange={e => handleItemChange(idx, 'discountAmount', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.taxRate || 0}
                                                    onChange={e => handleItemChange(idx, 'taxRate', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1">
                                                <Input
                                                    type="number"
                                                    value={item.taxAmount || 0}
                                                    onChange={e => handleItemChange(idx, 'taxAmount', parseFloat(e.target.value))}
                                                    className="h-7 text-xs px-2 text-right border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:border-ring transition-colors"
                                                />
                                            </TableCell>
                                            <TableCell className="p-1 text-right font-medium text-xs px-2">
                                                {formatCurrency(item.totalPrice)}
                                            </TableCell>
                                            <TableCell className="p-1 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => handleDeleteItem(idx)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    {/* Footer Totals */}
                    <div className="flex justify-end gap-8 p-4 bg-muted/20 border rounded-lg">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground font-medium">Satır Toplamı (B.)</div>
                            <div className="font-semibold text-sm">{formatCurrency(formData.items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0))}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground font-medium">Toplam İskonto</div>
                            <div className="font-semibold text-sm text-red-600">-{formatCurrency(formData.items.reduce((sum, i) => sum + (i.discountAmount || 0), 0))}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Matrah</div>
                            <div className="font-semibold text-sm">{formatCurrency(formData.subTotal || 0)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">KDV Toplam</div>
                            <div className="font-semibold text-sm">{formatCurrency(formData.totalTaxAmount || 0)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground">Genel Toplam</div>
                            <div className="text-lg font-bold text-primary">{formatCurrency(formData.totalAmount || 0)}</div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setBulkMatcherOpen(true);
                        }}
                        disabled={isSaving || !formData?.items || formData.items.length === 0}
                        className="gap-2"
                    >
                        <Sparkles className="w-4 h-4" />
                        Toplu Eşleştir ({formData?.items?.length || 0})
                    </Button>
                    <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                        <X className="w-4 h-4 mr-2" />
                        İptal
                    </Button>
                    <Button onClick={() => onConfirm(formData)} disabled={isSaving}>
                        {isSaving ? (
                            <>Kaydediliyor...</>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Onayla ve Kaydet
                            </>
                        )}
                    </Button>
                </DialogFooter>

                {/* Bulk Product Matcher */}
                <BulkProductMatcher
                    open={bulkMatcherOpen}
                    onOpenChange={setBulkMatcherOpen}
                    invoiceItems={formData?.items as any || []}
                    onMatchComplete={(count: number) => {
                        toast({
                            title: "🎉 Toplu Eşleştirme",
                            description: `${count} ürün otomatik eşleştirildi!`,
                            duration: 3000,
                        });
                    }}
                />
            </DialogContent>
        </Dialog >
    );
}
