/**
 * New Quote Dialog Component
 * 
 * Yeni teklif oluşturma dialog'u
 */

'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';

const newQuoteSchema = z.object({
    customerId: z.string().min(1, 'Müşteri seçimi zorunludur.'),
    projectName: z.string().min(2, 'Proje adı en az 2 karakter olmalıdır.'),
    templateId: z.string().optional(),
});

type NewQuoteFormValues = z.infer<typeof newQuoteSchema>;

interface NewQuoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customers: any[];
    templates: any[];
    onSubmit: (data: NewQuoteFormValues) => Promise<void>;
}

export function NewQuoteDialog({
    open,
    onOpenChange,
    customers,
    templates,
    onSubmit,
}: NewQuoteDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<NewQuoteFormValues>({
        resolver: zodResolver(newQuoteSchema),
        defaultValues: {
            customerId: '',
            projectName: '',
            templateId: 'none',
        },
    });

    const handleSubmit = async (data: NewQuoteFormValues) => {
        setIsSubmitting(true);
        try {
            await onSubmit(data);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error('Error creating quote:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Yeni Teklif Oluştur</DialogTitle>
                    <DialogDescription>
                        Yeni bir teklif oluşturmak için aşağıdaki bilgileri doldurun.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/* Müşteri Seçimi */}
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Müşteri</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Müşteri seçin..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map((customer) => (
                                                <SelectItem key={customer.id} value={customer.id}>
                                                    {customer.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Proje Adı */}
                        <FormField
                            control={form.control}
                            name="projectName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Proje Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Ofis Havalandırma Sistemi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Şablon Seçimi */}
                        <FormField
                            control={form.control}
                            name="templateId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Şablon (Opsiyonel)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Şablon seçin..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Şablonsuz Başla</SelectItem>
                                            {templates.map((template) => (
                                                <SelectItem key={template.id} value={template.id}>
                                                    {template.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Oluşturuluyor...' : 'Teklif Oluştur'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
