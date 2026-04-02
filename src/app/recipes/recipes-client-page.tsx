'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    PlusCircle,
    Trash2,
    Loader2,
    BookCopy,
    Search,
    Clock,
    Package,
    Wrench,
} from 'lucide-react';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ProductSelector } from '@/components/app/product-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { getRecipePageData, saveRecipe } from '@/actions/recipes';
import { getLaborCosts, saveLaborCost, deleteLaborCost } from '@/actions/labor-costs';
import type { Product, Recipe, RecipeItem, LaborCost } from '@prisma/client';

// --- Types ---
// Enhanced Recipe type for client-side use
type RecipeWithItems = Recipe & { recipeItems: RecipeItem[] };

const recipeItemSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['material', 'labor']),
    itemId: z.string(),
    name: z.string(),
    quantity: z.coerce.number().min(0.01, 'Miktar 0\'dan büyük olmalıdır.'),
    unit: z.string().optional(),
    cost: z.coerce.number(), // Birim maliyet
});

const recipeSchema = z.object({
    id: z.string().optional(),
    productId: z.string(),
    recipeItems: z.array(recipeItemSchema),
});

const laborCostFormSchema = z.object({
    id: z.string().optional(),
    role: z.string().min(2, "Rol en az 2 karakter olmalıdır."),
    cost: z.coerce.number().min(0, "Maliyet negatif olamaz."),
    unit: z.string().min(1, "Birim zorunludur (örn: Gün, İş, Saat)."),
});

type RecipeFormValues = z.infer<typeof recipeSchema>;
type RecipeItemForm = z.infer<typeof recipeItemSchema>;
type LaborCostFormValues = z.infer<typeof laborCostFormSchema>;


// --- Main Component ---
export function RecipesPageContent() {
    const { toast } = useToast();

    // --- State Management ---
    const [products, setProducts] = useState<Product[]>([]);
    const [recipes, setRecipes] = useState<RecipeWithItems[]>([]);
    const [laborCosts, setLaborCosts] = useState<LaborCost[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
    const [isLaborCostDialogOpen, setIsLaborCostDialogOpen] = useState(false);

    // --- Data Fetching ---
    const loadPageData = useCallback(async () => {
        setIsLoading(true);
        const result = await getRecipePageData();
        if (result.success && result.data) {
            setProducts(result.data.products);
            setRecipes(result.data.recipes as RecipeWithItems[]);
            setLaborCosts(result.data.laborCosts);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error });
        }
        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        loadPageData();
    }, [loadPageData]);

    const { productsWithRecipes, productsWithoutRecipes, totalRecipeCount } = useMemo(() => {
        if (isLoading) {
            return { productsWithRecipes: [], productsWithoutRecipes: [], totalRecipeCount: 0 };
        }
        const recipeProductIds = new Set(recipes.map((r) => r.productId));

        const allProductsWithRecipes = products.filter(p => recipeProductIds.has(p.id));
        const allProductsWithoutRecipes = products.filter(p => !recipeProductIds.has(p.id));
        const _totalRecipeCount = allProductsWithRecipes.length;

        const searchTerms = searchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(term => term.length > 0);
        const filterFn = (p: Product) => {
            if (searchTerms.length === 0) return true;
            const productText = `${p.name} ${p.brand}`.toLocaleLowerCase('tr-TR');
            return searchTerms.every(term => productText.includes(term));
        };

        return {
            productsWithRecipes: allProductsWithRecipes.filter(filterFn),
            productsWithoutRecipes: allProductsWithoutRecipes.filter(filterFn),
            totalRecipeCount: _totalRecipeCount
        };
    }, [products, recipes, searchTerm, isLoading]);

    const form = useForm<RecipeFormValues>({
        resolver: zodResolver(recipeSchema),
        defaultValues: {
            id: undefined,
            productId: '',
            recipeItems: [],
        }
    });

    const { fields, append, remove, update } = useFieldArray({
        control: form.control,
        name: 'recipeItems',
    });

    useEffect(() => {
        if (selectedProduct) {
            const recipe = recipes.find(r => r.productId === selectedProduct.id);
            let itemsToSet: RecipeItemForm[] = [];

            if (recipe && recipe.recipeItems) {
                itemsToSet = recipe.recipeItems.map((item) => {
                    let name = 'Bilinmeyen';
                    let unit: string | undefined = 'adet';
                    let cost = 0;
                    if (item.type === 'material') {
                        const product = products.find(p => p.id === item.itemId);
                        name = product?.name || 'Silinmiş Ürün';
                        unit = product?.unit || undefined;
                        cost = product?.basePrice || 0;
                    } else { // labor
                        const labor = laborCosts.find(l => l.id === item.itemId);
                        name = labor?.role || 'Silinmiş İşçilik';
                        unit = labor?.unit || undefined;
                        cost = labor?.cost || 0;
                    }
                    return {
                        id: item.id,
                        type: item.type as any,
                        itemId: item.itemId,
                        quantity: item.quantity,
                        name,
                        unit,
                        cost
                    };
                });
            }
            form.reset({
                id: recipe?.id,
                productId: selectedProduct.id,
                recipeItems: itemsToSet,
            });
        } else {
            form.reset({ id: undefined, productId: '', recipeItems: [] });
        }
    }, [selectedProduct, recipes, products, laborCosts, form]);

    const watchedItems = form.watch('recipeItems');

    const totalRecipeCost = useMemo(() => {
        return watchedItems?.reduce((total, item) => total + (item.cost * item.quantity), 0) || 0;
    }, [watchedItems]);

    const handleAddProductsAsMaterials = (selectedMaterials: Product[]) => {
        selectedMaterials.forEach(material => {
            append({
                type: 'material',
                itemId: material.id,
                name: material.name,
                quantity: 1,
                unit: material.unit || undefined,
                cost: material.basePrice,
            });
        });
        setIsProductSelectorOpen(false);
    };

    const handleAddLabor = (labor: LaborCost) => {
        append({
            type: 'labor',
            itemId: labor.id,
            name: labor.role,
            quantity: 1,
            unit: labor.unit || undefined,
            cost: labor.cost,
        });
    }

    const handleSaveRecipe = async (data: RecipeFormValues) => {
        if (!selectedProduct) return;
        setIsSaving(true);

        const recipeItemsToSave = data.recipeItems.map(({ id, ...rest }) => rest);

        const result = await saveRecipe(selectedProduct.id, recipeItemsToSave);

        if (result.success) {
            toast({ title: "Başarılı!", description: `${selectedProduct.name} reçetesi kaydedildi.` });
            await loadPageData(); // Refresh data
        } else {
            toast({ variant: 'destructive', title: "Hata", description: `Reçete kaydedilemedi: ${result.error}` });
        }
        setIsSaving(false);
    };

    const handleLaborCostUpdated = useCallback((updatedLabor: LaborCost) => {
        const currentItems = form.getValues('recipeItems');
        currentItems.forEach((item, index) => {
            if (item.type === 'labor' && item.itemId === updatedLabor.id) {
                update(index, {
                    ...item,
                    cost: updatedLabor.cost,
                    unit: updatedLabor.unit,
                    name: updatedLabor.role,
                });
            }
        });
    }, [form, update]);


    return (
        <>
            <div className="hidden h-full flex-col md:flex">
                <ResizablePanelGroup direction="horizontal" className="h-full max-h-full items-stretch">
                    <ResizablePanel defaultSize={30} minSize={25}>
                        <div className="flex h-full flex-col">
                            <CardHeader>
                                <CardTitle>Ürünler ve Reçeteler</CardTitle>
                                <CardDescription>Bir reçete seçin veya yeni bir tane oluşturmak için bir ürün seçin.</CardDescription>
                                <div className="relative pt-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Ürün veya marka ara..."
                                        className="pl-8"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </CardHeader>
                            <ScrollArea className="flex-1">
                                <div className="p-4 pt-0">
                                    {isLoading && <Loader2 className="mx-auto my-8 animate-spin" />}

                                    {!isLoading && totalRecipeCount > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold text-muted-foreground mt-2 px-1">Reçeteler ({productsWithRecipes.length})</h4>
                                            {productsWithRecipes.map(p => (
                                                <Card
                                                    key={p.id}
                                                    className={`cursor-pointer hover:bg-accent ${selectedProduct?.id === p.id ? 'border-primary' : ''}`}
                                                    onClick={() => setSelectedProduct(p)}
                                                >
                                                    <CardContent className="p-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold">{p.name}</p>
                                                            <p className="text-xs text-muted-foreground">{p.brand}</p>
                                                        </div>
                                                        <BookCopy className="h-5 w-5 text-primary flex-shrink-0" />
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    {!isLoading && productsWithoutRecipes.length > 0 && totalRecipeCount > 0 && <Separator className="my-4" />}

                                    {!isLoading && productsWithoutRecipes.length > 0 && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-semibold text-muted-foreground mt-2 px-1">Diğer Ürünler ({productsWithoutRecipes.length})</h4>
                                            {productsWithoutRecipes.map(p => (
                                                <Card
                                                    key={p.id}
                                                    className={`cursor-pointer hover:bg-accent ${selectedProduct?.id === p.id ? 'border-primary' : ''}`}
                                                    onClick={() => setSelectedProduct(p)}
                                                >
                                                    <CardContent className="p-3 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-semibold">{p.name}</p>
                                                            <p className="text-xs text-muted-foreground">{p.brand}</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    {!isLoading && searchTerm && productsWithRecipes.length === 0 && productsWithoutRecipes.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center pt-8">Aramanızla eşleşen ürün bulunamadı.</p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={70}>
                        <div className="flex h-full flex-col">
                            {selectedProduct ? (
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleSaveRecipe)} className="flex flex-col h-full">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-2xl">{selectedProduct.name} Reçetesi</CardTitle>
                                                    <CardDescription>Bu ürünü oluşturmak için gereken malzemeleri ve işçilikleri tanımlayın.</CardDescription>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button type="button" variant="outline" onClick={() => setIsLaborCostDialogOpen(true)}>
                                                        <Wrench className="mr-2 h-4 w-4" /> İşçilik Maliyetleri
                                                    </Button>
                                                    <Button type="button" variant="outline" onClick={() => setIsProductSelectorOpen(true)}>
                                                        <PlusCircle className="mr-2" /> Malzeme Ekle
                                                    </Button>
                                                    <Button type="submit" disabled={isSaving || isLoading}>
                                                        {isSaving && <Loader2 className="animate-spin mr-2" />}
                                                        Reçeteyi Kaydet
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
                                            <Card className="bg-slate-800 text-white">
                                                <CardHeader className="pb-2 flex-row items-center justify-between">
                                                    <CardTitle className="text-base">Toplam Reçete Maliyeti</CardTitle>
                                                    <p className="text-sm text-slate-300">Bu maliyet, tekliflerdeki kar hesaplaması için kullanılacaktır.</p>
                                                </CardHeader>
                                                <CardContent>
                                                    <p className="text-4xl font-bold font-mono">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalRecipeCost)}</p>
                                                </CardContent>
                                            </Card>

                                            <div className="border rounded-md flex-1 overflow-auto">
                                                <Table>
                                                    <TableHeader className="bg-muted/50 sticky top-0">
                                                        <TableRow>
                                                            <TableHead className="w-12"></TableHead>
                                                            <TableHead className="w-2/5">Kalem (Malzeme/İşçilik)</TableHead>
                                                            <TableHead>Miktar</TableHead>
                                                            <TableHead>Birim</TableHead>
                                                            <TableHead className="text-right">Birim Maliyet</TableHead>
                                                            <TableHead className="text-right">Toplam Maliyet</TableHead>
                                                            <TableHead className="w-12"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {fields.length === 0 && (
                                                            <TableRow>
                                                                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                                    Bu reçeteye malzeme veya işçilik ekleyin.
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                        {fields.map((field, index) => {
                                                            const itemTotalCost = watchedItems[index]?.quantity * watchedItems[index]?.cost;
                                                            return (
                                                                <TableRow key={field.id}>
                                                                    <TableCell className="text-center">
                                                                        {field.type === 'material' ? <Package className="h-5 w-5 text-slate-500" /> : <Clock className="h-5 w-5 text-blue-500" />}
                                                                    </TableCell>
                                                                    <TableCell className="font-medium">{field.name}</TableCell>
                                                                    <TableCell>
                                                                        <FormField control={form.control} name={`recipeItems.${index}.quantity`} render={({ field }) => (
                                                                            <Input {...field} type="number" step="any" className="w-24 h-8" />
                                                                        )} />
                                                                    </TableCell>
                                                                    <TableCell>{field.unit}</TableCell>
                                                                    <TableCell className="text-right font-mono">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(field.cost)}</TableCell>
                                                                    <TableCell className="text-right font-mono font-semibold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(itemTotalCost || 0)}</TableCell>
                                                                    <TableCell>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)}>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </form>
                                </Form>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center">
                                    <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
                                    <h3 className="text-xl font-semibold">Reçete Görüntüle veya Oluştur</h3>
                                    <p className="text-muted-foreground mt-2">Lütfen soldaki listeden bir ürün seçin.</p>
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
            <ProductSelector
                isOpen={isProductSelectorOpen}
                onOpenChange={setIsProductSelectorOpen}
                onProductsSelected={handleAddProductsAsMaterials}
                recipes={recipes}
            />
            <LaborCostDialog
                isOpen={isLaborCostDialogOpen}
                onOpenChange={setIsLaborCostDialogOpen}
                laborCosts={laborCosts}
                onAddLabor={handleAddLabor}
                onLaborCostUpdated={handleLaborCostUpdated}
                onDataChange={loadPageData}
            />
        </>
    );
}

// --- LaborCostDialog Component ---

interface LaborCostDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    laborCosts: LaborCost[];
    onAddLabor: (labor: LaborCost) => void;
    onLaborCostUpdated: (labor: LaborCost) => void;
    onDataChange: () => void;
}

function LaborCostDialog({ isOpen, onOpenChange, laborCosts, onAddLabor, onLaborCostUpdated, onDataChange }: LaborCostDialogProps) {
    const { toast } = useToast();
    const [editingLabor, setEditingLabor] = useState<LaborCost | null>(null);

    const form = useForm<LaborCostFormValues>({
        resolver: zodResolver(laborCostFormSchema),
        defaultValues: { role: "", cost: 0, unit: "Gün" },
    });
    useEffect(() => {
        if (editingLabor) {
            form.reset(editingLabor);
        } else {
            form.reset({ role: "", cost: 0, unit: "Gün" });
        }
    }, [editingLabor, form]);

    const handleSaveLaborCost = async (values: LaborCostFormValues) => {
        const result = await saveLaborCost(values);

        if (result.success && result.data) {
            toast({ title: 'Başarılı!', description: `İşçilik maliyeti ${values.id ? 'güncellendi' : 'kaydedildi'}.` });
            onDataChange(); // Refresh data on the main page
            onLaborCostUpdated(result.data); // Update form on main page
            setEditingLabor(null);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: result.error || 'İşlem başarısız oldu' });
        }
    };

    const handleDeleteLaborCost = async (id: string) => {
        const result = await deleteLaborCost(id);
        if (result.success) {
            toast({ title: 'Silindi', description: 'İşçilik maliyeti silindi.' });
            onDataChange(); // Refresh data on the main page
            setEditingLabor(null);
        } else {
            toast({ variant: 'destructive', title: 'Hata', description: `Silinemedi: ${result.error}` });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>İşçilik Maliyetlerini Yönet</DialogTitle>
                    <DialogDescription>
                        Reçetelerde kullanmak üzere işçilik rollerini ve maliyetlerini tanımlayın.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-6 py-4">
                    <div className="col-span-2">
                        <h4 className="font-medium mb-2">Tanımlı İşçilikler</h4>
                        <ScrollArea className="h-64 border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rol</TableHead>
                                        <TableHead>Birim</TableHead>
                                        <TableHead className="text-right">Maliyet</TableHead>
                                        <TableHead className="w-24"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {laborCosts.map(l => (
                                        <TableRow key={l.id}>
                                            <TableCell className="font-medium">{l.role}</TableCell>
                                            <TableCell>{l.unit}</TableCell>
                                            <TableCell className="text-right font-mono">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(l.cost)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-1 justify-end">
                                                    <Button variant="outline" size="sm" onClick={() => onAddLabor(l)}>Ekle</Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingLabor(l)}>Düzenle</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <div className="col-span-1">
                        <h4 className="font-medium mb-2">{editingLabor ? 'Düzenle' : 'Yeni Ekle'}</h4>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSaveLaborCost)} className="space-y-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-md border">
                                <FormField control={form.control} name="role" render={({ field }) => (
                                    <FormItem><FormLabel>Rol</FormLabel><FormControl><Input placeholder="Usta Yevmiye" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Birim</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Birim seçin" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Gün">Gün</SelectItem>
                                                    <SelectItem value="Saat">Saat</SelectItem>
                                                    <SelectItem value="İş">İş (Götürü)</SelectItem>
                                                    <SelectItem value="Ay">Ay</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField control={form.control} name="cost" render={({ field }) => (
                                    <FormItem><FormLabel>Maliyet</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="flex flex-col gap-2">
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                                        {editingLabor ? 'Güncelle' : 'Kaydet'}
                                    </Button>
                                    {editingLabor && (
                                        <>
                                            <Button type="button" variant="secondary" onClick={() => setEditingLabor(null)}>Yeni Kayda Geç</Button>
                                            {editingLabor.id &&
                                                <Button type="button" variant="destructive" size="sm" onClick={() => handleDeleteLaborCost(editingLabor.id!)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Sil
                                                </Button>
                                            }
                                        </>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Kapat</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}