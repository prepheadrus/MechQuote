'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CancelInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoiceId: string;
    invoiceNumber: string;
    onSuccess: () => void;
}

export function CancelInvoiceDialog({
    open,
    onOpenChange,
    invoiceId,
    invoiceNumber,
    onSuccess
}: CancelInvoiceDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reason, setReason] = useState('');
    const [cancelType, setCancelType] = useState<'soft' | 'hard'>('soft');
    const [modules, setModules] = useState({
        projects: true,
        customerBalance: true,
        stock: true,
        preserveProducts: true // ✅ Varsayılan: KORU
    });

    const handleCancel = async () => {
        if (!reason.trim()) {
            toast({
                title: 'Eksik Bilgi',
                description: 'Lütfen iptal sebebini girin.',
                variant: 'destructive'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reason,
                    cancelType,
                    modules
                })
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: '✅ Başarılı',
                    description: result.message
                });
                onSuccess();
                onOpenChange(false);
                // Reset form
                setReason('');
                setCancelType('soft');
                setModules({
                    projects: true,
                    customerBalance: true,
                    stock: true,
                    preserveProducts: true
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: '❌ Hata',
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Fatura İptal Et
                    </DialogTitle>
                    <DialogDescription>
                        Fatura #{invoiceNumber} iptal edilecek. Bu işlem ilişkili kayıtları etkiler.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* İptal Sebebi */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">İptal Sebebi *</Label>
                        <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Neden iptal ediyorsunuz? (Örn: Yanlışlıkla yüklendi, hatalı fatura, vb.)"
                            rows={3}
                        />
                    </div>

                    {/* İptal Tipi */}
                    <div className="space-y-2">
                        <Label>İptal Tipi</Label>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="soft"
                                    checked={cancelType === 'soft'}
                                    onCheckedChange={() => setCancelType('soft')}
                                />
                                <Label htmlFor="soft" className="font-normal">
                                    Yumuşak İptal (Veriyi Koru)
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="hard"
                                    checked={cancelType === 'hard'}
                                    onCheckedChange={() => setCancelType('hard')}
                                />
                                <Label htmlFor="hard" className="font-normal">
                                    Sert İptal (Tüm İlişkileri Kes)
                                </Label>
                            </div>
                        </div>
                    </div>

                    {/* Modül Seçimi */}
                    <div className="space-y-2">
                        <Label>Hangi Modüller Etkilensin?</Label>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="projects"
                                    checked={modules.projects}
                                    onCheckedChange={(c) => setModules({ ...modules, projects: c as boolean })}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="projects" className="font-normal">
                                        Projelerden Çıkar
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Faturanın proje bağlantıları kaldırılır
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="customerBalance"
                                    checked={modules.customerBalance}
                                    onCheckedChange={(c) => setModules({ ...modules, customerBalance: c as boolean })}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="customerBalance" className="font-normal">
                                        Cari Bakiyeyi Düzelt
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ters kayıt oluşturularak cari bakiye güncellenir
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="stock"
                                    checked={modules.stock}
                                    onCheckedChange={(c) => setModules({ ...modules, stock: c as boolean })}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="stock" className="font-normal">
                                        Stok Hareketlerini İptal Et
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ters stok hareketi oluşturulur
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="preserveProducts"
                                    checked={modules.preserveProducts}
                                    onCheckedChange={(c) => setModules({ ...modules, preserveProducts: c as boolean })}
                                />
                                <div className="space-y-1">
                                    <Label htmlFor="preserveProducts" className="font-normal">
                                        ✅ Satın Alma Verisini Koru
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Liste fiyatı, iskonto, net fiyat gibi bilgiler KORUNUR (ÖNERİLEN)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Uyarı */}
                    <Alert variant={modules.preserveProducts ? "default" : "destructive"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            {modules.preserveProducts
                                ? '✅ Satın alma verisi korunacak - Gelecekte fiyat karşılaştırması yapabilirsiniz.'
                                : '⚠️ Tüm satın alma verisi silinecek - Liste fiyatları, iskontolar kaybolacak!'
                            }
                        </AlertDescription>
                    </Alert>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        İptal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={isSubmitting || !reason.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                İptal Ediliyor...
                            </>
                        ) : (
                            'Faturayı İptal Et'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
