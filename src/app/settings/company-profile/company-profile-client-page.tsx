'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Settings } from '@prisma/client';
import { updateSettings } from '@/actions/settings';

const bankAccountSchema = z.object({
  bankName: z.string().min(1, 'Banka adı zorunludur'),
  iban: z.string().min(1, 'IBAN zorunludur'),
  currency: z.string().default('TRY'),
});

const companyProfileSchema = z.object({
  companyName: z.string().min(2, "Firma adı en az 2 karakter olmalıdır."),
  companyTitle: z.string().optional(),
  logo: z.string().url("Geçerli bir URL girin.").optional().or(z.literal('')),
  companySlogan: z.string().optional(),
  address: z.string().min(10, "Adres zorunludur."),
  phoneNumber: z.string().min(10, "Telefon zorunludur."),
  email: z.string().email("Geçerli bir e-posta adresi girin."),
  website: z.string().url("Geçerli bir URL girin.").optional().or(z.literal('')),
  taxOffice: z.string().optional(),
  taxNumber: z.string().optional(),
  bankAccounts: z.array(bankAccountSchema).optional(),
  currency: z.string().default('TRY'),
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

interface CompanyProfileClientPageProps {
  initialSettings?: Settings | null;
}

export function CompanyProfileClientPage({ initialSettings }: CompanyProfileClientPageProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      companyName: '',
      companyTitle: '',
      logo: '',
      companySlogan: '',
      address: '',
      phoneNumber: '',
      email: '',
      website: '',
      taxOffice: '',
      taxNumber: '',
      bankAccounts: [],
      currency: 'TRY',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "bankAccounts",
  });

  useEffect(() => {
    if (initialSettings) {
      let banks: any = [];
      try {
        if (initialSettings.bankAccounts) {
          banks = Array.isArray(initialSettings.bankAccounts) ? initialSettings.bankAccounts : (typeof initialSettings.bankAccounts === 'string' ? JSON.parse(initialSettings.bankAccounts) : []);
        }
      } catch (e) {
        console.error("Bank accounts parse error", e);
      }
      form.reset({
        companyName: initialSettings.companyName || '',
        companyTitle: initialSettings.companyTitle || '',
        logo: initialSettings.logo || '',
        companySlogan: initialSettings.companySlogan || '',
        address: initialSettings.address || '',
        phoneNumber: initialSettings.phoneNumber || '',
        email: initialSettings.email || '',
        website: initialSettings.website || '',
        taxOffice: initialSettings.taxOffice || '',
        taxNumber: initialSettings.taxNumber || '',
        bankAccounts: banks || [],
        currency: initialSettings.currency || 'TRY',
      });
    }
  }, [initialSettings, form]);

  const onSubmit = async (values: CompanyProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await updateSettings({
        ...values,
        bankAccounts: JSON.stringify(values.bankAccounts),
      });

      if (result.success) {
        toast({
          title: 'Başarılı',
          description: 'Firma profili başarıyla güncellendi.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Hata", description: `Profil güncellenemedi: ${error.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
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
      <Card>
        <CardHeader>
          <CardTitle>Firma Profili</CardTitle>
          <CardDescription>
            Tekliflerinizde ve diğer resmi dökümanlarda görünecek olan şirket bilgilerinizi buradan yönetin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Temel Bilgiler</h3>
                <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem><FormLabel>Firma Resmi Ünvanı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="companyTitle" render={({ field }) => (
                    <FormItem><FormLabel>Kısa Ad / Kapak Adı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="companySlogan" render={({ field }) => (
                    <FormItem><FormLabel>Alt Başlık / Slogan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="logo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Firma Logosu</FormLabel>
                    <div className="flex items-start gap-4">
                      {field.value && (
                        <div className="relative border rounded-lg p-2 bg-white w-32 h-32 flex items-center justify-center overflow-hidden">
                          <Image
                            src={field.value}
                            alt="Firma Logosu"
                            fill
                            className="object-contain"
                            unoptimized={field.value.startsWith('http')}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">Önerilen: Şeffaf arka planlı PNG. Maksimum 1MB.</p>
                        <div className="pt-2">
                          <span className="text-xs font-medium">Veya Logo URL:</span>
                          <Input
                            type="url"
                            placeholder="https://example.com/logo.png"
                            value={(field.value && typeof field.value === 'string' && field.value.startsWith('data:')) ? '' : field.value || ''}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">İletişim ve Adres</h3>
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem><FormLabel>Adres</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-posta</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Finansal Bilgiler</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="taxOffice" render={({ field }) => (
                    <FormItem><FormLabel>Vergi Dairesi</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="taxNumber" render={({ field }) => (
                    <FormItem><FormLabel>Vergi Numarası</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Banka Hesapları</h4>
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-10 gap-2 items-end border p-4 rounded-md relative">
                        <FormField control={form.control} name={`bankAccounts.${index}.bankName`} render={({ field }) => (
                          <FormItem className="col-span-3"><FormLabel>Banka Adı</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`bankAccounts.${index}.iban`} render={({ field }) => (
                          <FormItem className="col-span-4"><FormLabel>IBAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField
                          control={form.control}
                          name={`bankAccounts.${index}.currency`}
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Para Birimi</FormLabel>
                              <FormControl>
                                <select
                                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  {...field}
                                >
                                  <option value="TRY">TRY (₺)</option>
                                  <option value="USD">USD ($)</option>
                                  <option value="EUR">EUR (€)</option>
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="col-span-1" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ bankName: '', iban: '', currency: 'TRY' })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Banka Hesabı Ekle
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Profili Kaydet
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
