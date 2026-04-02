import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer } from '@prisma/client';
import { Loader2, ArrowRight } from 'lucide-react';
import { CustomerInfoCard } from './customer-info-card';
import { useRouter } from 'next/navigation';
import { getCustomer } from '@/actions/customers';

interface CustomerDetailDialogProps {
    customerId: string | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerDetailDialog({ customerId, isOpen, onOpenChange }: CustomerDetailDialogProps) {
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && customerId) {
            setIsLoading(true);
            getCustomer(customerId)
                .then(res => {
                    if (res.success && res.data) {
                        setCustomer(res.data as any);
                    } else {
                        setCustomer(null);
                    }
                })
                .catch(() => setCustomer(null))
                .finally(() => setIsLoading(false));
        } else if (!isOpen) {
            setCustomer(null);
        }
    }, [isOpen, customerId]);

    const handleGoToPage = () => {
        if (customerId) {
            onOpenChange(false);
            router.push(`/customers/${customerId}`);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Cari Hesap Detayları</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex h-40 w-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-4">Yükleniyor...</span>
                    </div>
                ) : customer ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">{customer.name}</h2>
                            <Button variant="outline" size="sm" onClick={handleGoToPage}>
                                Detay Sayfasına Git <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>

                        <CustomerInfoCard customer={customer as any} />
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        Cari hesap bilgisi bulunamadı.
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
