"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function RepairProductsButton() {
    const [loading, setLoading] = useState(false);

    const handleRepair = async () => {
        if (!confirm("Bu işlem tüm fiyat geçmişini faturalardaki mevcut eşleşmelere göre YENİDEN OLUŞTURACAKTIR. İşlemi onaylıyor musunuz?")) return;

        setLoading(true);
        try {
            const { regeneratePurchaseHistory } = await import('@/actions/invoices');
            const result = await regeneratePurchaseHistory();

            if (result.success) {
                toast({
                    title: "Veri Onarımı Başarılı",
                    description: `${result.count} adet fiyat geçmişi kaydı oluşturuldu.`,
                    variant: 'default'
                });
            } else {
                throw new Error(result.error as string);
            }
        } catch (e) {
            console.error(e);
            toast({
                title: "Hata",
                description: "Veri onarımı sırasında bir hata oluştu.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button variant="outline" size="sm" onClick={handleRepair} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Onarılıyor...' : 'Verileri Onar'}
        </Button>
    )
}
