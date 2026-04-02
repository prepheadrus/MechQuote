'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createTemplate, type TemplateItem } from '@/actions/templates';

interface SaveAsTemplateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  quoteItems: any[]; // ProposalItem[] from the form
  onSuccess?: () => void;
}

const saveAsTemplateSchema = z.object({
  name: z.string().min(3, 'Şablon adı en az 3 karakter olmalıdır.'),
  description: z.string().optional(),
});

type SaveAsTemplateFormValues = z.infer<typeof saveAsTemplateSchema>;

export function SaveAsTemplateDialog({
  isOpen,
  onOpenChange,
  quoteItems,
  onSuccess,
}: SaveAsTemplateDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SaveAsTemplateFormValues>({
    resolver: zodResolver(saveAsTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = async (values: SaveAsTemplateFormValues) => {
    if (!quoteItems || quoteItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Kaydedilecek ürün bulunmuyor.',
      });
      return;
    }
    setIsSubmitting(true);

    try {
      console.log('Dialog: quoteItems map ediliyor. Ham kalem sayısı:', quoteItems.length);

      const templateItems: TemplateItem[] = quoteItems.map((item, index) => {
        return {
          productId: item.productId || undefined,
          name: String(item.name || 'İsimsiz Kalem'),
          brand: String(item.brand || ''),
          model: String(item.model || ''),
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit || 'Adet'),
          listPrice: Number(item.listPrice) || 0,
          currency: String(item.currency || 'TRY'),
          discountRate: Number(item.discountRate) || 0,
          profitMargin: Number(item.profitMargin) || 0,
          vatRate: Number(item.vatRate) || 0.20,
          priceIncludesVat: Boolean(item.priceIncludesVat),
          groupName: String(item.groupName || 'Genel')
        };
      });

      console.log('Dialog: Sunucuya gönderilecek kalem sayısı:', templateItems.length);

      const result = await createTemplate({
        name: values.name,
        description: values.description || '',
        items: templateItems,
      });

      if (result.success) {
        toast({
          title: 'Başarılı!',
          description: `"${values.name}" şablonu başarıyla oluşturuldu.`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: `Şablon kaydedilemedi: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teklifi Şablon Olarak Kaydet</DialogTitle>
          <DialogDescription>
            Bu teklifin kalemlerini gelecekte yeniden kullanmak üzere yeni bir şablon olarak kaydedin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Şablon Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: 3+1 Daire Standard Isıtma Paketi" {...field} />
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
                    <Textarea placeholder="Bu şablonun ne içerdiğini veya ne için kullanıldığını kısaca açıklayın." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">İptal</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şablonu Kaydet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
