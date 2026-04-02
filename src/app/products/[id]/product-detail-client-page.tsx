'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, ShoppingCart, Info, FileDown } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { QuickAddProduct } from '@/components/app/quick-add-product';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductPriceHistory } from '@/components/products/product-price-history';
import { PurchasingInsightsCard } from '@/components/products/purchasing-insights-card';
import { PurchasingInsight } from '@/actions/purchasing-analysis';
import { Product, PurchaseHistory } from '@prisma/client';

type EnrichedProduct = Product & {
  supplierName?: string;
  installationCategoryName?: string;
};

interface ProductDetailClientPageProps {
  initialProduct: any; // Type assertion needed due to manual enrichment
  initialHistory: PurchaseHistory[];
  initialAnalytics?: {
    totalSold: number;
    totalRevenue: number;
    avgProfitMargin: number;
    saleCount: number;
  };
  initialInsights?: PurchasingInsight;
}

export function ProductDetailClientPage({ initialProduct, initialHistory, initialAnalytics, initialInsights }: ProductDetailClientPageProps) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // We can use state if we want to update view after edit without full page reload,
  // but simpler to router.refresh() on success.
  // Using initialProduct directly.
  const enrichedProduct = initialProduct as EnrichedProduct;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(amount);
  };

  const handleEditSuccess = () => {
    router.refresh();
  }

  if (!enrichedProduct) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">Ürün Bulunamadı</h1>
        <p className="text-muted-foreground">Aradığınız ürün mevcut değil veya silinmiş olabilir.</p>
        <Button onClick={() => router.push('/products')}>
          <ArrowLeft className="mr-2" /> Ürün Listesine Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Sub-header */}
        <header className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-b px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push('/products')}>
                <ArrowLeft />
              </Button>
              <div>
                <h1 className="text-xl font-bold">{enrichedProduct.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {enrichedProduct.brand} {enrichedProduct.model && `- ${enrichedProduct.model}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="mr-2" /> Düzenle
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {/* Tabs for switching views */}
        <div className="px-8 pt-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
              <TabsTrigger value="history">Fiyat Geçmişi & Analiz</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-8 pb-8">
              {/* Left Column: Core Info & Pricing */}
              <div className="md:col-span-2 space-y-8">
                {/* Core Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Genel Bilgiler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="font-medium text-muted-foreground">Ürün Kodu</div>
                      <div className="font-mono">{enrichedProduct.code}</div>

                      <div className="font-medium text-muted-foreground">Marka</div>
                      <div>{enrichedProduct.brand}</div>

                      <div className="font-medium text-muted-foreground">Model</div>
                      <div>{enrichedProduct.model || '-'}</div>

                      <div className="font-medium text-muted-foreground">Birim</div>
                      <div>{enrichedProduct.unit}</div>

                      <div className="font-medium text-muted-foreground">Genel Kategori</div>
                      <div><Badge variant="secondary">{enrichedProduct.category}</Badge></div>

                      <div className="font-medium text-muted-foreground">Tesisat Kategorisi</div>
                      <div>{enrichedProduct.installationCategoryName ? <Badge variant="outline">{enrichedProduct.installationCategoryName}</Badge> : '-'}</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Fiyatlandırma</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="font-medium text-muted-foreground">Birim Alış Fiyatı (Net)</div>
                      <div className="font-semibold text-red-600">{formatCurrency(enrichedProduct.basePrice, enrichedProduct.currency)}</div>

                      <div className="font-medium text-muted-foreground">Son Tedarikçi</div>
                      <div>{enrichedProduct.supplierName || 'Belirtilmemiş'}</div>

                      <Separator className="col-span-2" />

                      <div className="font-medium text-muted-foreground">Liste Fiyatı (Tedarikçi)</div>
                      <div className="font-semibold text-green-600">{formatCurrency(enrichedProduct.listPrice, enrichedProduct.currency)}</div>

                      <div className="font-medium text-muted-foreground">İskonto Oranı</div>
                      <div>%{(enrichedProduct.discountRate || 0) * 100}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Description & Specs */}
              <div className="space-y-8">
                <PurchasingInsightsCard productId={enrichedProduct.id} initialData={initialInsights} />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Info className="h-4 w-4" /> Açıklama</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {enrichedProduct.description || 'Bu ürün için bir açıklama girilmemiş.'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Teknik Özellikler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {enrichedProduct.technicalSpecifications || 'Bu ürün için teknik özellik girilmemiş.'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Dökümanlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {enrichedProduct.brochureUrl ? (
                      <Button asChild variant="outline">
                        <a href={enrichedProduct.brochureUrl} target="_blank" rel="noopener noreferrer">
                          <FileDown className="mr-2 h-4 w-4" /> Broşürü Görüntüle
                        </a>
                      </Button>
                    ) : (
                      <p className="text-sm text-muted-foreground">Bu ürün için bir döküman yüklenmemiş.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-6 pb-8">
              <ProductPriceHistory
                history={initialHistory}
                analytics={initialAnalytics}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <QuickAddProduct
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
        existingProduct={enrichedProduct as any}
      />
    </>
  );
}
