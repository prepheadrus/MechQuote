'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createSupplier } from '@/actions/suppliers';

const supplierSchema = z.object({
  name: z.string().min(2, 'Tedarikçi adı en az 2 karakter olmalıdır.'),
});

type FormValues = z.infer<typeof supplierSchema>;

interface QuickAddSupplierProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newSupplier: { id: string; name: string }) => void;
}

export function QuickAddSupplier({
  isOpen,
  onOpenChange,
  onSuccess,
}: QuickAddSupplierProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createSupplier(values);

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Yeni tedarikçi başarıyla eklendi.',
        });

        if (result.data) {
          onSuccess({ id: result.data.id, name: result.data.name });
        }
        onOpenChange(false);
      } else {
        throw new Error(result.error);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: `İşlem başarısız oldu: ${error.message}`,
      });
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Hızlı Tedarikçi Ekle</DialogTitle>
              <DialogDescription>
                Yeni bir tedarikçi oluşturun. Bu tedarikçi listelerde hemen görünecektir.
              </DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tedarikçi Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Isıtma Market A.Ş." {...field} />
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
                disabled={isSubmitting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
