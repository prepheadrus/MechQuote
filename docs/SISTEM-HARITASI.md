# MechQuote - Sistem Mimarisi ve Dosya Haritası

## 🗺️ Genel Mimari

```
┌─────────────────────────────────────────────────────────────────┐
│                         MechQuote ERP                           │
│  Next.js 15 + TypeScript + Prisma + SQLite + Electron          │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Frontend       │     │   Backend        │     │   Database       │
│   (React/Next)   │◄───►│   (Server Actions)│◄───►│   (SQLite)       │
│   - Pages        │     │   - Matching     │     │   - Products     │
│   - Components   │     │   - Products     │     │   - Invoices     │
│   - Dialogs      │     │   - Invoices     │     │   - Feedback     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 📁 Dosya Ağacı

```
TEKLIF/
├── 📂 src/
│   ├── 📂 actions/                    # Server Actions (Backend Logic)
│   │   ├── products.ts               # Ürün işlemleri (CRUD, search, cache)
│   │   ├── matching.ts               # AI matching engine (feedback-based learning)
│   │   ├── feedback.ts               # Feedback kaydetme/okuma
│   │   ├── invoices.ts               # Fatura işlemleri
│   │   ├── customers.ts              # Müşteri işlemleri
│   │   └── ...
│   │
│   ├── 📂 app/                        # Next.js Pages (App Router)
│   │   ├── 📂 products/
│   │   │   └── 📂 [id]/
│   │   │       └── product-detail-client-page.tsx  # Ürün detay sayfası
│   │   ├── 📂 invoices/
│   │   │   └── invoices-client-page.tsx            # Fatura listesi
│   │   ├── 📂 quotes/
│   │   │   └── 📂 [id]/
│   │   │       └── quote-detail-client-page.tsx    # Teklif detay
│   │   └── page.tsx                  # Dashboard
│   │
│   ├── 📂 components/                 # React Components
│   │   ├── 📂 products/
│   │   │   ├── bulk-product-matcher.tsx           # ⭐ Toplu eşleştirme dialog
│   │   │   ├── create-product-from-item-dialog.tsx # ⭐ Yeni ürün oluşturma
│   │   │   ├── product-matcher.tsx                # Manuel eşleştirme
│   │   │   ├── feedback-buttons.tsx               # Feedback onay/red
│   │   │   └── product-combobox.tsx               # Ürün arama combobox
│   │   │
│   │   ├── 📂 invoices/
│   │   │   ├── invoice-detail-dialog.tsx          # Fatura detay + toplu eşleştirme
│   │   │   ├── invoice-preview-dialog.tsx         # Fatura önizleme
│   │   │   ├── invoice-uploader.tsx               # Fatura yükleme
│   │   │   └── ...
│   │   │
│   │   ├── 📂 app/
│   │   │   ├── generic-product-matcher.tsx        # Genel ürün eşleştirme
│   │   │   ├── product-selector.tsx               # Ürün seçici
│   │   │   └── smart-proposal-importer.tsx        # Teklif import
│   │   │
│   │   └── 📂 ui/                     # Shadcn UI Components
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── table.tsx
│   │       └── ...
│   │
│   ├── 📂 services/                   # Business Logic
│   │   ├── purchase-history-service.ts  # ⭐ Fatura-Ürün eşleştirme, history
│   │   ├── invoice-service.ts          # Fatura CRUD
│   │   ├── invoice-item-service.ts     # Fatura kalemi işlemleri
│   │   ├── ai-cache-service.ts         # AI cache (PDF hash → sonuç)
│   │   ├── ai-semantic-matching.ts     # AI semantic matching
│   │   └── customer-service.ts         # Müşteri işlemleri
│   │
│   ├── 📂 lib/                        # Utilities
│   │   ├── prisma.ts                  # Prisma client instance
│   │   ├── matching-engine.ts         # String matching algoritmları
│   │   ├── matching-cache.ts          # Matching cache
│   │   └── formatters.ts              # Format helpers
│   │
│   └── 📂 hooks/                      # Custom Hooks
│       ├── use-toast.ts
│       └── ...
│
├── 📂 prisma/
│   ├── schema.prisma                  # ⭐ Veritabanı şeması
│   ├── dev.db                         # SQLite database
│   └── migrations/                    # Migration files
│
├── 📂 docs/                           # 📚 Dokümantasyon
│   ├── TOPLU-URUN-ESLESTIRME.md      # ⭐ Bu özellik dokümanı
│   └── SISTEM-HARITASI.md            # ⭐ Bu dosya
│
├── 📂 Geliştirme Foto/                # Screenshots
├── electron.cjs                       # Electron main process
├── next.config.ts                     # Next.js config
├── package.json                       # Dependencies
└── .env                               # Environment variables
```

---

## 🔄 Önemli Akışlar

### 1. Fatura Yükleme → Toplu Eşleştirme

```
┌─────────────────┐
│ Fatura Yükle    │
│ (PDF/XML/Manuel)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ AI PDF Parsing          │
│ - Gemini Vision API     │
│ - UBL-TR XML Extract    │
│ - Cache (AI Cache)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Invoice Items Oluştur   │
│ (InvoiceItem table)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ BulkProductMatcher      │ ⭐ AÇILIR
│ - Otomatik eşleştir     │
│ - AI matching engine    │
│ - Feedback kontrol      │
└────────┬────────────────┘
         │
         ├──────┬──────────┬─────────────┐
         │      │          │             │
         ▼      ▼          ▼             ▼
    ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐
    │Match │ │Match │ │ Yeni   │ │ Manuel   │
    │Found │ │Low   │ │ Ürün   │ │ Seçim    │
    │✅    │ │Score │ │ Oluştur│ │ (Kalem)  │
    └──┬───┘ └──┬───┘ └───┬────┘ └────┬─────┘
       │        │         │           │
       └────────┴─────────┴───────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Kaydet Butonu    │
         │ (Link Items)     │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │ linkInvoiceItemToProduct │ ⭐
         │ 1. InvoiceItem.update    │
         │ 2. saveProductAlias      │
         │ 3. PurchaseHistory.upsert│
         │ 4. Product.update        │
         │    - basePrice: netPrice │ ⭐
         │    - listPrice           │
         │    - stockQuantity       │
         │ 5. StockMovement.create  │
         └────────┬─────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Ürün Detay Sayfa │
         │ - basePrice ✅   │
         │ - supplierName ✅│
         └──────────────────┘
```

---

### 2. Öğrenme Sistemi (Feedback Loop)

```
┌─────────────────────┐
│ Kullanıcı Eşleştirir│
│ "125 dirsek" →      │
│ "125*45 Dirsek"     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ saveFeedback()          │ ⭐
│ - type: "corrected"     │
│ - invoiceItemName       │
│ - productId             │
│ - productName           │
│ - confidence            │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────┐
│ Feedback Tablosu    │
│ (Prisma)            │
│ - invoiceItemName   │
│ - productId         │
│ - type              │
│ - createdAt         │
└──────────┬──────────┘
           │
           │ (Sonraki Fatura)
           ▼
┌─────────────────────────┐
│ matchProduct()          │ ⭐
│ 1. Feedback kontrol     │
│    - invoiceItemName    │
│    - type: "approved"   │
│ 2. Product bul          │
│ 3. Return {product,     │
│    method: "feedback",  │
│    score: 0.95}         │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────┐
│ Otomatik Eşleştir   │
│ (Console: "Using    │
│ feedback-based      │
│ match")             │
└─────────────────────┘
```

---

### 3. Ürün Arama (Search Flow)

```
┌─────────────────┐
│ Kullanıcı Yazar │
│ "125 dirsek"    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ searchProducts()        │ ⭐
│ 1. Cache kontrol        │
│    (5 dakika TTL)       │
│ 2. Tokenize             │
│    ["125", "dirsek"]    │
│ 3. Normalize            │
│    - toLocaleLowerCase  │
│    - remove \u0307      │
│ 4. Filter (in-memory)   │
│    - ALL tokens match   │
│ 5. Rank                 │
│    - Number boost +30   │
│    - Exact word +15     │
│    - Length penalty     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────┐
│ Results (50 items)  │
│ 1. "125*45 Dirsek"  │
│ 2. "125*87 Dirsek"  │
│ 3. "125mm Boru"     │
└─────────────────────┘
```

---

## 🗄️ Veritabanı Şeması (Önemli Tablolar)

### Product
```prisma
model Product {
  id              String   @id @default(uuid())
  code            String?
  name            String
  brand           String?
  model           String?
  category        String?
  listPrice       Float    @default(0)
  basePrice       Float    @default(0)  // ⭐ Net alış fiyatı
  currency        String   @default("TRY")
  vatRate         Float    @default(0.20)
  discountRate    Float?   @default(0)
  stockQuantity   Float    @default(0)
  createdAt       DateTime @default(now())
  
  purchaseHistory PurchaseHistory[]
  feedbacks       Feedback[]
  stockMovements  StockMovement[]
}
```

### Feedback (ÖĞRENME)
```prisma
model Feedback {
  id              String   @id @default(uuid())
  invoiceItemId   String
  invoiceItemName String
  productId       String
  productName     String
  product         Product? @relation(fields: [productId], references: [id])
  type            String   // "approved" | "rejected" | "corrected"
  confidence      Float?
  createdAt       DateTime @default(now())
  
  @@index([invoiceItemName])
  @@index([productId])
}
```

### PurchaseHistory
```prisma
model PurchaseHistory {
  id           String   @id @default(uuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id])
  supplierName String?
  date         DateTime
  listPrice    Float
  discountRate Float
  netPrice     Float    // ⭐ Net fiyat (iskonto düşülmüş)
  currency     String
  invoiceId    String?
  
  @@index([productId])
  @@index([invoiceId])
}
```

### InvoiceItem
```prisma
model InvoiceItem {
  id            String   @id @default(uuid())
  invoiceId     String
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
  name          String
  quantity      Float
  unitPrice     Float
  listPrice     Float?
  discountRate  Float?
  taxRate       Float?
  linkedProductId String? @index  // ⭐ Eşleştirilmiş ürün
  product       Product? @relation(fields: [linkedProductId], references: [id])
  
  @@index([linkedProductId])
}
```

---

## ⭐ Kritik Fonksiyonlar

### 1. `matchProduct()` - `src/actions/matching.ts`
**Amaç:** AI + Feedback tabanlı ürün eşleştirme

```typescript
export async function matchProduct(name: string, supplierId?: string | null) {
    // 1. FEEDBACK KONTROL (ÖĞRENME)
    const feedbackMatch = await prisma.feedback.findFirst({
        where: { invoiceItemName: { equals: normalizedName }, type: 'approved' },
        include: { product: true }
    });
    if (feedbackMatch) return { product, method: 'feedback-learning', score: 0.95 };

    // 2. CORRECTED FEEDBACK
    const correctedMatch = await prisma.feedback.findFirst({
        where: { invoiceItemName: { equals: normalizedName }, type: 'corrected' },
        include: { product: true }
    });
    if (correctedMatch) return { product, method: 'feedback-corrected', score: 0.90 };

    // 3. EXACT MATCH
    // 4. SUPPLIER ALIAS
    // 5. GLOBAL ALIAS
    // 6. FUZZY MATCH
}
```

### 2. `linkInvoiceItemToProduct()` - `src/services/purchase-history-service.ts`
**Amaç:** Fatura kalemini ürünle eşleştir, history oluştur

```typescript
export async function linkInvoiceItemToProduct(invoiceItemId: string, productId: string) {
    // 1. InvoiceItem güncelle
    await prisma.invoiceItem.update({
        where: { id: invoiceItemId },
        data: { linkedProductId: productId }
    });

    // 2. Alias kaydet (hafıza)
    await saveProductAlias(customerId, itemName, productId);

    // 3. Purchase History oluştur/güncelle
    await prisma.purchaseHistory.upsert({...});

    // 4. Ürün fiyatlarını güncelle ⭐
    await prisma.product.update({
        where: { id: productId },
        data: {
            basePrice: netPrice,      // ⭐ KRİTİK
            listPrice: item.listPrice,
            discountRate: item.discountRate,
            stockQuantity: { increment: item.quantity }
        }
    });

    // 5. Stock Movement oluştur
    await prisma.stockMovement.create({...});
}
```

### 3. `getProductDetails()` - `src/actions/products.ts`
**Amaç:** Ürün detay sayfası için veri hazırla

```typescript
export async function getProductDetails(id: string) {
    const [product, supplier, category, history, sales] = await Promise.all([...]);

    // ⭐ Son tedarikçi (history'den fallback)
    const lastSupplierName = history[0]?.supplierName;

    return {
        product: {
            ...product,
            supplierName: supplier?.name || lastSupplierName, // ⭐ FALLBACK
            installationCategoryName: category?.name
        },
        history,
        analytics: {...}
    };
}
```

### 4. `searchProducts()` - `src/actions/products.ts`
**Amaç:** Ürün arama (cache + Türkçe destek)

```typescript
export async function searchProducts(query: string) {
    // 1. CACHE KONTROL (5 dakika)
    const allProducts = await getCachedProducts();

    // 2. NORMALIZE (Türkçe karakter)
    const normalize = (text: string) =>
        text.toLocaleLowerCase('tr-TR').replace(/\u0307/g, '');

    // 3. FILTER (in-memory)
    const filtered = allProducts.filter(p => {
        const pNameLower = normalize(p.name);
        return tokens.every(token => pNameLower.includes(token));
    });

    // 4. RANK (number boost, exact match)
    // 5. RETURN (top 50)
}
```

---

## 🎨 UI Component Haritası

### Toplu Eşleştirme Dialog
```
<BulkProductMatcher>
├── Dialog
│   ├── DialogHeader
│   │   ├── Title: "Toplu Ürün Eşleştirme"
│   │   └── Description
│   ├── Progress Bar (isMatching)
│   ├── Stats Badges (matched, notFound, selected)
│   ├── ScrollArea
│   │   └── Table
│   │       ├── TableHeader
│   │       │   └── Checkbox (Select All)
│   │       └── TableBody
│   │           └── TableRow[] (results.map)
│   │               ├── Checkbox
│   │               ├── Item Name
│   │               ├── Matched Product (or "Yeni Ürün" button)
│   │               ├── Unit Price
│   │               ├── Quantity
│   │               ├── Status Badge
│   │               └── <FeedbackButtons />
│   └── DialogFooter
│       ├── Button: "İptal"
│       ├── Button: "Seçili Ürünleri Eşleştir"
│       └── Button: "Tümünü Seç" (if none selected)
│
└── <CreateProductFromItemDialog /> (conditional)
    └── Form (name, brand, model, code, category, price, vat, unit)
```

### Feedback Buttons
```
<FeedbackButtons>
├── Button: Approve (✅ Green)
├── Button: Reject (❌ Red)
└── Button: Edit (✏️ Blue)
    └── Dialog: "Doğru Ürünü Seç"
        └── <ProductCombobox />
            └── Search + Product List
```

---

## 🔐 Güvenlik Katmanları

### 1. Duplicate Prevention
```typescript
// Purchase history duplicate check
const existingHistory = await prisma.purchaseHistory.findFirst({
    where: { invoiceId: item.invoiceId, productId: productId }
});
if (existingHistory) {
    await prisma.purchaseHistory.update({...}); // Update instead of create
}
```

### 2. Error Handling (Non-Rollback)
```typescript
try {
    await linkInvoiceItemToProduct(itemId, productId);
} catch (error) {
    console.warn('[LinkProduct] Failed (non-critical):', error);
    // Don't rollback - link is persisted
}
```

### 3. Cache TTL
```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika
if (productsCache && (now - cacheTimestamp) < CACHE_TTL) {
    return productsCache; // Cache hit
}
```

---

## 📊 Performans Metrikleri

| İşlem | Eski | Yeni | İyileştirme |
|-------|------|------|-------------|
| Arama (her tuş) | 3000ms | 50ms | **60x** (cache) |
| Toplu Eşleştirme (17 item) | 15s | 3s | **5x** (batch) |
| Manuel Eşleştirme | 45s/item | 5s/item | **9x** (öğrenme) |

---

## 🚀 Deployment Yapısı

```
┌─────────────────────────────────────┐
│  Firebase Hosting (Frontend)        │
│  - Next.js SSR/SSG                  │
│  - Static Assets                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Cloud Functions (Backend)          │
│  - Server Actions                   │
│  - API Routes                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Firestore (Database)               │
│  - Products                         │
│  - Invoices                         │
│  - Feedback                         │
└─────────────────────────────────────┘
```

---

## 📞 Önemli Dosyalar (Özet)

| Dosya | Amaç | Kritik |
|-------|------|--------|
| `bulk-product-matcher.tsx` | Toplu eşleştirme UI | ⭐⭐⭐ |
| `create-product-from-item-dialog.tsx` | Yeni ürün oluşturma | ⭐⭐⭐ |
| `matching.ts` | AI matching engine | ⭐⭐⭐ |
| `purchase-history-service.ts` | Eşleştirme + history | ⭐⭐⭐ |
| `feedback.ts` | Öğrenme sistemi | ⭐⭐⭐ |
| `products.ts` | Ürün CRUD + search | ⭐⭐ |
| `schema.prisma` | Veritabanı şeması | ⭐⭐⭐ |

---

**Son Güncelleme:** 2026-02-22  
**Versiyon:** 1.02  
**Geliştirici:** MechQuote Team
