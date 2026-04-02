'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product, Supplier, InstallationType } from '@prisma/client';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { QuickAddSupplier } from './quick-add-supplier';
import { QuickAddInstallationType } from './quick-add-installation-type';
import { createProduct, updateProduct } from '@/actions/products';
import { getSuppliers } from '@/actions/suppliers';
import { getInstallationTypes } from '@/actions/installation-types';


const productSchema = z.object({
    // Core Info
    code: z.string().min(1, "Kod zorunludur."),
    name: z.string().min(2, "Ad en az 2 karakter olmalıdır."),
    brand: z.string().min(1, "Marka zorunludur."),
    model: z.string().optional(),
    unit: z.string().min(1, "Birim zorunludur."),

    // Cost Info
    listPrice: z.coerce.number().min(0, "Liste fiyatı 0 veya daha büyük olmalıdır."),
    discountRate: z.coerce.number().min(0).max(1, "İskonto oranı 0 ile 100 arasında olmalıdır."),
    basePrice: z.coerce.number().min(0, "Maliyet fiyatı 0 veya daha büyük olmalıdır."),
    supplierId: z.string().optional().nullable(),

    // Sales Info
    currency: z.enum(["TRY", "USD", "EUR"]),

    // Categorization
    category: z.string().min(1, "Kategori zorunludur."),
    installationTypeId: z.string().optional().nullable(),

    // VAT Info
    priceIncludesVat: z.boolean().default(false),
    vatRate: z.coerce.number().min(0).max(1),

    // Detailed Info
    description: z.string().optional(),
    technicalSpecifications: z.string().optional(),
    brochureUrl: z.string().url("Geçerli bir URL girin.").optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface QuickAddProductProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    existingProduct?: Product | null;
    isCopyMode?: boolean;
    suppliers?: Supplier[];
    installationTypes?: InstallationType[];
}

const buildCategoryTree = (categories: InstallationType[]): { id: string; name: string }[] => {
    if (!categories) return [];
    return categories.map(c => ({ id: c.id || '', name: c.name })).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
};

export function QuickAddProduct({ isOpen, onOpenChange, onSuccess, existingProduct, isCopyMode, suppliers: initialSuppliers, installationTypes: initialInstallationTypes }: QuickAddProductProps) {
    const { toast } = useToast();

    const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    // Local state for lists (if not passed as props, or to refetch)
    const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers || []);
    const [installationTypes, setInstallationTypes] = useState<InstallationType[]>(initialInstallationTypes || []);

    // Fetch if not provided or to ensure fresh data on open
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                // Only fetch if needed or if we want to ensure freshness. 
                // Prioritize props but maybe refetch if empty? 
                // Simplest: if props are missing, fetch.
                if (!initialSuppliers || initialSuppliers.length === 0) {
                    const res = await getSuppliers();
                    if (res.success && res.data) {
                        setSuppliers(res.data.map(s => ({ ...s, isDeleted: false, deletedAt: null, balance: 0 })));
                    }
                } else {
                    setSuppliers(initialSuppliers);
                }

                if (!initialInstallationTypes || initialInstallationTypes.length === 0) {
                    const res = await getInstallationTypes();
                    if (res.success && res.data) setInstallationTypes(res.data);
                } else {
                    setInstallationTypes(initialInstallationTypes);
                }
            };
            fetchData();
        }
    }, [isOpen, initialSuppliers, initialInstallationTypes]);

    const hierarchicalCategories = useMemo(() => {
        if (!installationTypes) return [];
        return buildCategoryTree(installationTypes);
    }, [installationTypes]);


    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            code: "",
            name: "",
            brand: "",
            model: "",
            unit: "Adet",
            listPrice: 0,
            currency: "TRY",
            discountRate: 0,
            basePrice: 0,
            supplierId: null,
            category: "Genel",
            installationTypeId: null,
            description: "",
            technicalSpecifications: "",
            brochureUrl: "",
            vatRate: 0.20,
            priceIncludesVat: false
        }
    });

    const watchedListPrice = form.watch('listPrice');
    const watchedDiscountRate = form.watch('discountRate');
    const watchedVatRate = form.watch('vatRate');
    const watchedPriceIncludesVat = form.watch('priceIncludesVat');


    useEffect(() => {
        const listPrice = !isNaN(watchedListPrice) ? watchedListPrice : 0;
        const discountRate = !isNaN(watchedDiscountRate) ? watchedDiscountRate : 0;
        const vatRate = !isNaN(watchedVatRate) ? watchedVatRate : 0;

        const netListPrice = watchedPriceIncludesVat ? listPrice / (1 + vatRate) : listPrice;
        const calculatedBasePrice = netListPrice * (1 - discountRate);

        form.setValue('basePrice', parseFloat(calculatedBasePrice.toFixed(2)));
    }, [watchedListPrice, watchedDiscountRate, watchedVatRate, watchedPriceIncludesVat, form]);

    useEffect(() => {
        if (isOpen) {
            if (existingProduct) {
                let initialVatRate = existingProduct.vatRate ?? 0.20;
                if (initialVatRate > 1) initialVatRate = initialVatRate / 100;

                let initialDiscountRate = existingProduct.discountRate ?? 0;
                if (initialDiscountRate > 1) initialDiscountRate = initialDiscountRate / 100;

                const formData = {
                    ...existingProduct,
                    name: existingProduct.name || '',
                    code: existingProduct.code || '',
                    brand: existingProduct.brand || '',
                    model: existingProduct.model || '',
                    unit: existingProduct.unit || 'Adet',
                    category: existingProduct.category || 'Genel',
                    currency: (existingProduct.currency as any) || 'TRY',
                    listPrice: existingProduct.listPrice ?? 0,
                    basePrice: existingProduct.basePrice ?? 0,
                    discountRate: initialDiscountRate,
                    description: existingProduct.description || '',
                    technicalSpecifications: existingProduct.technicalSpecifications || '',
                    installationTypeId: existingProduct.installationTypeId || null,
                    supplierId: existingProduct.supplierId || null,
                    brochureUrl: existingProduct.brochureUrl || '',
                    vatRate: initialVatRate,
                    priceIncludesVat: existingProduct.priceIncludesVat ?? false
                };
                form.reset(formData);
            } else {
                form.reset({
                    code: "",
                    name: "",
                    brand: "",
                    model: "",
                    category: "Genel",
                    installationTypeId: null,
                    unit: "Adet",
                    listPrice: 0,
                    currency: "TRY",
                    discountRate: 0,
                    basePrice: 0,
                    supplierId: null,
                    description: "",
                    technicalSpecifications: "",
                    brochureUrl: "",
                    vatRate: 0.20,
                    priceIncludesVat: false
                });
            }
        }
    }, [isOpen, existingProduct, isCopyMode, form]);

    const onSubmit = async (values: ProductFormValues) => {
        const dataToSave: any = {
            ...values,
            id: (existingProduct && !isCopyMode) ? existingProduct.id : undefined,
            description: values.description || null,
            technicalSpecifications: values.technicalSpecifications || null,
            brochureUrl: values.brochureUrl || null,
            model: values.model || '',
            installationTypeId: values.installationTypeId || null,
            supplierId: values.supplierId || null,
        };

        try {
            let result;
            if (existingProduct && !isCopyMode && existingProduct.id) {
                result = await updateProduct(existingProduct.id, dataToSave);
            } else {
                result = await createProduct(dataToSave);
            }

            if (result.success) {
                toast({ title: "Başarılı", description: isCopyMode || !existingProduct ? "Yeni ürün başarıyla eklendi." : "Ürün başarıyla güncellendi." });
                onSuccess?.();
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }

        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: `İşlem başarısız oldu: ${error.message}` });
        }
    };

    const handleSupplierAdded = (newSupplier: { id: string; name: string }) => {
        // Manually update the list and select the new item
        setSuppliers(prev => [...prev, newSupplier as Supplier]);
        form.setValue('supplierId', newSupplier.id);
        setIsSupplierDialogOpen(false);
    };

    const handleCategoryAdded = (newCategory: { id: string; name: string }) => {
        setInstallationTypes(prev => [...prev, newCategory as InstallationType]);
        form.setValue('installationTypeId', newCategory.id);
        setIsCategoryDialogOpen(false);
    };

    const isEditMode = !!existingProduct && !isCopyMode;

    let dialogTitle = 'Yeni Ürün/Malzeme Ekle';
    let dialogDescription = 'Sisteme yeni bir ürün, malzeme veya hizmet ekleyin.';
    if (isEditMode) {
        dialogTitle = 'Ürünü Düzenle';
        dialogDescription = 'Ürün bilgilerini güncelleyin.';
    } else if (isCopyMode) {
        dialogTitle = 'Ürünü Kopyala';
        dialogDescription = 'Bu ürünü kopyalayarak yeni bir ürün oluşturun. Benzersiz bir ürün kodu girdiğinizden emin olun.';
    }


    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>
                            {dialogDescription}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                            console.error("Form Validation Errors:", errors);
                            toast({
                                variant: "destructive",
                                title: "Form Hatası",
                                description: "Lütfen zorunlu alanları kontrol edin. Eksik bilgiler var.",
                            });
                        })} className="space-y-4 flex-1 overflow-y-auto pr-2">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 py-4 px-1">
                                <h4 className="md:col-span-2 text-lg font-semibold text-primary border-b pb-2 mb-2">Genel Bilgiler</h4>
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Ad</FormLabel><FormControl><Input placeholder="Duvar Tipi Yoğuşmalı Kazan 50 kW" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="code" render={({ field }) => (
                                    <FormItem><FormLabel>Kod</FormLabel><FormControl><Input placeholder="WS-YK-50" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="unit" render={({ field }) => (
                                    <FormItem><FormLabel>Birim</FormLabel><FormControl><Input placeholder="Adet" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="brand" render={({ field }) => (
                                    <FormItem><FormLabel>Marka</FormLabel><FormControl><Input placeholder="Warmhaus" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="model" render={({ field }) => (
                                    <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="Ewa 50" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />

                                <FormField control={form.control} name="category" render={({ field }) => (
                                    <FormItem><FormLabel>Genel Kategori</FormLabel><FormControl><Input placeholder="Kazan" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="installationTypeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tesisat Kategorisi (Opsiyonel)</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                                                    value={field.value ?? ""}
                                                >
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Bir tesisat kategorisi seçin" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="null">Kategori Yok</SelectItem>
                                                        {hierarchicalCategories.map((type) => (
                                                            <SelectItem key={type.id} value={type.id}>
                                                                {type.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" size="icon" onClick={() => setIsCategoryDialogOpen(true)}>
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator className="md:col-span-2 my-4" />
                                <h4 className="md:col-span-2 text-lg font-semibold text-primary border-b pb-2 mb-2">Maliyet ve Fiyat Bilgileri</h4>

                                <div className="md:col-span-2 flex items-center space-x-2">
                                    <FormField control={form.control} name="priceIncludesVat" render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <FormLabel className="!mt-0">
                                                Girdiğim Fiyatlara KDV Dahil
                                            </FormLabel>
                                        </FormItem>
                                    )} />
                                </div>

                                <Controller
                                    control={form.control}
                                    name="vatRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>KDV Oranı (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="20"
                                                    value={(field.value || 0) * 100}
                                                    onChange={(e) => {
                                                        const numValue = parseFloat(e.target.value);
                                                        field.onChange(isNaN(numValue) ? 0 : numValue / 100);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField control={form.control} name="currency" render={({ field }) => (
                                    <FormItem><FormLabel>Para Birimi</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="TRY">TL</SelectItem>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="EUR">EUR</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage /></FormItem>
                                )} />

                                <FormField control={form.control} name="listPrice" render={({ field }) => (
                                    <FormItem><FormLabel>Liste Fiyatı (Tedarikçi)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Controller
                                    control={form.control}
                                    name="discountRate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>İskonto Oranı (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    placeholder="15"
                                                    value={(field.value || 0) * 100}
                                                    onChange={(e) => {
                                                        const numValue = parseFloat(e.target.value);
                                                        field.onChange(isNaN(numValue) ? 0 : numValue / 100);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="basePrice" render={({ field }) => (
                                    <FormItem><FormLabel>Birim Maliyet (Hesaplanan)</FormLabel><FormControl><Input type="number" step="0.01" {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="supplierId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tedarikçi</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Select onValueChange={(value) => field.onChange(value === "null" ? null : value)} value={field.value ?? ""}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Tedarikçi seçin" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="null">Tedarikçi Yok</SelectItem>
                                                        {suppliers.map((supplier) => (
                                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                                {supplier.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Button type="button" variant="outline" size="icon" onClick={() => setIsSupplierDialogOpen(true)}>
                                                    <PlusCircle className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Separator className="md:col-span-2 my-4" />
                                <h4 className="md:col-span-2 text-lg font-semibold text-primary border-b pb-2 mb-2">Detaylı Bilgiler</h4>

                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Açıklama</FormLabel><FormControl><Textarea placeholder="Ürünle ilgili genel açıklamalar, kullanım alanları vb." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="technicalSpecifications" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Teknik Özellikler</FormLabel><FormControl><Textarea placeholder="Kapasite: 50 kW, Verim: _109, Ağırlık: 45 kg..." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="brochureUrl" render={({ field }) => (
                                    <FormItem className="md:col-span-2"><FormLabel>Broşür/Döküman Linki</FormLabel><FormControl><Input type="url" placeholder="https://example.com/urun-brosuru.pdf" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background py-4">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isEditMode ? 'Güncelle' : 'Kaydet'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <QuickAddSupplier
                isOpen={isSupplierDialogOpen}
                onOpenChange={setIsSupplierDialogOpen}
                onSuccess={handleSupplierAdded}
            />
            <QuickAddInstallationType
                isOpen={isCategoryDialogOpen}
                onOpenChange={setIsCategoryDialogOpen}
                onSuccess={handleCategoryAdded}
                allCategories={installationTypes}
            />
        </>
    );
}
