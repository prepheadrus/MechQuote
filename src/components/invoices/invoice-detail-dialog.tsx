import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, User, MapPin, Calendar, Receipt, Trash2, CheckSquare, Square } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";
import { ProductMatcher } from "@/components/products/product-matcher";
import { BulkProductMatcher } from "@/components/products/bulk-product-matcher";
import { linkInvoiceItemToProduct, deleteInvoiceItem } from "@/actions/invoices";
import { AddReturnItemDialog } from "@/components/invoices/add-return-item-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, CheckCircle2, XCircle, Send, FileEdit, Sparkles } from "lucide-react";
import { updateInvoiceStatus, updateInvoice } from "@/actions/invoices";
import { ProjectSelect } from "@/components/projects/project-select";
import { Loader2, PlusCircle, Pencil, TrendingUp, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentList } from "@/components/invoices/payment-list";
import { cn } from "@/lib/utils";
import { useWorkspace } from '@/components/workspace/workspace-context';

interface InvoiceDetailDialogProps {
    invoice: any; // Replace with Invoice type
    onInvoiceUpdate?: () => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function InvoiceDetailDialog({ invoice, onInvoiceUpdate, open, onOpenChange, trigger }: InvoiceDetailDialogProps) {
    const [localItems, setLocalItems] = React.useState(invoice.items || []);
    const [selectedItems, setSelectedItems] = React.useState<string[]>([]);
    const [isBulkUpdating, setIsBulkUpdating] = React.useState(false);
    const [isBulkProductMatcherOpen, setIsBulkProductMatcherOpen] = React.useState(false);
    const { toast } = useToast();
    const { openPeek } = useWorkspace();

    React.useEffect(() => {
        setLocalItems(invoice.items || []);
        setSelectedItems([]);
    }, [invoice.items]);

    const handleSelectAll = (checked: boolean) => {
        setSelectedItems(checked ? localItems.map((i: any) => i.id).filter(Boolean) : []);
    };

    const handleSelectItem = (id: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };

    const handleBulkProjectAssign = async (projectId: string) => {
        if (selectedItems.length === 0) return;
        setIsBulkUpdating(true);
        try {
            const { bulkLinkInvoiceItemsToProject } = await import('@/actions/invoices');
            const result = await bulkLinkInvoiceItemsToProject(selectedItems, projectId);

            if (result.success) {
                toast({ title: "Başarılı", description: `${selectedItems.length} kalem projeye bağlandı.` });
                setLocalItems((prev: any[]) => prev.map(item => selectedItems.includes(item.id) ? { ...item, projectId } : item));
                setSelectedItems([]);
                onInvoiceUpdate?.();
            } else {
                toast({ variant: "destructive", title: "Hata", description: result.error });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Hata", description: "Toplu işlem başarısız." });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const handleItemProjectLink = async (itemId: string, projectId: string | undefined, itemIndex: number) => {
        setLocalItems((prev: any) => {
            const newItems = [...prev];
            newItems[itemIndex] = { ...newItems[itemIndex], projectId };
            return newItems;
        });

        try {
            const { linkInvoiceItemToProject } = await import('@/actions/invoices');
            const result = await linkInvoiceItemToProject(itemId, projectId);
            if (result.success) {
                onInvoiceUpdate?.();
            } else {
                toast({ variant: "destructive", title: "Hata", description: "Proje güncellenemedi." });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: "Proje güncellenemedi." });
        }
    };

    const handleInvoiceProjectLink = async (projectId: string | null) => {
        try {
            const res = await updateInvoice(invoice.id, { projectId: projectId });
            if (res.success) {
                toast({ title: "Proje Güncellendi", description: "Fatura projeye bağlandı." });
                onInvoiceUpdate?.();
            } else {
                toast({ variant: "destructive", title: "Hata", description: res.error });
            }
        } catch (err) {
            console.error(err);
            toast({ variant: "destructive", title: "Hata", description: "Güncelleme başarısız." });
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            const result = await updateInvoiceStatus(invoice.id, newStatus);
            if (result.success) {
                toast({ title: 'Durum Güncellendi', description: `Fatura durumu ${newStatus} olarak değiştirildi.` });
                onInvoiceUpdate?.();
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Durum güncellenemedi.' });
        }
    };

    const handleDueDateUpdate = async (date: Date | undefined) => {
        if (!date) return;
        try {
            const result = await updateInvoice(invoice.id, { dueDate: date });
            if (result.success) {
                toast({ title: 'Vade Güncellendi', description: `Fatura vadesi ${format(date, 'dd.MM.yyyy')} olarak ayarlandı.` });
                onInvoiceUpdate?.();
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Vade güncellenemedi.' });
        }
    };

    const isIncoming = invoice.type === 'Incoming';
    const contactName = isIncoming ? invoice.senderName : invoice.receiverName;
    const contactLabel = isIncoming ? 'Tedarikçi' : (invoice.type === 'PurchaseReturn' ? 'İade Edilen Firması' : 'Müşteri');


    const defaultTrigger = (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
            <Eye className="h-4 w-4" />
        </Button>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="max-w-[98vw] h-[95vh] flex flex-col p-0 gap-0">
                <div className="p-6 pb-4 bg-muted/20 border-b">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                <Receipt className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    {contactName}
                                    {invoice.customer && (
                                        <Badge variant="outline" className="font-normal text-xs flex gap-2">
                                            <Link href={`/customers/${invoice.customer.id}`} className="hover:underline flex items-center gap-1">
                                                <User className="h-3 w-3" /> {contactLabel} Kartı
                                            </Link>
                                            <button 
                                                onClick={() => openPeek(`/customers/${invoice.customer.id}`, `${contactName} Kartı`)}
                                                className="hover:text-primary transition-colors border-l pl-2 border-slate-200"
                                            >
                                                <Eye className="h-3 w-3" /> Yan Panel
                                            </button>
                                        </Badge>
                                    )}
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2 mt-1">
                                    <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{invoice.invoiceNumber}</span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1 text-xs"><Calendar className="h-3 w-3" /> {formatDate(invoice.invoiceDate)}</span>
                                    <span>•</span>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="h-auto p-0 flex items-center gap-1 text-xs font-normal hover:bg-transparent">
                                                <CalendarDays className={cn("h-3 w-3", invoice.dueDate ? "text-orange-600" : "text-muted-foreground")} />
                                                <span className={cn(invoice.dueDate && "text-orange-600 font-bold")}>
                                                    {invoice.dueDate ? `Vade: ${format(new Date(invoice.dueDate), 'dd MMM yyyy', { locale: tr })}` : 'Vade Belirle'}
                                                </span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarPicker
                                                mode="single"
                                                selected={invoice.dueDate ? new Date(invoice.dueDate) : undefined}
                                                onSelect={handleDueDateUpdate}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-2xl font-bold text-primary tracking-tight">
                                {formatCurrency(invoice.totalAmount)} <span className="text-sm font-normal text-muted-foreground">{invoice.currency}</span>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-7 gap-1 border-dashed">
                                            <Badge variant="outline" className={cn(
                                                "font-normal text-[10px]",
                                                invoice.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' :
                                                    invoice.status === 'Processed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        invoice.status === 'Cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                                                            'bg-slate-100 text-slate-700 border-slate-200'
                                            )}>
                                                {invoice.status === 'Draft' ? 'Taslak' :
                                                    invoice.status === 'Sent' ? 'Gönderildi' :
                                                        invoice.status === 'Paid' ? 'Ödendi' :
                                                            invoice.status === 'Processed' ? 'İşlendi' :
                                                                invoice.status === 'Cancelled' ? 'İptal' :
                                                                    invoice.status}
                                            </Badge>
                                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Draft')}><FileEdit className="mr-2 h-4 w-4" /> Taslak</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Sent')}><Send className="mr-2 h-4 w-4" /> Gönderildi</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Paid')}><CheckCircle2 className="mr-2 h-4 w-4 text-green-600" /> Ödendi</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Processed')}><CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" /> İşlendi</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleStatusUpdate('Cancelled')}><XCircle className="mr-2 h-4 w-4 text-red-600" /> İptal</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <Badge variant="outline">{invoice.type === 'PurchaseReturn' ? 'İade Faturası' : (isIncoming ? 'Gelen' : 'Giden')}</Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-background flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="details">Fatura Kalemleri</TabsTrigger>
                            <TabsTrigger value="payments">Ödemeler</TabsTrigger>
                        </TabsList>
                        {isIncoming && localItems.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsBulkProductMatcherOpen(true)}
                                className="gap-2"
                            >
                                <Sparkles className="h-4 w-4" />
                                Toplu Ürün Eşleştirme
                            </Button>
                        )}
                    </div>
                    <TabsContent value="details" className="flex-1 flex flex-col overflow-hidden p-0 m-0 data-[state=active]:flex">
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/20 relative">
                            {selectedItems.length > 0 && (
                                <div className="sticky top-0 z-20 bg-blue-50/95 border-b px-4 py-2 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-1">
                                    <span className="text-sm font-medium text-blue-800">{selectedItems.length} kalem seçildi</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground mr-1">Seçilileri Projeye Bağla:</span>
                                        <div className="w-[200px]"><ProjectSelect customerId={isIncoming ? undefined : invoice.customerId} value="" onChange={handleBulkProjectAssign} placeholder="Proje Seçip Ata..." disabled={isBulkUpdating} /></div>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelectedItems([])} title="Seçimi Temizle"><XCircle className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            )}
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40px]"><Checkbox checked={localItems.length > 0 && selectedItems.length === localItems.length} onCheckedChange={handleSelectAll} /></TableHead>
                                        <TableHead>Mal Hizmet</TableHead>
                                        <TableHead>Miktar</TableHead>
                                        <TableHead>Birim Fiyat</TableHead>
                                        <TableHead>İskonto %</TableHead>
                                        <TableHead>İskonto T.</TableHead>
                                        <TableHead>Toplam</TableHead>
                                        <TableHead className="w-[200px]">Proje</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localItems.map((item: any, idx: number) => (
                                        <TableRow key={item.id || idx}>
                                            <TableCell><Checkbox checked={selectedItems.includes(item.id)} onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)} /></TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity} {item.unit}</TableCell>
                                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell className="text-red-600/80">{item.discountRate ? `%${item.discountRate}` : '-'}</TableCell>
                                            <TableCell className="text-red-600/80">{item.discountAmount ? `-${formatCurrency(item.discountAmount)}` : '-'}</TableCell>
                                            <TableCell className="font-semibold">{formatCurrency(item.totalPrice)}</TableCell>
                                            <TableCell>
                                                <ProjectSelect customerId={isIncoming ? undefined : invoice.customerId} value={item.projectId} onChange={(val) => handleItemProjectLink(item.id, val, idx)} fallbackName={item.project?.name} />
                                            </TableCell>
                                            <TableCell>
                                                {isIncoming && (
                                                    <ProductMatcher
                                                        key={`matcher-${item.id}-${item.linkedProductId}`}
                                                        invoiceItem={item}
                                                        onMatch={() => {
                                                            // Refresh local items after match
                                                            setTimeout(() => onInvoiceUpdate?.(), 300);
                                                        }}
                                                    />
                                                )}
                                                {invoice.type === 'PurchaseReturn' && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm('Bu kalemi sil?')) { await deleteInvoiceItem(item.id); onInvoiceUpdate?.(); } }}><Trash2 className="h-4 w-4" /></Button>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Summary Footer */}
                        <div className="border-t bg-muted/5 p-6 shrink-0">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                <div className="max-w-md">
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                                        <TrendingUp className="h-4 w-4" /> Proje Bağlantısı
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 w-[250px]">
                                            <ProjectSelect
                                                customerId={isIncoming ? undefined : invoice.customerId}
                                                value={invoice.projectId || ""}
                                                onChange={handleInvoiceProjectLink}
                                                fallbackName={invoice.project?.name}
                                                placeholder="Faturanın Tamamını Projeye Bağla"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                                        * Tüm faturayı bir projeye bağlamak, projelerin maliyet analizinde faturanın tamamının (KDV Hariç) gider olarak görünmesini sağlar.
                                    </p>
                                </div>

                                <div className="w-full md:w-80 space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Mal/Hizmet Toplamı (Brüt)</span>
                                        <span className="font-medium text-slate-500">
                                            {formatCurrency((invoice.subTotal || 0) + (invoice.totalDiscountAmount || 0))} {invoice.currency}
                                        </span>
                                    </div>

                                    {invoice.totalDiscountAmount > 0 && (
                                        <div className="flex justify-between items-center text-sm text-red-600/80">
                                            <span className="flex items-center gap-1.5"><Square className="h-3 w-3" /> Toplam İskonto</span>
                                            <span className="font-medium">-{formatCurrency(invoice.totalDiscountAmount)} {invoice.currency}</span>
                                        </div>
                                    )}

                                    <Separator className="my-2" />

                                    <div className="flex justify-between items-center text-sm font-semibold">
                                        <span className="text-foreground">MATRAH (Net Toplam)</span>
                                        <span className="text-foreground">{formatCurrency(invoice.subTotal)} {invoice.currency}</span>
                                    </div>

                                    <div className="flex justify-between items-center text-sm text-red-600 font-medium">
                                        <span className="flex items-center gap-1.5"><Receipt className="h-3 w-3" /> KDV Toplamı</span>
                                        <span>{formatCurrency(invoice.totalTaxAmount)} {invoice.currency}</span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t-2 border-primary/20 mt-2">
                                        <span className="text-base font-bold text-primary">GENEL TOPLAM</span>
                                        <span className="text-xl font-black text-primary tracking-tight">
                                            {formatCurrency(invoice.totalAmount)} {invoice.currency}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="payments" className="flex-1 overflow-auto p-6 m-0">
                        <PaymentList invoiceId={invoice.id} payments={invoice.payments || []} totalAmount={invoice.totalAmount} currency={invoice.currency} projectId={invoice.projectId} />
                    </TabsContent>
                </Tabs>

                {/* Bulk Product Matcher Dialog */}
                <BulkProductMatcher
                    open={isBulkProductMatcherOpen}
                    onOpenChange={setIsBulkProductMatcherOpen}
                    invoiceItems={localItems}
                    onMatchComplete={(count, matchedItemIds) => {
                        if (count > 0) {
                            toast({
                                title: "Başarılı",
                                description: `${count} ürün eşleştirildi.`,
                            });

                            // Close the matcher dialog
                            setIsBulkProductMatcherOpen(false);

                            // Force a full refresh - this will reload invoice.items with linkedProductId
                            setTimeout(() => {
                                onInvoiceUpdate?.();
                            }, 300);
                        }
                    }}
                />
            </DialogContent>
        </Dialog>
    );
}
