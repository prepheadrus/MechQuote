# MechQuote - Toplu Ürün Eşleştirme ve Öğrenme Sistemi

## 📋 Genel Bakış

MechQuote, mekanik taahhüt firmaları için geliştirilmiş bir mini-ERP sistemidir. Bu belge, **toplu ürün eşleştirme**, **AI-tabanlı öğrenme** ve **yeni ürün oluşturma** özelliklerini detaylandırır.

---

## 🎯 Özellikler

### 1. Toplu Ürün Eşleştirme (Bulk Product Matching)

**Konum:** `src/components/products/bulk-product-matcher.tsx`

#### Özellikler:
- ✅ Otomatik AI-tabanlı eşleştirme
- ✅ Manuel eşleştirme desteği
- ✅ Dialog içinden yeni ürün oluşturma
- ✅ Toplu kaydetme ve işlem takibi
- ✅ Geri bildirim sistemi (Feedback System)

#### Kullanım:
1. Fatura yükleme sonrası otomatik açılır
2. Veya fatura detay sayfasında "Toplu Ürün Eşleştirme" butonuna tıklayın
3. Sistem otomatik olarak eşleştirme yapar (progress bar gösterir)
4. Manuel eşleştirme için kalem simgesine tıklayın
5. Eşleşme yoksa "Yeni Ürün" butonu ile dialog'dan ayrılmadan ürün oluşturun
6. "Seçili Ürünleri Eşleştir" ile kaydedin

---

### 2. AI-Tabanlı Öğrenme Sistemi

**Konum:** `src/actions/matching.ts`, `prisma/schema.prisma` (Feedback modeli)

#### Nasıl Çalışır?

**Adım 1: Manuel Eşleştirme**
```
Kullanıcı: "125 dirsek" → "125*45 PVC Yeni Residence Açık Dirsek" eşleştirir
Sistem: Feedback tablosuna kaydeder:
  - invoiceItemName: "125 dirsek"
  - productId: "xxx"
  - productName: "125*45 PVC Yeni Residence Açık Dirsek"
  - type: "corrected" (veya "approved")
```

**Adım 2: Sonraki Fatura**
```
Yeni fatura: "125 dirsek" kalemi geldi
Sistem:
  1. Feedback tablosuna bakar
  2. "125 dirsek" için daha önce eşleştirilmiş ürün var mı?
  3. EVET! → Otomatik önerir (95% confidence)
  4. Console: "[matchProduct] Using feedback-based match"
```

#### Öğrenme Hiyerarşisi:
```
1. ✅ Feedback-based (Öğrenilmiş)          → 95% confidence
2. ✅ Corrected feedback (Düzeltilmiş)     → 90% confidence
3. ✅ Exact match (Tam eşleşme)            → 100% confidence
4. ✅ Supplier alias (Tedarikçi hafızası)  → Memory
5. ✅ Global alias (Genel hafıza)          → Memory
6. ✅ Fuzzy match (Bulanık eşleşme)        → 60%+ confidence
```

#### İlgili Dosyalar:
- `src/actions/matching.ts` - `matchProduct()` fonksiyonu
- `src/actions/feedback.ts` - Feedback kaydetme ve okuma
- `prisma/schema.prisma` - Feedback modeli

---

### 3. Dialog İçinden Yeni Ürün Oluşturma

**Konum:** `src/components/products/create-product-from-item-dialog.tsx`

#### Özellikler:
- ✅ Dialog'dan ayrılmadan ürün oluşturma
- ✅ Tüm ürün alanları doldurulabilir
- ✅ Otomatik ürün kodu oluşturma
- ✅ Eşleştirme otomatik kaydedilir
- ✅ Checkbox otomatik seçilir

#### Alanlar:
- Ürün Adı (otomatik doldurulur)
- Marka (varsayılan: Firat)
- Model
- Ürün Kodu (otomatik: `AUTO-XXXXXX`)
- Kategori
- Birim Fiyat (TL)
- KDV Oranı (%)
- Birim (Adet, Metre, Kg, Kutu, Takım, Set)

#### Kullanım:
1. "Eşleşme yok" satırında "Yeni Ürün" butonuna tıklayın
2. Form doldurun
3. "Oluştur ve Eşleştir" butonuna tıklayın
4. Ürün oluşturulur, eşleştirilir ve kaydedilir

---

### 4. Ürün Detay Sayfası İyileştirmeleri

**Konum:** `src/app/products/[id]/product-detail-client-page.tsx`, `src/actions/products.ts`

#### Gösterilen Bilgiler:
- ✅ **Birim Alış Fiyatı (Net)**: Son faturadan alınan net fiyat
- ✅ **Son Tedarikçi**: Purchase history'den son tedarikçi adı
- ✅ Liste Fiyatı (Tedarikçi)
- ✅ İskonto Oranı
- ✅ Stok miktarı
- ✅ Teknik özellikler ve açıklama

#### Güncellemeler:
```typescript
// purchase-history-service.ts
await prisma.product.update({
    where: { id: productId },
    data: {
        basePrice: netPrice, // Net alış fiyatı kaydediliyor
        listPrice: item.listPrice || item.unitPrice,
        discountRate: item.discountRate || 0,
        stockQuantity: { increment: item.quantity }
    }
});

// products.ts - getProductDetails
const lastSupplierName = history[0]?.supplierName;
supplierName: supplier?.name || lastSupplierName // Önce supplier, yoksa history
```

---

## 🔧 Teknik Detaylar

### Veritabanı Şeması

#### Feedback Modeli
```prisma
model Feedback {
  id                String   @id @default(uuid())
  invoiceItemId     String
  invoiceItemName   String
  productId         String
  productName       String
  product           Product? @relation(fields: [productId], references: [id])
  type              String   // 'approved' | 'rejected' | 'corrected'
  originalMatchId   String?
  originalMatchName String?
  confidence        Float?
  method            String?
  createdAt         DateTime @default(now())

  @@index([invoiceItemName])
  @@index([productId])
  @@index([type])
}
```

#### PurchaseHistory Modeli
```prisma
model PurchaseHistory {
  id           String   @id @default(uuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  supplierId   String?
  supplierName String?
  date         DateTime
  listPrice    Float
  discountRate Float
  netPrice     Float
  currency     String
  invoiceId    String?
  invoice      Invoice? @relation(fields: [invoiceId], references: [id])
}
```

---

### Önemli Fonksiyonlar

#### `matchProduct(name: string)` - `src/actions/matching.ts`
```typescript
export async function matchProduct(name: string, supplierId?: string | null) {
    // 1. Feedback history kontrolü (ÖĞRENME)
    const feedbackMatch = await prisma.feedback.findFirst({
        where: { invoiceItemName: { equals: normalizedName }, type: 'approved' },
        orderBy: { createdAt: 'desc' },
        include: { product: true }
    });
    if (feedbackMatch) return { product: feedbackMatch.product, method: 'feedback-learning', score: 0.95 };

    // 2. Corrected feedback kontrolü
    const correctedMatch = await prisma.feedback.findFirst({
        where: { invoiceItemName: { equals: normalizedName }, type: 'corrected' },
        orderBy: { createdAt: 'desc' },
        include: { product: true }
    });
    if (correctedMatch) return { product: correctedMatch.product, method: 'feedback-corrected', score: 0.90 };

    // 3. Exact match, alias, fuzzy matching...
}
```

#### `linkInvoiceItemToProduct()` - `src/services/purchase-history-service.ts`
```typescript
export async function linkInvoiceItemToProduct(invoiceItemId: string, productId: string) {
    // 1. Invoice item güncelle
    await prisma.invoiceItem.update({
        where: { id: invoiceItemId },
        data: { linkedProductId: productId }
    });

    // 2. Alias kaydet (hafıza)
    await saveProductAlias(customerId, itemName, productId);

    // 3. Purchase history oluştur/güncelle
    await prisma.purchaseHistory.upsert({...});

    // 4. Ürün fiyatlarını güncelle
    await prisma.product.update({
        where: { id: productId },
        data: {
            basePrice: netPrice, // KRİTİK: Net alış fiyatı
            listPrice: item.listPrice,
            discountRate: item.discountRate,
            stockQuantity: { increment: item.quantity }
        }
    });
}
```

---

## 📊 Console Logları

### Başarılı Eşleştirme
```
[BulkProductMatcher] Auto-match complete: { total: 17, matched: 15, autoSelected: 12 }
[BulkProductMatcher] Starting to save: 12 items
[BulkProductMatcher] Linking item: xxx to product: yyy
[BulkProductMatcher] Link result: { success: true }
[BulkProductMatcher] Complete: { success: 12, fail: 0, matchedItemIds: [...] }
```

### Öğrenme Kontrolü
```
[matchProduct] Using feedback-based match: "125 dirsek" → "125*45 PVC Yeni Residence Açık Dirsek"
[matchProduct] Using corrected match: "125*70 FIRAT TEK ÇATAL" → "..."
```

### Yeni Ürün Oluşturma
```
[BulkProductMatcher] New product created and linked: 125*45 PVC Yeni Residence Açık Dirsek
[CreateProduct] Success: Product created with ID: xxx
```

---

## 🐛 Bilinen Sorunlar ve Çözümler

### Sorun: Ürün detayında "Birim Alış Fiyatı" boş görünüyor
**Çözüm:** `purchase-history-service.ts` dosyasında `basePrice` güncellenmeli:
```typescript
await prisma.product.update({
    where: { id: productId },
    data: { basePrice: netPrice } // EKLENMELİYDİ
});
```

### Sorun: "Son Tedarikçi" boş görünüyor
**Çözüm:** `getProductDetails` fonksiyonunda purchase history'den alınmalı:
```typescript
const lastSupplierName = history[0]?.supplierName;
supplierName: supplier?.name || lastSupplierName // FALLBACK EKLENMELİYDİ
```

### Sorun: Türkçe karakterlerde arama çalışmıyor
**Çözüm:** `toLocaleLowerCase('tr-TR')` ve Unicode normalization kullan:
```typescript
const normalize = (text: string) =>
    text.toLocaleLowerCase('tr-TR')
        .replace(/\u0307/g, '') // Combining dot above kaldır
        .trim();
```

---

## 🚀 Performans İyileştirmeleri

### 1. Cache Mekanizması
```typescript
// products.ts
let productsCache: Product[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

async function getCachedProducts(): Promise<Product[]> {
    const now = Date.now();
    if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return productsCache; // Cache hit
    }
    productsCache = await prisma.product.findMany({ take: 500 });
    cacheTimestamp = now;
    return productsCache;
}
```

### 2. Batch Processing
```typescript
// bulk-product-matcher.tsx
const batchSize = 10;
for (let i = 0; i < invoiceItems.length; i += batchSize) {
    const batch = invoiceItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(...));
    matchResults.push(...batchResults);
}
```

### 3. Debounce
```typescript
// generic-product-matcher.tsx
const timer = setTimeout(search, 150); // 300ms → 150ms
return () => clearTimeout(timer);
```

---

## 📝 Kullanım Senaryoları

### Senaryo 1: Yeni Fatura Yükleme
1. Fatura yükle → Toplu eşleştirme otomatik açılır
2. Sistem 17 kalemi otomatik eşleştirir (15 matched, 2 not found)
3. 2 kalem için "Yeni Ürün" ile ürün oluştur
4. "Tümünü Seç" → "Seçili Ürünleri Eşleştir"
5. ✅ 17/17 eşleştirildi

### Senaryo 2: Sonraki Fatura (Öğrenme)
1. Yeni fatura yükle → Aynı ürünler var
2. Sistem **öğrenilmiş eşleşmeleri** otomatik yapar
3. Console: `[matchProduct] Using feedback-based match`
4. Kullanıcı sadece onaylar → %90 daha hızlı!

### Senaryo 3: Manuel Düzeltme
1. Sistem yanlış eşleştirdi: "125 dirsek" → "125mm Boru"
2. Kalem simgesine tıkla → Doğru ürünü seç: "125*45 Dirsek"
3. "Kaydet ve Öğret"
4. Sistem öğrenir: `[BulkProductMatcher] Manual match saved`
5. Sonraki sefer doğru eşleştirir!

---

## 🔐 Güvenlik ve Veri Bütünlüğü

### Duplicate Prevention
```typescript
const existingHistory = await prisma.purchaseHistory.findFirst({
    where: { invoiceId: item.invoiceId, productId: productId }
});
if (existingHistory) {
    // Update instead of create
}
```

### Error Handling
```typescript
try {
    await linkInvoiceItemToProduct(itemId, productId);
} catch (error) {
    console.error('[LinkProduct] Failed:', error);
    // Non-critical, don't rollback
}
```

---

## 📈 Gelecek İyileştirmeler

- [ ] Supplier ID otomatik oluşturma (yeni tedarikçi ise)
- [ ] Batch feedback kaydetme (toplu kaydetme için)
- [ ] AI confidence skoru gösterme (UI'da)
- [ ] Ürün eşleşme geçmişi (timeline view)
- [ ] Alternatif ürün önerileri (similar products)

---

## 📞 Destek ve İletişim

**Geliştirici:** MechQuote Team  
**Versiyon:** 1.02  
**Son Güncelleme:** 2026-02-22

**Önemli Dosyalar:**
- `src/components/products/bulk-product-matcher.tsx`
- `src/components/products/create-product-from-item-dialog.tsx`
- `src/actions/matching.ts`
- `src/actions/feedback.ts`
- `src/services/purchase-history-service.ts`
- `src/actions/products.ts`
- `prisma/schema.prisma`
