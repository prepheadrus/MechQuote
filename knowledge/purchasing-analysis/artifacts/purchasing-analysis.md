# Satın Alma Analizi ve Fiyat Öngörüleri (Purchasing Insights)

## Genel Bakış

MechQuote'un satın alma analizi sistemi, geçmiş satın alma verilerini analiz ederek fiyat trendlerini, en ucuz tedarikçileri ve fiyat volatilitesini tespit eder. AI destekli önerilerle satın alma kararlarını optimize eder.

**Dosya:** `src/actions/purchasing-analysis.ts` (117 satır)

---

## Özellikler

- ✅ **Geçmiş Analizi:** Son 20 satın alma işlemini analiz
- ✅ **Fiyat Trendi:** Yükseliş/düşüş/stabil trend tespiti
- ✅ **En Ucuz Tedarikçi:** Otomatik en iyi fiyat tespiti
- ✅ **Fiyat Volatilitesi:** Fiyat dalgalanma yüzdesi hesaplama
- ✅ **AI Önerileri:** Gemini ile akıllı satın alma tavsiyeleri
- ✅ **Offline Destek:** AI yoksa kural bazlı öneriler

---

## API Referansı

### `getPurchasingInsights`

```typescript
interface PurchasingInsight {
  summary: string;           // Genel özet
  cheapestSupplier: string;  // En ucuz tedarikçi adı
  bestPrice: number;         // En iyi fiyat
  lastPrice: number;         // Son satın alma fiyatı
  avgPrice: number;          // Ortalama fiyat
  priceVolatility: number;   // Fiyat volatilitesi (%)
  trend: 'up' | 'down' | 'stable';  // Trend yönü
  advice: string;            // AI önerisi
  localAdvice: string;       // Kural bazlı öneri (offline)
  isAiSupported: boolean;    // AI destek aktif mi?
}

async function getPurchasingInsights(
  productId: string
): Promise<{
  success: boolean;
  data?: PurchasingInsight;
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { getPurchasingInsights } from '@/actions/purchasing-analysis';

const result = await getPurchasingInsights('product-123');

if (result.success) {
  const insight = result.data;
  
  console.log(`En iyi fiyat: ${insight.bestPrice} TL`);
  console.log(`Ortalama fiyat: ${insight.avgPrice} TL`);
  console.log(`Trend: ${insight.trend}`);
  console.log(`Volatilite: %${insight.priceVolatility.toFixed(2)}`);
  console.log(`Öneri: ${insight.advice}`);
}
```

---

## Hesaplama Algoritmaları

### Fiyat Volatilitesi

```typescript
// Fiyat volatilitesi hesaplama
const prices = history.map(h => h.netPrice);
const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
const maxPrice = Math.max(...prices);
const minPrice = Math.min(...prices);

const priceVolatility = avgPrice > 0 
  ? ((maxPrice - minPrice) / avgPrice) * 100 
  : 0;

// Örnek:
// Fiyatlar: [100, 105, 98, 102, 110]
// Ortalama: 103
// Max: 110, Min: 98
// Volatilite: ((110 - 98) / 103) × 100 = 11.65%
```

---

### Trend Tespiti

```typescript
let trend: 'up' | 'down' | 'stable' = 'stable';
let localAdvice = "Fiyatlar istikrarlı seyrediyor.";

if (history.length >= 2) {
  const prevPrice = history[1].netPrice;
  const diffPercent = ((lastPurchase.netPrice - prevPrice) / prevPrice) * 100;
  
  if (diffPercent > 2) {
    trend = 'up';
    localAdvice = `Fiyatlar son alımda %${diffPercent.toFixed(1)} arttı. Erken sipariş düşünün.`;
  } else if (diffPercent < -2) {
    trend = 'down';
    localAdvice = `Fiyatlar son alımda %${Math.abs(diffPercent).toFixed(1)} düştü. İyi bir alım zamanı.`;
  }
}

// Threshold: %2 değişim
// - >%2: Yükseliş (up)
// - <-%2: Düşüş (down)
// - ±%2: Stabil (stable)
```

---

### En İyi Fiyat Tespiti

```typescript
// Fiyata göre sırala
const sortedByPrice = [...history].sort((a, b) => a.netPrice - b.netPrice);

// En ucuz satın alma
const bestPurchase = sortedByPrice[0];

// En ucuz tedarikçi
const cheapestSupplier = bestPurchase.supplierName;
const bestPrice = bestPurchase.netPrice;
```

---

## AI Prompt Yapısı

```typescript
const prompt = `
Sen bir satın alma uzmanısın. Aşağıdaki satın alma geçmişi verilerini analiz et 
ve satın alma müdürüne pratik öneriler sun.

### ÜRÜN: ${product.name}

### FİYAT GEÇMİŞİ (Son ${history.length} Alım)
${history.map((h, i) => 
  `${i + 1}. ${h.date.toISOString().split('T')[0]} - ${h.supplierName}: ${h.netPrice} TL`
).join('\n')}

### İSTATİSTİKLER
- En İyi Fiyat: ${bestPrice} TL (${cheapestSupplier})
- Ortalama Fiyat: ${avgPrice.toFixed(2)} TL
- Son Fiyat: ${lastPurchase.netPrice} TL
- Fiyat Volatilitesi: %${priceVolatility.toFixed(2)}
- Trend: ${trend.toUpperCase()}

### ÇIKTI FORMATI
1. DURUM ANALİZİ (Mevcut fiyat durumu)
2. RİSK DEĞERLENDİRMESİ (Fiyat artışı riski)
3. SATIN ALMA ÖNERİSİ (Ne zaman, kimden alınmalı)

ÖNEMLİ:
- Somut, uygulanabilir öneriler ver
- Fiyat artışı öngörüsü varsa erken alım öner
- Volatilite yüksekse (>20%) dikkatli ol uyarısı ver
- Maksimum 3 kısa paragraf
`;
```

---

## Kullanım Senaryoları

### Senaryo 1: Ürün Detay Sayfası

```typescript
// app/products/[id]/purchasing-insight-card.tsx
'use client';

import { useState, useEffect } from 'react';
import { getPurchasingInsights } from '@/actions/purchasing-analysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

export function PurchasingInsightCard({ productId }: { productId: string }) {
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    getPurchasingInsights(productId).then(result => {
      if (result.success) {
        setInsight(result.data);
      }
      setLoading(false);
    });
  }, [productId]);
  
  if (loading) return <LoadingCard />;
  if (!insight) return <NoDataCard />;
  
  const TrendIcon = insight.trend === 'up' 
    ? TrendingUp 
    : insight.trend === 'down' 
    ? TrendingDown 
    : Minus;
  
  const trendColor = insight.trend === 'up' 
    ? 'text-red-600' 
    : insight.trend === 'down' 
    ? 'text-green-600' 
    : 'text-gray-600';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Satın Alma Önerileri
          {insight.isAiSupported && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              AI
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fiyat İstatistikleri */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">En İyi Fiyat</p>
            <p className="text-lg font-bold text-green-600">
              {insight.bestPrice.toLocaleString('tr-TR')} TL
            </p>
            <p className="text-xs text-muted-foreground">
              {insight.cheapestSupplier}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ortalama</p>
            <p className="text-lg font-bold">
              {insight.avgPrice.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Son Fiyat</p>
            <p className={`text-lg font-bold ${trendColor}`}>
              {insight.lastPrice.toLocaleString('tr-TR')} TL
            </p>
            <div className="flex items-center gap-1">
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={`text-xs ${trendColor}`}>
                {insight.trend === 'up' ? 'Yükseliş' : insight.trend === 'down' ? 'Düşüş' : 'Stabil'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Volatilite */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Fiyat Volatilitesi</span>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  insight.priceVolatility > 20 
                    ? 'bg-red-500' 
                    : insight.priceVolatility > 10 
                    ? 'bg-yellow-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(insight.priceVolatility, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              %{insight.priceVolatility.toFixed(1)}
            </span>
          </div>
        </div>
        
        {/* AI Önerisi */}
        <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
            💡 Öneri
          </p>
          <p className="text-sm text-purple-800 dark:text-purple-200">
            {insight.isAiSupported ? insight.advice : insight.localAdvice}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### Senaryo 2: Toplu Satın Alma Raporu

```typescript
// app/purchasing/report/page.tsx
import { prisma } from '@/lib/prisma';
import { getPurchasingInsights } from '@/actions/purchasing-analysis';

export default async function PurchasingReportPage() {
  // Son 30 günde satın alma yapılan ürünleri al
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const purchaseHistory = await prisma.purchaseHistory.findMany({
    where: {
      date: { gte: thirtyDaysAgo }
    },
    distinct: ['productId'],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          code: true
        }
      }
    }
  });
  
  // Her ürün için insight oluştur
  const insights = [];
  for (const record of purchaseHistory) {
    const result = await getPurchasingInsights(record.productId);
    if (result.success) {
      insights.push({
        product: record.product,
        ...result.data
      });
    }
  }
  
  // Yükseliş trendindeki ürünleri vurgula
  const risingProducts = insights.filter(i => i.trend === 'up');
  const highVolatility = insights.filter(i => i.priceVolatility > 20);
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Satın Alma Raporu</h1>
      
      {/* Uyarılar */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
          <h2 className="font-semibold text-red-900 mb-2">
            ⚠️ Yükseliş Trendindeki Ürünler ({risingProducts.length})
          </h2>
          <ul className="text-sm text-red-800 space-y-1">
            {risingProducts.map(i => (
              <li key={i.product.id}>
                • {i.product.name} - Son fiyat: {i.lastPrice} TL
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
          <h2 className="font-semibold text-yellow-900 mb-2">
            📊 Yüksek Volatilite ({highVolatility.length})
          </h2>
          <ul className="text-sm text-yellow-800 space-y-1">
            {highVolatility.map(i => (
              <li key={i.product.id}>
                • {i.product.name} - Volatilite: %{i.priceVolatility.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Detaylı Tablo */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ürün</TableHead>
            <TableHead>En İyi Fiyat</TableHead>
            <TableHead>Ortalama</TableHead>
            <TableHead>Son Fiyat</TableHead>
            <TableHead>Trend</TableHead>
            <TableHead>Volatilite</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {insights.map((i) => (
            <TableRow key={i.product.id}>
              <TableCell className="font-medium">{i.product.name}</TableCell>
              <TableCell className="text-green-600">{i.bestPrice.toLocaleString()} TL</TableCell>
              <TableCell>{i.avgPrice.toLocaleString()} TL</TableCell>
              <TableCell>{i.lastPrice.toLocaleString()} TL</TableCell>
              <TableCell>
                <Badge variant={i.trend === 'up' ? 'destructive' : 'default'}>
                  {i.trend === 'up' ? '↑' : i.trend === 'down' ? '↓' : '→'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        i.priceVolatility > 20 
                          ? 'bg-red-500' 
                          : i.priceVolatility > 10 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(i.priceVolatility, 100)}%` }}
                    />
                  </div>
                  %{i.priceVolatility.toFixed(1)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## Kural Bazlı Öneriler (Offline)

```typescript
// AI yoksa kullanılacak kural bazlı öneriler
let localAdvice = "Fiyatlar istikrarlı seyrediyor.";

if (trend === 'up' && priceVolatility > 15) {
  localAdvice = `Fiyatlar hızla artıyor (volatilite: %${priceVolatility.toFixed(1)}). Acilen sipariş verin.`;
} else if (trend === 'up') {
  localAdvice = `Fiyatlar artıyor. Erken sipariş düşünün.`;
} else if (trend === 'down' && priceVolatility > 15) {
  localAdvice = `Fiyatlar düşüşte ama volatil. Biraz bekleyip izleyin.`;
} else if (trend === 'down') {
  localAdvice = `Fiyatlar düşüyor. Beklemek avantajlı olabilir.`;
} else if (priceVolatility > 20) {
  localAdvice = `Fiyatlar çok dalgalı (%${priceVolatility.toFixed(1)}). Uzun vadeli sözleşme düşünün.`;
}

// Karar matrisi:
// ┌─────────────┬──────────────┬─────────────────────────────────┐
// │ Trend       │ Volatilite   │ Öneri                           │
// ├─────────────┼──────────────┼─────────────────────────────────┤
// │ Yükseliş    │ >%15         │ Acilen sipariş ver              │
// │ Yükseliş    │ <%15         │ Erken sipariş düşün             │
// │ Düşüş       │ >%15         │ Bekle ve izle                   │
// │ Düşüş       │ <%15         │ Beklemek avantajlı              │
// │ Stabil      │ >%20         │ Uzun vadeli sözleşme            │
// │ Stabil      │ <%20         │ Normal sipariş devam            │
// └─────────────┴──────────────┴─────────────────────────────────┘
```

---

## Sorun Giderme

### Hata: "Yeterli satın alma verisi yok"

**Sebep:** Ürün için geçmiş satın alma kaydı bulunamadı.

**Çözüm:**
```typescript
// Minimum 1 satın alma gerekli
if (history.length === 0) {
  return {
    success: false,
    error: 'Analiz için yeterli satın alma verisi bulunmuyor.'
  };
}
```

---

### Hata: "AI önerisi oluşturulamadı"

**Sebep:** API hatası veya timeout.

**Çözüm:**
```typescript
// AI başarısız olursa kural bazlı öneri kullan
try {
  const aiAdvice = await generateAiAdvice(history, stats);
  return { advice: aiAdvice, isAiSupported: true };
} catch (error) {
  console.warn('AI failed, using rule-based advice');
  return { advice: localAdvice, isAiSupported: false };
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/purchasing-analysis.ts` | Ana analiz fonksiyonları |
| `src/app/products/[id]/page.tsx` | Ürün detay (entegrasyon) |
| `prisma/schema.prisma` | PurchaseHistory modeli |

---

## Gelecek Geliştirmeler

- [ ] **Tedarikçi Performansı:** Her tedarikçi için puanlama sistemi
- [ ] **Fiyat Tahmini:** Makine öğrenmesi ile fiyat öngörüsü
- [ ] **Otomatik Sipariş:** Belirli threshold'larda otomatik sipariş
- [ ] **Piyasa Entegrasyonu:** Döviz/emtia fiyatları ile korelasyon
- [ ] **Toplu Alım Önerisi:** Birden fazla ürün için optimize sipariş

---

**Son Güncelleme:** 25 Şubat 2026  
**Durum:** ✅ Dokümante Edildi
