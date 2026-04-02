/**
 * Customer Dialog Component
 * 
 * Müşteri düzenleme ve ekleme dialog'u
 */

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const customerSchema = z.object({
    name: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır'),
    taxId: z.string().optional(),
    taxOffice: z.string().optional(),
    email: z.string().email('Geçersiz e-posta adresi').optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface Customer {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    taxId?: string;
    taxOffice?: string;
    address?: string;
    notes?: string;
}

interface CustomerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer?: Customer | null;
    onSubmit: (data: CustomerFormValues) => Promise<void>;
    isLoading: boolean;
}

export function CustomerDialog({
    open,
    onOpenChange,
    customer,
    onSubmit,
    isLoading,
}: CustomerDialogProps) {
    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: '',
            taxId: '',
            taxOffice: '',
            email: '',
            phone: '',
            address: '',
            notes: '',
        },
    });

    React.useEffect(() => {
        if (customer) {
            form.reset({
                name: customer.name,
                taxId: customer.taxId || '',
                taxOffice: customer.taxOffice || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                notes: customer.notes || '',
            });
        } else {
            form.reset({
                name: '',
                taxId: '',
                taxOffice: '',
                email: '',
                phone: '',
                address: '',
                notes: '',
            });
        }
    }, [customer, form]);

    const handleSubmit = async (data: CustomerFormValues) => {
        await onSubmit(data);
        if (!customer) {
            form.reset();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {customer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                    </DialogTitle>
                    <DialogDescription>
                        {customer
                            ? 'Müşteri bilgilerini güncelleyin.'
                            : 'Yeni müşteri eklemek için aşağıdaki bilgileri doldurun.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Firma Adı *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: ABC İnşaat" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="taxId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vergi No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="1234567890" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="taxOffice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vergi Dairesi</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: Çankaya" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>E-posta</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="ornek@abc.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefon</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0555 123 45 67" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Adres</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Tam adres..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Notlar</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Ek notlar..."
                                            className="resize-none"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                İptal
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Kaydediliyor...' : customer ? 'Güncelle' : 'Ekle'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
