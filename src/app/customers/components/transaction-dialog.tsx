'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createTransaction } from '@/actions/customer-transactions';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
    amount: z.coerce.number().min(0.01, 'Tutar 0\'dan büyük olmalıdır.'),
    type: z.enum(['Payment', 'Debt', 'Credit', 'Opening']),
    description: z.string().optional(),
    date: z.string() // We use string for date input and convert to Date object
});

interface TransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customerId: string;
    defaultType?: 'Payment' | 'Debt';
}

export function TransactionDialog({ open, onOpenChange, customerId, defaultType = 'Payment' }: TransactionDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            amount: 0,
            type: defaultType,
            description: '',
            date: new Date().toISOString().split('T')[0]
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const result = await createTransaction({
                customerId,
                amount: values.amount,
                type: values.type,
                description: values.description,
                referenceType: 'Manual',
                date: new Date(values.date)
            });

            if (result.success) {
                toast({
                    title: 'İşlem Başarılı',
                    description: 'Hesap hareketi başarıyla eklendi.',
                });
                onOpenChange(false);
                form.reset();
                router.refresh();
            } else {
                toast({
                    title: 'Hata',
                    description: result.error || 'İşlem eklenirken bir hata oluştu.',
                    variant: 'destructive',
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: 'Hata',
                description: 'Beklenmedik bir hata oluştu.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Hesap Hareketi Ekle</DialogTitle>
                    <DialogDescription>
                        Cari hesap bakiyesini etkileyecek yeni bir işlem ekleyin.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>İşlem Türü</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Tür seçin" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Payment">Tahsilat / Ödeme Alma</SelectItem>
                                            <SelectItem value="Debt">Borçlandırma / Satış</SelectItem>
                                            <SelectItem value="Credit">Alacaklandırma / İade</SelectItem>
                                            <SelectItem value="Opening">Açılış Bakiyesi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tutar</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.01" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tarih</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="İşlem detayları..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
