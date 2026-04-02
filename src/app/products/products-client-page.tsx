'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product, Supplier, InstallationType } from '@prisma/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Search,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  BarChart,
  TrendingUp,
  DollarSign,
  Copy,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { QuickAddProduct } from '@/components/app/quick-add-product';
import { Checkbox } from '@/components/ui/checkbox';
import { BulkProductImporter } from '@/components/app/bulk-product-importer';
import { BulkProductMatcher } from '@/components/products/bulk-product-matcher';
import { MergeProductsDialog } from '@/components/products/merge-products-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import { useProducts } from '@/hooks/use-products';

type ProductAnalytics = {
  totalProducts: number;
  topSelling: { id: string, name: string, brand: string, totalQuantity: number }[];
  mostProfitable: { id: string, name: string, brand: string, avgProfitMargin: number }[];
  mostPurchased?: { id: string, name: string, brand: string, totalQuantity: number }[];
  averageSellingPrice: number;
}

const ITEMS_PER_PAGE = 50;

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: string | number, icon: React.ReactNode, isLoading: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number, currency = 'TRY') => {
  const validCurrency = currency.toUpperCase() === 'TL' ? 'TRY' : currency;
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: validCurrency }).format(amount);
  } catch (e) {
    return `${amount} ${currency}`;
  }
};

interface ProductsClientPageProps {
  initialSuppliers: Supplier[];
  initialCategories: InstallationType[];
  initialAnalytics: ProductAnalytics | null;
}

export function ProductsPageContent({ initialSuppliers, initialCategories, initialAnalytics }: ProductsClientPageProps) {
  const { toast } = useToast();
  const router = useRouter();

  // FAZ 3 - ADIM 1: Veriyi ve mutasyonları doğrudan React Query hook'undan al
  const {
    products,
    isLoading: isLoadingProducts,
    deleteProduct,
    // bulkDeleteProducts hook'a eklenirse daha verimli olur, şimdilik döngü ile tek tek çağıracağız.
  } = useProducts();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, brandFilter]);


  // --- Memoized Maps and Lists for Display and Filtering ---
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    initialCategories.forEach(c => map.set(c.id, c.name));
    return map;
  }, [initialCategories]);

  // FAZ 3 - ADIM 2: Filtreleme ve sıralama mantığını doğrudan hook'tan gelen 'products' verisi üzerinde çalıştır
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchTerms = debouncedSearchTerm.toLocaleLowerCase('tr-TR').split(' ').filter(term => term.length > 0);
      if (searchTerms.length > 0) {
        const productText = [
          p.name,
          p.brand,
          p.model,
        ].filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');

        const isMatch = searchTerms.every(term => productText.includes(term));
        if (!isMatch) return false;
      }

      const brandMatch = brandFilter.length === 0 || (p.brand && brandFilter.includes(p.brand));

      return brandMatch;
    });
  }, [products, debouncedSearchTerm, brandFilter]);

  // --- Pagination Logic ---
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, endIndex);
  }, [filteredProducts, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  }, [filteredProducts]);


  // --- Event Handlers ---
  // FAZ 3 - ADIM 3: Handler'ları mutasyonları kullanacak şekilde güncelle, router.refresh() ve manuel state güncellemelerini kaldır
  const handleOpenAddDialog = () => {
    setEditingProduct(null);
    setIsCopyMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (product: Product) => {
    setEditingProduct(product);
    setIsCopyMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenCopyDialog = (productToCopy: Product) => {
    const newProduct = { ...productToCopy };
    // @ts-ignore
    delete newProduct.id;
    newProduct.name = `${newProduct.name} (Kopya)`;

    setEditingProduct(newProduct as Product);
    setIsCopyMode(true);
    setIsDialogOpen(true);
  }

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    // UI otomatik güncellenecek, manuel state güncellemesine gerek yok.
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(productId);
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteLoading(true);
    toast({ title: 'Siliniyor...', description: `${selectedIds.size} ürün siliniyor.` });

    try {
      const promises = Array.from(selectedIds).map(id => deleteProduct(id));
      await Promise.all(promises);

      // React Query invalidasyonu sayesinde UI otomatik güncellenecek.
      setSelectedIds(new Set());
    } catch (error: any) {
      // hook zaten kendi içinde toast gösteriyor.
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleExportToExcel = useCallback(() => {
    const dataToExport = products.map(p => ({
      'Ürün Adı': p.name,
      'Marka': p.brand,
      'Model': p.model,
      'Birim': p.unit,
      'Liste Fiyatı': p.listPrice,
      'Para Birimi': p.currency,
      'KDV Oranı (%)': (p.vatRate || 0) * 100,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ürünler");
    XLSX.writeFile(wb, "urunler.xlsx");

  }, [products]);
  
  // onActionSuccess artık sadece dialog'u kapatmalı, refresh'e gerek yok.
  const onActionSuccess = () => {
    setIsDialogOpen(false);
    setIsImporterOpen(false);
  }

  const toggleAllSelection = (isChecked: boolean) => {
    const newSelectedIds = new Set<string>();
    if (isChecked) {
      filteredProducts.forEach(p => newSelectedIds.add(p.id));
    }
    setSelectedIds(newSelectedIds);
  };

  const toggleSelection = (id: string, isChecked: boolean) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const allVisibleSelected = filteredProducts.length > 0 && selectedIds.size >= filteredProducts.length && filteredProducts.every(p => selectedIds.has(p.id));
  const someVisibleSelected = selectedIds.size > 0 && !allVisibleSelected;


  return (
    <div className="flex flex-col h-full overflow-hidden p-8 bg-background">
      <div className="flex-initial flex items-center justify-between space-y-2 mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ürünler / Malzemeler</h2>
          <p className="text-muted-foreground text-sm">Tekliflerinizde kullandığınız tüm ürün, malzeme ve hizmetleri yönetin.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleExportToExcel} variant="outline" disabled={products.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Tümünü Excel'e Aktar
          </Button>
          <Button onClick={() => setIsImporterOpen(true)} variant="outline">
            <UploadCloud className="mr-2 h-4 w-4" />
            Excel ile Ürün Yükle
          </Button>
          <MergeProductsDialog />
          <Button onClick={handleOpenAddDialog}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Yeni Ürün Ekle
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden space-y-4">
        <TabsList className="flex-initial">
          <TabsTrigger value="list">Ürün Listesi</TabsTrigger>
          <TabsTrigger value="analytics">Ürün Analitiği</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="flex-1 overflow-y-auto space-y-4 pr-2 pb-10">
          <Card>
            <CardHeader>
              <CardTitle>Ürün Performansı</CardTitle>
              <CardDescription>Satış ve karlılık metriklerine genel bakış.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Toplam Ürün Çeşidi" value={initialAnalytics?.totalProducts || 0} icon={<BarChart className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingProducts} />
              <StatCard title="Ort. Satış Fiyatı" value={formatCurrency(initialAnalytics?.averageSellingPrice || 0)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} isLoading={isLoadingProducts} />

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-blue-500" /> En Çok Teklif Edilenler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {initialAnalytics?.topSelling.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div className="truncate pr-2">
                          <p className="font-medium truncate" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{p.totalQuantity} adet</Badge>
                      </div>
                    ))}
                    {(!initialAnalytics?.topSelling || initialAnalytics.topSelling.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">Henüz veri yok.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-green-500" /> En Kârlı Ürünler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {initialAnalytics?.mostProfitable.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div className="truncate pr-2">
                          <p className="font-medium truncate" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800 shrink-0">%{(p.avgProfitMargin * 100).toFixed(1)}</Badge>
                      </div>
                    ))}
                    {(!initialAnalytics?.mostProfitable || initialAnalytics.mostPurchased?.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">Henüz veri yok.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-full md:col-span-2 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center"><UploadCloud className="h-5 w-5 mr-2 text-indigo-500" /> En Çok Satın Alınanlar (Gelen Fatura)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {initialAnalytics?.mostPurchased?.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm border-b pb-1 last:border-0 last:pb-0">
                        <div className="truncate pr-2 flex-1">
                          <p className="font-medium truncate" title={p.name}>{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand || '-'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">Tedarik Edilen:</span>
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200">{p.totalQuantity}</Badge>
                        </div>
                      </div>
                    ))}
                    {(!initialAnalytics?.mostPurchased || initialAnalytics.mostPurchased.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">Henüz veri yok.</p>}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="flex-1 flex flex-col overflow-hidden space-y-4">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-initial">
              <CardTitle>Ürün Listesi</CardTitle>
              <CardDescription>
                Tüm ürün, malzeme ve hizmetleriniz. Gelişmiş filtreleri kullanarak listeyi daraltabilirsiniz.
              </CardDescription>
              <div className="pt-4 flex flex-col gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün adı, marka veya model ara..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 pb-10">
              {selectedIds.size > 0 && (
                <div className="bg-primary/10 border-y border-primary/20 px-4 py-2 flex items-center justify-between">
                  <div className="text-sm font-semibold text-primary">
                    {selectedIds.size} ürün seçildi.
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={bulkDeleteLoading}>
                          {bulkDeleteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                           Seçilenleri Sil
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Bu işlem geri alınamaz. Seçilen {selectedIds.size} ürün kalıcı olarak silinecektir.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>İptal</AlertDialogCancel>
                          <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive hover:bg-destructive/90">
                            Evet, Sil
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedIds(new Set())}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 w-12">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(checked) => toggleAllSelection(!!checked)}
                        aria-label="Tümünü seç"
                        data-state={someVisibleSelected ? 'indeterminate' : (allVisibleSelected ? 'checked' : 'unchecked')}
                      />
                    </TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Marka</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">İskonto</TableHead>
                    <TableHead className="text-right">Maliyet (Net)</TableHead>
                    <TableHead className="text-right">Liste Fiyatı</TableHead>
                    <TableHead className="text-right w-20"><span className="sr-only">İşlemler</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingProducts ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={9}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedProducts.length > 0 ? (
                    paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="px-4">
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={(checked) => toggleSelection(product.id, !!checked)}
                            aria-label={`${product.name} seç`}
                          />
                        </TableCell>
                        <TableCell className="font-medium cursor-pointer" onClick={() => router.push(`/products/${product.id}`)}>
                          {product.name}
                        </TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>{product.model || '-'}</TableCell>
                        <TableCell>{product.category ? (categoryNameMap.get(product.category) || product.category) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {product.discountRate ? `%${(product.discountRate > 1 ? product.discountRate : product.discountRate * 100).toFixed(1)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(product.basePrice, product.currency)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground decoration-slate-400 line-through decoration-1">
                          {formatCurrency(product.listPrice, product.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Menü aç</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => router.push(`/products/${product.id}`)}>
                                <Eye className="mr-2 h-4 w-4" /> Görüntüle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(product)}>
                                <Edit className="mr-2 h-4 w-4" /> Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenCopyDialog(product)}>
                                <Copy className="mr-2 h-4 w-4" /> Kopyala
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteProduct(product.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        Ürün bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex-initial flex items-center justify-between space-x-2 py-4 border-t bg-slate-50/50">
              <div className="text-sm text-muted-foreground">
                Toplam {filteredProducts.length} ürün
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Önceki
                </Button>
                <div className="text-sm">
                  Sayfa {currentPage} / {Math.max(totalPages, 1)}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage >= totalPages}>
                  Sonraki <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <QuickAddProduct
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={onActionSuccess}
        existingProduct={editingProduct}
        isCopyMode={isCopyMode}
        suppliers={initialSuppliers}
        installationTypes={initialCategories}
      />

      <BulkProductImporter
        isOpen={isImporterOpen}
        onOpenChange={setIsImporterOpen}
        onSuccess={onActionSuccess}
      />
    </div>
  );
}
