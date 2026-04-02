# Ürün Birleştirme ve Bakım Sistemi (Product Merge & Maintenance)

## Genel Bakış

MechQuote'un bakım ve ürün birleştirme sistemi, veritabanındaki duplike kayıtları tespit eder, birleştirir ve müşteri bakiyelerinin doğruluğunu sağlar. Bu sistem, veri bütünlüğünü korumak ve muhasebe tutarlılığını sağlamak için kritik öneme sahiptir.

**Dosya:** `src/actions/maintenance.ts` (300+ satır)

---

## Özellikler

- ✅ **Duplike Ürün Tespiti:** Normalize edilmiş isim bazlı çift kayıt tespiti
- ✅ **Ürün Birleştirme:** Duplike ürünleri tek master üründe birleştirme
- ✅ **Müşteri Bakiye Mutabakatı:** Invoice ve Proposal'lardan otomatik bakiye hesaplama
- ✅ **Tam Sıfırlama:** Tüm transaction'ları silip baştan oluşturma (nuclear option)
- ✅ **Transaction Safety:** Tüm işlemler Prisma transaction ile korunur
- ✅ **Detaylı Logging:** Her adım detaylı loglanır

---

## Teknik Mimari

```
┌──────────────────────────────────────────────────────────────┐
│  maintenance.ts                                               │
├──────────────────────────────────────────────────────────────┤
│  findDuplicateProducts()                                      │
│  ├── Tüm ürünleri getir (invoiceItems, proposalItems, etc.)  │
│  ├── İsimleri normalize et (lowercase, trim, remove punct.)  │
│  ├── Normalize isimlere göre grupla                          │
│  ├── 1'den fazla ürün olan grupları bul                      │
│  └── DuplicateGroup[] döndür                                 │
├──────────────────────────────────────────────────────────────┤
│  mergeProducts(masterId, duplicateIds)                        │
│  ├── Prisma transaction başlat                               │
│  ├── InvoiceItems'i master'a taşı                            │
│  ├── ProposalItems'i master'a taşı                           │
│  ├── PurchaseHistory'i master'a taşı                         │
│  ├── Duplike ürünleri sil                                    │
│  └── /products sayfasını revalidate et                       │
├──────────────────────────────────────────────────────────────┤
│  reconcileCustomerBalances()                                  │
│  ├── Mevcut transaction reference'leri topla                 │
│  ├── Invoice'ları tara (Outgoing=Debt, Incoming=Credit)      │
│  ├── Proposal'ları tara (Approved=Debt)                      │
│  ├── Eksik transaction'ları oluştur                          │
│  ├── Tüm müşterilerin bakiyesini yeniden hesapla             │
│  └── Fark varsa güncelle                                     │
├──────────────────────────────────────────────────────────────┤
│  fullReconcileCustomerBalances()                              │
│  ├── Prisma transaction başlat                               │
│  ├── TÜM müşteri bakiyelerini 0'la                           │
│  ├── TÜM customer transaction'ları sil (DELETE ALL)          │
│  ├── Tüm invoice'lardan transaction oluştur                  │
│  ├── Tüm approved proposal'lardan transaction oluştur        │
│  └── Bakiyeleri transaction'lardan hesapla                   │
└──────────────────────────────────────────────────────────────┘
```

---

## API Referansı

### `findDuplicateProducts`

Duplike ürünleri tespit eder.

```typescript
async function findDuplicateProducts(): Promise<{
  success: boolean;
  data?: DuplicateGroup[];
  error?: string;
}>

interface DuplicateGroup {
  name: string;        // Grup adı (ilk ürünün adı)
  products: any[];     // Duplike ürünler
}
```

**Kullanım Örneği:**

```typescript
import { findDuplicateProducts } from '@/actions/maintenance';

const result = await findDuplicateProducts();

if (result.success) {
  console.log(result.data);
  // [
  //   {
  //     name: "VIESMANN VITODENS 200-W 26 kW",
  //     products: [
  //       { id: '1', name: 'VIESMANN VITODENS 200-W 26 kW', ... },
  //       { id: '2', name: 'Viesmann Vitodens 200W 26kW', ... },
  //       { id: '3', name: 'Vitodens 200-W 26kW', ... }
  //     ]
  //   }
  // ]
}
```

---

### `mergeProducts`

Duplike ürünleri master üründe birleştirir.

```typescript
async function mergeProducts(
  masterId: string,       // Master ürün ID
  duplicateIds: string[]  // Silinecek duplike ID'ler
): Promise<{
  success: boolean;
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { mergeProducts } from '@/actions/maintenance';

// En eski ürünü master olarak seç
const masterId = 'product-oldest-id';
const duplicateIds = ['product-new-1', 'product-new-2'];

const result = await mergeProducts(masterId, duplicateIds);

if (result.success) {
  toast.success('Ürünler başarıyla birleştirildi');
} else {
  toast.error(result.error);
}
```

---

### `reconcileCustomerBalances`

Müşteri bakiyelerini mutabakat yapar (ekleme modu).

```typescript
async function reconcileCustomerBalances(): Promise<{
  success: boolean;
  logs?: string[];
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { reconcileCustomerBalances } from '@/actions/maintenance';

const result = await reconcileCustomerBalances();

if (result.success) {
  console.log(result.logs);
  // [
  //   "Reconciliation started.",
  //   "Found 1523 existing transactions.",
  //   "Created 12 missing transactions from Invoices.",
  //   "Created 3 missing transactions from Proposals.",
  //   "Updated balance for ABC Ltd.: 15000 -> 18500",
  //   "Reconciliation completed successfully."
  // ]
}
```

---

### `fullReconcileCustomerBalances`

Tüm bakiyeleri sıfırlayıp baştan hesaplar (NUCLEAR OPTION).

```typescript
async function fullReconcileCustomerBalances(): Promise<{
  success: boolean;
  logs?: string[];
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { fullReconcileCustomerBalances } from '@/actions/maintenance';

// ⚠️ DİKKAT: Bu işlem TÜM transaction'ları siler!
const result = await fullReconcileCustomerBalances();

if (result.success) {
  console.log(result.logs);
  // [
  //   "Full reconciliation started.",
  //   "All customer balances reset to 0.",
  //   "Deleted 5432 existing transactions.",
  //   "Created 2341 transactions from invoices.",
  //   "Created 156 transactions from proposals.",
  //   "Full reconciliation completed successfully."
  // ]
}
```

---

## Duplikasyon Tespit Algoritması

### İsim Normalizasyonu

```typescript
// Ürün ismini normalize et
const normalized = productName
  .trim()                      // Baş/son boşlukları sil
  .toLowerCase()               // Küçük harf
  .replace(/\s+/g, ' ')        // Çoklu boşlukları tek boşluk yap
  .replace(/[.,-]/g, '');      // Nokta, virgül, tire kaldır

// Örnekler:
"VIESMANN VITODENS 200-W 26 kW"     → "viesmann vitodens 200w 26 kw"
"Viesmann Vitodens 200W 26kW"       → "viesmann vitodens 200w 26 kw"
"Vitodens 200-W (26kW)"             → "vitodens 200w 26kw"

// Bu üçü de AYNI normalize edilmiş isme sahip → DUPLICATE!
```

---

### Gruplama Mantığı

```typescript
// Gruplama örneği
const groups = {
  "viesmann vitodens 200w 26 kw": [
    { id: '1', name: 'VIESMANN VITODENS 200-W 26 kW' },
    { id: '2', name: 'Viesmann Vitodens 200W 26kW' },
    { id: '3', name: 'Vitodens 200-W 26kW' }
  ],
  "boru 2 inch pprc": [
    { id: '4', name: 'Boru 2" PP-R' },
    { id: '5', name: 'PPRC Boru 2 inch' }
  ]
};

// Sadece 1'den fazla ürün olan gruplar duplicate olarak döndürülür
const duplicates = [
  { name: "VIESMANN VITODENS 200-W 26 kW", products: [...] },
  { name: "Boru 2\" PP-R", products: [...] }
];
```

---

## Ürün Birleştirme Süreci

### Adım Adım Birleştirme

```
Başlangıç Durumu:
─────────────────────────────────────────────────────────
Master Ürün: { id: 'master', name: 'VIESMANN VITODENS 200-W 26 kW' }
Duplikeler:  [
  { id: 'dup1', name: 'Viesmann Vitodens 200W 26kW' },
  { id: 'dup2', name: 'Vitodens 200-W 26kW' }
]

İlişkiler:
- InvoiceItem-1 → dup1
- InvoiceItem-2 → dup2
- ProposalItem-1 → master
- PurchaseHistory-1 → dup1
─────────────────────────────────────────────────────────

Adım 1: InvoiceItems'i Taşı
─────────────────────────────────────────────────────────
UPDATE InvoiceItem 
SET linkedProductId = 'master' 
WHERE linkedProductId IN ('dup1', 'dup2')

Sonuç:
- InvoiceItem-1 → master ✅
- InvoiceItem-2 → master ✅
─────────────────────────────────────────────────────────

Adım 2: ProposalItems'i Taşı
─────────────────────────────────────────────────────────
UPDATE ProposalItem 
SET productId = 'master' 
WHERE productId IN ('dup1', 'dup2')

Sonuç:
- ProposalItem-1 → master ✅ (zaten master'dı)
─────────────────────────────────────────────────────────

Adım 3: PurchaseHistory'yi Taşı
─────────────────────────────────────────────────────────
UPDATE PurchaseHistory 
SET productId = 'master' 
WHERE productId IN ('dup1', 'dup2')

Sonuç:
- PurchaseHistory-1 → master ✅
─────────────────────────────────────────────────────────

Adım 4: Duplike Ürünleri Sil
─────────────────────────────────────────────────────────
DELETE FROM Product WHERE id IN ('dup1', 'dup2')

Sonuç:
- dup1 silindi ✅
- dup2 silindi ✅
- Sadece master kaldı ✅
─────────────────────────────────────────────────────────

Bitiş Durumu:
─────────────────────────────────────────────────────────
Master Ürün: { id: 'master', name: 'VIESMANN VITODENS 200-W 26 kW' }
Tüm İlişkiler: Master'a taşındı ✅
─────────────────────────────────────────────────────────
```

---

## Müşteri Bakiye Mutabakatı

### Transaction Türleri

```typescript
// Invoice türleri
Outgoing Invoice (Satış Faturası):
  → type: 'Debt' (Müşteri bize borçlu)
  → amount: +10,000 TL (pozitif)
  → category: 'Sales'

Incoming Invoice (Alış Faturası):
  → type: 'Credit' (Biz tedarikçiye borçluyuz)
  → amount: -5,000 TL (negatif)
  → category: 'Purchase'

// Proposal türleri
Approved Proposal (Onaylı Teklif):
  → type: 'Debt' (Müşteri bize borçlu)
  → amount: +15,000 TL (pozitif)
  → category: 'Sales'
```

---

### Bakiye Hesaplama

```typescript
// Müşteri bakiyesi = Tüm transaction'ların toplamı
const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

// Pozitif bakiye (+): Müşteri şirkete borçlu (Alacak)
// Negatif bakiye (-): Şirket müşteriye borçlu (Borç)

Örnek:
─────────────────────────────────────────────────────────
Transaction'lar:
1. Outgoing Invoice: +10,000 TL (Debt)
2. Payment Received: -5,000 TL (Credit - ödeme)
3. Approved Proposal: +15,000 TL (Debt)
4. Incoming Invoice: -3,000 TL (Credit - alış)

Toplam Bakiye: 10,000 - 5,000 + 15,000 - 3,000 = 17,000 TL

Sonuç: Müşteri şirkete 17,000 TL borçlu
─────────────────────────────────────────────────────────
```

---

## Kullanım Senaryoları

### Senaryo 1: Duplike Ürün Yönetimi UI

```typescript
// components/maintenance/merge-products-dialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  findDuplicateProducts, 
  mergeProducts 
} from '@/actions/maintenance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function MergeProductsDialog() {
  const [open, setOpen] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [masterIds, setMasterIds] = useState({});
  const [loading, setLoading] = useState(false);
  
  const fetchDuplicates = async () => {
    const result = await findDuplicateProducts();
    if (result.success) {
      setDuplicates(result.data);
    }
  };
  
  const handleMerge = async (group: DuplicateGroup) => {
    const masterId = masterIds[group.name];
    if (!masterId) {
      toast.error('Lütfen master ürün seçin');
      return;
    }
    
    const duplicateIds = group.products
      .filter(p => p.id !== masterId)
      .map(p => p.id);
    
    setLoading(true);
    const result = await mergeProducts(masterId, duplicateIds);
    setLoading(false);
    
    if (result.success) {
      toast.success('Ürünler birleştirildi');
      fetchDuplicates(); // Refresh list
    } else {
      toast.error(result.error);
    }
  };
  
  return (
    <div>
      <Button onClick={() => {
        fetchDuplicates();
        setOpen(true);
      }}>
        Duplike Ürünleri Yönet
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Duplike Ürün Birleştirme</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {duplicates.map((group, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  {group.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {group.products.length} duplike ürün bulundu
                </p>
                
                <RadioGroup
                  value={masterIds[group.name]}
                  onValueChange={(value) => {
                    setMasterIds({
                      ...masterIds,
                      [group.name]: value
                    });
                  }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Seç</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead>Kod</TableHead>
                        <TableHead>Kullanım</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <RadioGroupItem value={product.id} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.code || '-'}</TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              Invoice: {product._count?.invoiceItems || 0} |
                              Proposal: {product._count?.proposalItems || 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </RadioGroup>
                
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => handleMerge(group)}
                  disabled={loading || !masterIds[group.name]}
                >
                  {loading ? 'Birleştiriliyor...' : 'Birleştir'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

### Senaryo 2: Bakiye Mutabakat Raporu

```typescript
// app/admin/reconciliation/page.tsx
'use client';

import { useState } from 'react';
import { 
  reconcileCustomerBalances,
  fullReconcileCustomerBalances 
} from '@/actions/maintenance';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export default function ReconciliationPage() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [complete, setComplete] = useState(false);
  
  const handleReconcile = async () => {
    setLoading(true);
    setLogs([]);
    setComplete(false);
    
    const result = await reconcileCustomerBalances();
    
    if (result.success) {
      setLogs(result.logs || []);
      setComplete(true);
    } else {
      setLogs([`Hata: ${result.error}`]);
    }
    
    setLoading(false);
  };
  
  const handleFullReconcile = async () => {
    if (!confirm('⚠️ DİKKAT: Bu işlem TÜM transaction kayıtlarını silecek!\n\nDevam etmek istediğinize emin misiniz?')) {
      return;
    }
    
    setLoading(true);
    setLogs([]);
    setComplete(false);
    
    const result = await fullReconcileCustomerBalances();
    
    if (result.success) {
      setLogs(result.logs || []);
      setComplete(true);
    } else {
      setLogs([`Hata: ${result.error}`]);
    }
    
    setLoading(false);
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Müşteri Bakiye Mutabakatı</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Standart Mutabakat</CardTitle>
            <CardDescription>
              Eksik transaction'ları ekler, mevcut bakiyeleri düzeltir.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Mevcut kayıtlar korunur, sadece eksikler eklenir.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleReconcile} 
              disabled={loading}
              className="w-full"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Mutabakat Yap'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tam Sıfırlama</CardTitle>
            <CardDescription>
              TÜM transaction'ları silip baştan oluşturur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                ⚠️ Tüm transaction kayıtları silinecek! Sadece ciddi veri bozukluklarında kullanın.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={handleFullReconcile} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Tam Sıfırlama'}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {(logs.length > 0 || complete) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>İşlem Günlüğü</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg font-mono text-sm max-h-96 overflow-auto">
              {logs.map((log, i) => (
                <div key={i} className="py-1">
                  <span className="text-muted-foreground">[{i + 1}]</span> {log}
                </div>
              ))}
              {complete && (
                <div className="mt-4 pt-4 border-t text-green-600 font-semibold">
                  ✅ İşlem başarıyla tamamlandı
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

## Sorun Giderme

### Hata: "Ürünler birleştirilirken hata oluştu"

**Sebep:** Foreign key constraint veya transaction hatası.

**Çözüm:**
```typescript
// Hangi ilişkilerin olduğunu kontrol et
const checkRelations = async (productIds: string[]) => {
  const [invoiceItems, proposalItems, purchaseHistory] = await Promise.all([
    prisma.invoiceItem.count({ where: { linkedProductId: { in: productIds } } }),
    prisma.proposalItem.count({ where: { productId: { in: productIds } } }),
    prisma.purchaseHistory.count({ where: { productId: { in: productIds } } })
  ]);
  
  console.log({
    invoiceItems,
    proposalItems,
    purchaseHistory
  });
};
```

---

### Hata: "Bakiye mutabakatı başarısız"

**Sebep:** Transaction sırasında bir invoice/proposal bozuk.

**Çözüm:**
```typescript
// Her invoice/proposal'ı ayrı ayrı işle ve hataları logla
for (const invoice of invoices) {
  try {
    // Create transaction
  } catch (error) {
    console.error(`Invoice ${invoice.id} failed:`, error);
    logs.push(`⚠️ Invoice ${invoice.invoiceNumber} skipped: ${error.message}`);
  }
}
```

---

### Performans: Çok yavaş çalışıyor

**Sebep:** Binlerce invoice/proposal tek tek işleniyor.

**Çözüm:**
```typescript
// Batch processing kullan
const BATCH_SIZE = 100;

for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
  const batch = invoices.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
  console.log(`Processed ${Math.min(i + BATCH_SIZE, invoices.length)} / ${invoices.length}`);
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/maintenance.ts` | Ana maintenance fonksiyonları |
| `src/app/products/page.tsx` | Ürün listesi (entegrasyon) |
| `src/app/customers/page.tsx` | Müşteri listesi (bakiye mutabakatı) |
| `prisma/schema.prisma` | Product, InvoiceItem, ProposalItem modelleri |

---

## Gelecek Geliştirmeler

- [ ] **Otomatik Duplikasyon Önleme:** Yeni ürün eklenirken benzer isim kontrolü
- [ ] **Fuzzy Matching:** Levenshtein distance ile daha akıllı duplikasyon tespiti
- [ ] **Scheduled Reconciliation:** Her gece otomatik bakiye mutabakatı (cron job)
- [ ] **Audit Trail:** Kim ne zaman birleştirme yaptı loglama
- [ ] **Undo Merge:** Birleştirme işlemini geri alma
- [ ] **Merge Preview:** Birleştirme öncesi etki analizi

---

## Notlar

- **Transaction Safety:** Tüm işlemler `prisma.$transaction` ile atomik olarak yapılır
- **Revalidasyon:** İşlemler sonrası `/products`, `/customers` sayfaları otomatik yenilenir
- **Logging:** Her işlem detaylı loglanır, UI'da gösterilir
- **Nuclear Option:** `fullReconcileCustomerBalances` sadece ciddi durumlarda kullanılmalı

---

**Son Güncelleme:** 25 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Tamamlandı ve Dokümante Edildi
