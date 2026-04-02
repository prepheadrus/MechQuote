# Cari Hesap Devir Fişi Sistemi (Customer Period Transfer)

## Genel Bakış

MechQuote'un cari hesap devir fişi sistemi, dönem sonlarında (ay sonu, yıl sonu) müşteri bakiyelerini yeni döneme devretmek için kullanılır. Bu sistem, muhasebe dönemleri arasında tutarlılığı sağlar ve doğru bakiye takibi yapmayı mümkün kılar.

**Dosya:** `src/actions/customers.ts` (satır 214-328)

---

## Özellikler

- ✅ **Bireysel Devir:** Tek müşteri için devir fişi oluşturma
- ✅ **Toplu Devir:** Tüm müşteriler için toplu devir işlemi
- ✅ **Dönem Takibi:** Hangi döneme devredildiğini kaydetme
- ✅ **Otomatik Bakiye Güncelleme:** Müşteri bakiyesini otomatik güncelleme
- ✅ **Transaction Geçmişi:** Devir işlemlerini transaction olarak kaydetme
- ✅ **Açılış Bakiyesi:** Yeni dönem açılış bakiyesi oluşturma

---

## Teknik Mimari

```
┌──────────────────────────────────────────────────────────────┐
│  customers.ts (Devir Fonksiyonları)                          │
├──────────────────────────────────────────────────────────────┤
│  createPeriodTransfer(customerId, amount, period, description)│
│  ├── Müşteri kontrolü                                        │
│  ├── Tutar validasyonu (0 olamaz)                            │
│  ├── CustomerTransaction oluştur (category: 'Dönem Devir')   │
│  ├── Customer.balance güncelle                               │
│  ├── /customers ve /cash-book revalidate                     │
│  └── Sonuç döndür                                            │
├──────────────────────────────────────────────────────────────┤
│  createBulkPeriodTransfer(transfers[])                        │
│  ├── Her transfer için createPeriodTransfer çağır            │
│  ├── Başarılı/Hatalı işlemleri say                           │
│  ├── Toplu rapor döndür                                      │
│  └── /customers ve /cash-book revalidate                     │
└──────────────────────────────────────────────────────────────┘
```

---

## API Referansı

### `createPeriodTransfer`

Tek müşteri için dönem devir fişi oluşturur.

```typescript
async function createPeriodTransfer(
  customerId: string,
  amount: number,        // Pozitif: Müşteri borçlu, Negatif: Müşteri alacaklı
  period: string,        // Format: "2026-01" (YYYY-MM)
  description?: string   // Opsiyonel açıklama
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  data?: { customerId: string; amount: number; period: string };
}>
```

**Kullanım Örneği:**

```typescript
import { createPeriodTransfer } from '@/actions/customers';

// Müşterinin 2025 yılından 2026'ya devir bakiyesi (müşteri borçlu)
const result = await createPeriodTransfer(
  'customer-123',
  15000,  // Pozitif: Müşteri şirkete 15,000 TL borçlu
  '2026-01',  // Ocak 2026 dönemine devir
  '2025 yılı devir bakiyesi'
);

if (result.success) {
  console.log(result.message);
  // "Devir fişi oluşturuldu: 15000.00 TL"
}
```

---

### `createBulkPeriodTransfer`

Toplu devir fişi oluşturur.

```typescript
async function createBulkPeriodTransfer(
  transfers: Array<{
    customerId: string;
    amount: number;
    period: string;
    description?: string;
  }>
): Promise<{
  success: boolean;
  message: string;
  results: Array<{
    customerId: string;
    amount: number;
    period: string;
    status: 'success' | 'error';
    error?: string;
  }>;
}>
```

**Kullanım Örneği:**

```typescript
import { createBulkPeriodTransfer } from '@/actions/customers';

const transfers = [
  {
    customerId: 'customer-123',
    amount: 15000,
    period: '2026-01',
    description: '2025 yılı devir bakiyesi'
  },
  {
    customerId: 'customer-456',
    amount: -5000,  // Negatif: Şirket müşteriye borçlu
    period: '2026-01',
    description: '2025 yılı devir bakiyesi (fazla ödeme)'
  },
  {
    customerId: 'customer-789',
    amount: 8000,
    period: '2026-01'
  }
];

const result = await createBulkPeriodTransfer(transfers);

console.log(result.message);
// "3 devir fişi oluşturuldu, 0 hata"

console.log(result.results);
// [
//   { customerId: 'customer-123', amount: 15000, period: '2026-01', status: 'success' },
//   { customerId: 'customer-456', amount: -5000, period: '2026-01', status: 'success' },
//   { customerId: 'customer-789', amount: 8000, period: '2026-01', status: 'success' }
// ]
```

---

## Muhasebe Mantığı

### Devir Fişi Oluşturma

```
Senaryo: 2025 yılı sonu → 2026 yılı başı devir
─────────────────────────────────────────────────────────

Müşteri: ABC Tesisat Ltd.
2025 Yılı Kapanış Bakiyesi: 15,000 TL (Pozitif = Müşteri Borçlu)

Devir İşlemi:
  Dönem: 2026-01 (Ocak 2026)
  Tutar: 15,000 TL
  Açıklama: "2025 yılı devir bakiyesi"

Muhasebe Kaydı (CustomerTransaction):
  {
    customerId: 'abc123',
    amount: 15000,
    type: 'Debt',  // Pozitif tutar = Debt
    category: 'Dönem Devir',
    description: "2025 yılı devir bakiyesi - ABC Tesisat Ltd.",
    date: new Date(),  // Devir işlem tarihi
    referenceType: 'PeriodTransfer'
  }

Müşteri Bakiyesi Güncelleme:
  - Eski Bakiye: 0 (yeni yıl başlangıcı)
  - Devir: +15,000 TL
  - Yeni Bakiye: 15,000 TL
─────────────────────────────────────────────────────────

Senaryo: Fazla Ödeme Devri (Negatif Bakiye)
─────────────────────────────────────────────────────────

Müşteri: XYZ Yapı A.Ş.
2025 Yılı Kapanış Bakiyesi: -5,000 TL (Negatif = Şirket Borçlu)

Devir İşlemi:
  Dönem: 2026-01
  Tutar: -5,000 TL  ← Negatif!
  Açıklama: "2025 yılı devir bakiyesi (fazla ödeme)"

Muhasebe Kaydı:
  {
    customerId: 'xyz789',
    amount: 5000,  // amount her zaman pozitif (abs value)
    type: 'Credit',  // Negatif tutar = Credit
    category: 'Dönem Devir',
    description: "2025 yılı devir bakiyesi (fazla ödeme) - XYZ Yapı A.Ş.",
    date: new Date(),
    referenceType: 'PeriodTransfer'
  }

Müşteri Bakiyesi:
  - Eski Bakiye: 0
  - Devir: -5,000 TL
  - Yeni Bakiye: -5,000 TL (Şirket müşteriye borçlu)
─────────────────────────────────────────────────────────
```

---

## Kullanım Senaryoları

### Senaryo 1: Yıl Sonu Devir İşlemi

```typescript
// app/customers/year-end-transfer/page.tsx
'use client';

import { useState } from 'react';
import { createBulkPeriodTransfer } from '@/actions/customers';
import { getCustomers } from '@/actions/customers';

export default function YearEndTransferPage() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tüm müşterileri yükle (bakiyesi olanlar)
  const loadCustomers = async () => {
    const result = await getCustomers();
    if (result.success) {
      // Bakiyesi olan müşterileri filtrele
      const customersWithBalance = result.data.filter(c => Math.abs(c.balance) > 0.01);
      
      // Devir listesi oluştur
      const transferList = customersWithBalance.map(c => ({
        customerId: c.id,
        amount: c.balance,  // Pozitif veya negatif olabilir
        period: '2026-01',  // Yeni dönem
        description: '2025 yılı devir bakiyesi'
      }));
      
      setTransfers(transferList);
    }
  };
  
  const handleTransfer = async () => {
    setLoading(true);
    
    const result = await createBulkPeriodTransfer(transfers);
    
    if (result.success) {
      toast.success(`✅ ${transfers.length} müşteri için devir tamamlandı`);
    } else {
      toast.error(`❌ ${result.message}`);
    }
    
    setLoading(false);
  };
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Yıl Sonu Devir İşlemi</h1>
      
      <Button onClick={loadCustomers} className="mb-4">
        Müşterileri Yükle
      </Button>
      
      {transfers.length > 0 && (
        <div>
          <p className="mb-2">
            Toplam {transfers.length} müşteri için devir işlemi yapılacak
          </p>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Müşteri</TableHead>
                <TableHead>Bakiye</TableHead>
                <TableHead>Dönem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((t, i) => (
                <TableRow key={i}>
                  <TableCell>{t.customerId}</TableCell>
                  <TableCell className={t.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {t.amount.toLocaleString('tr-TR')} TL
                  </TableCell>
                  <TableCell>{t.period}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <Button onClick={handleTransfer} disabled={loading} className="mt-4">
            {loading ? 'Devir İşlemi Yapılıyor...' : 'Devir İşlemini Onayla'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

### Senaryo 2: Müşteri Detay Devir Fişi

```typescript
// app/customers/[id]/period-transfer-dialog.tsx
'use client';

import { useState } from 'react';
import { createPeriodTransfer } from '@/actions/customers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PeriodTransferDialogProps {
  customerId: string;
  customerName: string;
  currentBalance: number;
}

export function PeriodTransferDialog({
  customerId,
  customerName,
  currentBalance,
}: PeriodTransferDialogProps) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleTransfer = async () => {
    setLoading(true);
    
    const result = await createPeriodTransfer(
      customerId,
      currentBalance,
      period,
      `${period.split('-')[0]} yılı devir bakiyesi`
    );
    
    if (result.success) {
      toast.success('Devir fişi oluşturuldu');
      setOpen(false);
    } else {
      toast.error(result.error || 'Bir hata oluştu');
    }
    
    setLoading(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Devir Fişi Oluştur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {customerName} - Devir Fişi
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Mevcut Bakiye</label>
            <p className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {currentBalance.toLocaleString('tr-TR')} TL
            </p>
            <p className="text-xs text-muted-foreground">
              {currentBalance >= 0 
                ? 'Müşteri şirkete borçlu' 
                : 'Şirket müşteriye borçlu'}
            </p>
          </div>
          
          <div>
            <label className="text-sm font-medium">Devir Dönemi</label>
            <Input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="2026-01"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleTransfer} disabled={loading || !period}>
              {loading ? 'Oluşturuluyor...' : 'Devir Fişi Oluştur'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Senaryo 3: Devir Fişi Raporu

```typescript
// components/reports/period-transfer-report.tsx
import { prisma } from '@/lib/prisma';

export async function PeriodTransferReport({ period }: { period: string }) {
  // Belirtilen dönem için devir işlemlerini getir
  const transfers = await prisma.customerTransaction.findMany({
    where: {
      category: 'Dönem Devir',
      referenceType: 'PeriodTransfer',
      date: {
        gte: new Date(period + '-01'),
        lt: new Date(period + '-31')
      }
    },
    include: {
      customer: {
        select: {
          name: true,
          taxId: true
        }
      }
    },
    orderBy: {
      customer: {
        name: 'asc'
      }
    }
  });
  
  const totalDebt = transfers
    .filter(t => t.type === 'Debt')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalCredit = transfers
    .filter(t => t.type === 'Credit')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        {period} Dönemi Devir Fişi Raporu
      </h1>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-muted-foreground">Toplam Alacak</p>
          <p className="text-2xl font-bold text-green-600">
            {totalDebt.toLocaleString('tr-TR')} TL
          </p>
          <p className="text-xs text-muted-foreground">
            {transfers.filter(t => t.type === 'Debt').length} müşteri
          </p>
        </div>
        
        <div className="p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-muted-foreground">Toplam Borç</p>
          <p className="text-2xl font-bold text-red-600">
            {totalCredit.toLocaleString('tr-TR')} TL
          </p>
          <p className="text-xs text-muted-foreground">
            {transfers.filter(t => t.type === 'Credit').length} müşteri
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-muted-foreground">Net Pozisyon</p>
          <p className={`text-2xl font-bold ${totalDebt - totalCredit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {(totalDebt - totalCredit).toLocaleString('tr-TR')} TL
          </p>
          <p className="text-xs text-muted-foreground">
            Toplam {transfers.length} devir fişi
          </p>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Müşteri</TableHead>
            <TableHead>VKN/TCKN</TableHead>
            <TableHead>Tutar</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead>Açıklama</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="font-medium">{t.customer.name}</TableCell>
              <TableCell>{t.customer.taxId}</TableCell>
              <TableCell className={t.type === 'Debt' ? 'text-green-600' : 'text-red-600'}>
                {t.amount.toLocaleString('tr-TR')} TL
              </TableCell>
              <TableCell>
                <Badge variant={t.type === 'Debt' ? 'default' : 'destructive'}>
                  {t.type === 'Debt' ? 'Alacak' : 'Borç'}
                </Badge>
              </TableCell>
              <TableCell className="max-w-md truncate">
                {t.description}
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

## Veritabanı Şeması

### CustomerTransaction Modeli (Devir)

```prisma
model CustomerTransaction {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  
  amount       Float    // Her zaman pozitif (abs value)
  type         String   // 'Debt' (Müşteri borçlu) | 'Credit' (Şirket borçlu)
  category     String   // 'Dönem Devir' için özel kategori
  description  String?
  date         DateTime
  referenceType String? // 'PeriodTransfer'
  
  @@index([customerId, date])
  @@index([category, date])
  @@index([referenceType])
}
```

---

## Transaction Category ve Reference Type

```typescript
// Devir fişi oluştururken
await prisma.customerTransaction.create({
  data: {
    customerId: 'abc123',
    amount: Math.abs(15000),  // Her zaman pozitif
    type: 15000 > 0 ? 'Debt' : 'Credit',  // İşaretine göre
    category: 'Dönem Devir',  // ← ÖNEMLİ: Raporlama için
    description: '2025 yılı devir bakiyesi - ABC Tesisat Ltd.',
    date: new Date(),
    referenceType: 'PeriodTransfer'  // ← Devir olduğunu belirtir
  }
});
```

---

## Sorun Giderme

### Hata: "Müşteri ID ve dönem zorunludur"

**Sebep:** `customerId` veya `period` parametresi eksik.

**Çözüm:**
```typescript
// Validasyon
if (!customerId || !period) {
  return { 
    success: false, 
    error: 'Müşteri ID ve dönem zorunludur' 
  };
}

// Period format kontrolü (YYYY-MM)
const periodRegex = /^\d{4}-\d{2}$/;
if (!periodRegex.test(period)) {
  return { 
    success: false, 
    error: 'Dönem formatı YYYY-MM olmalıdır (örn: 2026-01)' 
  };
}
```

---

### Hata: "Tutar 0 olamaz"

**Sebep:** Bakiyesi olmayan müşteri için devir işlemi yapılmaya çalışılıyor.

**Çözüm:**
```typescript
// Devir öncesi bakiye kontrolü
if (Math.abs(amount) < 0.01) {
  return { 
    success: false, 
    error: 'Tutar 0 olamaz' 
  };
}

// Sadece bakiyesi olan müşterileri göster
const customersWithBalance = customers.filter(
  c => Math.abs(c.balance) > 0.01
);
```

---

### Hata: "Müşteri bulunamadı"

**Sebep:** Geçersiz `customerId`.

**Çözüm:**
```typescript
// Müşteri varlık kontrolü
const customer = await prisma.customer.findUnique({
  where: { id: customerId }
});

if (!customer) {
  return { 
    success: false, 
    error: 'Müşteri bulunamadı' 
  };
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/customers.ts` | Devir fonksiyonları (satır 214-328) |
| `src/app/customers/page.tsx` | Müşteri listesi |
| `src/app/cash-book/page.tsx` | Kasa defteri (transaction görünümü) |
| `prisma/schema.prisma` | Customer, CustomerTransaction modelleri |

---

## Gelecek Geliştirmeler

- [ ] **Otomatik Devir:** Dönem sonunda otomatik devir işlemi (cron job)
- [ ] **Devir Şablonu:** Önceki dönem devirlerini şablon olarak kaydetme
- [ ] **Çoklu Dönem:** Aynı anda birden fazla dönem devri
- [ ] **Devir Onayı:** Yönetici onayı gerektiren devir işlemleri
- [ ] **PDF Rapor:** Devir fişi PDF çıktısı
- [ ] **E-Devir:** E-Muhasebe entegrasyonu ile otomatik devir

---

## Notlar

- **Revalidasyon:** Devir sonrası `/customers` ve `/cash-book` sayfaları otomatik yenilenir
- **Amount:** Transaction amount her zaman pozitif (abs value), type (Debt/Credit) yönü belirtir
- **Period Format:** YYYY-MM formatında olmalı (örn: "2026-01")
- **Balance Mantığı:** Pozitif = Müşteri şirkete borçlu, Negatif = Şirket müşteriye borçlu

---

**Son Güncelleme:** 25 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Tamamlandı ve Dokümante Edildi
