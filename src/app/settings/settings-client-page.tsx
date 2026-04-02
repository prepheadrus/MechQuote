'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Settings } from '@prisma/client';
import { Loader2, Save } from 'lucide-react';
import { updateSettings } from '@/actions/settings';
import { BackupRestore } from '@/components/app/backup-restore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { MLServiceSettings } from '@/components/settings/ml-service-settings';
import { MLTrainingStats } from '@/components/ml/ml-training-stats';

// Schema Definition
const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Banka adı zorunludur'),
  iban: z.string().min(1, 'IBAN zorunludur'),
  currency: z.string().default('TRY'),
});

const settingsSchema = z.object({
  companyName: z.string().min(1, 'Firma adı zorunludur'),
  companyTitle: z.string().optional(),
  companySlogan: z.string().optional(),
  address: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email('Geçerli bir e-posta giriniz').optional().or(z.literal('')),
  website: z.string().optional(),
  logo: z.string().optional(), // Base64 string
  taxOffice: z.string().optional(),
  taxNumber: z.string().optional(),
  bankAccounts: z.array(bankAccountSchema).default([]),
  defaultTermsAndConditions: z.string().optional(),
  defaultVatRate: z.coerce.number().min(0).max(1).default(0.20),
  currency: z.string().default('TRY'),
  defaultExchangeRateUSD: z.coerce.number().min(0).default(32.50),
  defaultExchangeRateEUR: z.coerce.number().min(0).default(35.00),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsClientPageProps {
  initialSettings?: Settings | null;
}

export function SettingsClientPage({ initialSettings }: SettingsClientPageProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: '',
      companyTitle: '',
      companySlogan: '',
      address: '',
      phoneNumber: '',
      email: '',
      website: '',
      logo: '',
      taxOffice: '',
      taxNumber: '',
      bankAccounts: [],
      defaultTermsAndConditions: '',
      defaultVatRate: 0.20,
      currency: 'TRY',
      defaultExchangeRateUSD: 32.50,
      defaultExchangeRateEUR: 35.00,
    },
  });

  // Load data when ready
  useEffect(() => {
    if (initialSettings) {
      const settings = initialSettings as any;
      let banks = [];
      try {
        if (settings.bankAccounts) {
          banks = JSON.parse(settings.bankAccounts);
        }
      } catch (e) {
        console.error("Bank accounts parse error", e);
      }

      form.reset({
        companyName: settings.companyName || '',
        companyTitle: settings.companyTitle || '',
        companySlogan: settings.companySlogan || '',
        address: settings.address || '',
        phoneNumber: settings.phoneNumber || '',
        email: settings.email || '',
        website: settings.website || '',
        logo: settings.logo || '',
        taxOffice: settings.taxOffice || '',
        taxNumber: settings.taxNumber || '',
        bankAccounts: banks,
        defaultTermsAndConditions: settings.defaultTermsAndConditions || '',
        defaultVatRate: settings.defaultVatRate ?? 0.20,
        currency: settings.currency || 'TRY',
        defaultExchangeRateUSD: settings.defaultExchangeRateUSD ?? 32.50,
        defaultExchangeRateEUR: settings.defaultExchangeRateEUR ?? 35.00,
      });
    }
  }, [initialSettings, form]);

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({
    control: form.control,
    name: 'bankAccounts',
  });

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const result = await updateSettings({
        ...data,
        bankAccounts: JSON.stringify(data.bankAccounts),
      });

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Ayarlar başarıyla kaydedildi.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Settings save error:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Ayarlar kaydedilirken bir sorun oluştu.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit check
        toast({
          variant: 'destructive',
          title: 'Dosya Çok Büyük',
          description: 'Logo dosyası 1MB\'dan küçük olmalıdır.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('logo', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    form.setValue('logo', '', { shouldDirty: true });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Ayarlar & Kişiselleştirme</h1>
          <p className="text-muted-foreground mt-1">Firma bilgilerinizi ve teklif şablonlarını buradan yönetin.</p>
        </div>
      </div>

      <div className="space-y-6">
        <BackupRestore />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sistem Varsayılanları</CardTitle>
                <CardDescription>Yeni teklif oluşturulurken otomatik gelecek değerler.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultVatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varsayılan KDV Oranı</FormLabel>
                      <div className="flex items-center gap-4">
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            className="w-24"
                            value={(field.value * 100).toFixed(0)}
                            onChange={e => field.onChange(parseFloat(e.target.value) / 100)}
                          />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">% (Yüzde)</span>
                      </div>
                      <FormDescription>Ürünlerin standart KDV oranı.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultExchangeRateUSD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Varsayılan USD Kuru</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>Tekliflerdeki varsayılan dolar kuru.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultExchangeRateEUR"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Varsayılan EUR Kuru</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>Tekliflerdeki varsayılan euro kuru.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="defaultTermsAndConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varsayılan Teklif Şartları</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ödeme koşulları, teslim süresi vb."
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Yeni tekliflerin \"Koşullar\" alanına otomatik olarak bu metin eklenir.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-end border-t p-4">
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Ayarları Kaydet
                </Button>
              </CardFooter>
            </Card>

            {/* AI Matching Service */}
            <MLServiceSettings />

            {/* ML Training Stats */}
            <MLTrainingStats />
          </form>
        </Form>
      </div>
    </div>
  );
}
