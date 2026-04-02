'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, ArchiveRestore } from 'lucide-react';

interface RestoreInvoiceButtonProps {
    invoiceId: string;
    invoiceNumber: string;
    onSuccess: () => void;
}

export function RestoreInvoiceButton({
    invoiceId,
    invoiceNumber,
    onSuccess
}: RestoreInvoiceButtonProps) {
    const [isRestoring, setIsRestoring] = useState(false);

    const handleRestore = async () => {
        if (!confirm(`Fatura #${invoiceNumber} geri yüklenecek. Onaylıyor musunuz?`)) {
            return;
        }

        setIsRestoring(true);
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/restore`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                toast({
                    title: '✅ Başarılı',
                    description: result.message
                });
                onSuccess();
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
            setIsRestoring(false);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring}
            className="text-green-600 border-green-200 hover:bg-green-50"
        >
            {isRestoring ? (
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Geri Yükleniyor...
                </>
            ) : (
                <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Geri Yükle
                </>
            )}
        </Button>
    );
}
