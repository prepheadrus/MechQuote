# Otomatik Maaş Tahakkuk Sistemi

## Genel Bakış

MechQuote'un otomatik maaş tahakkuk sistemi, aktif personellerin maaşlarını aylık bazda otomatik olarak hesaplayan, kaydeden ve takip eden bir sistemdir. Personel finans yönetimi ile entegre çalışarak her personelin bakiyesini otomatik günceller.

**Dosya:** `src/actions/salary-processing.ts` (250+ satır)

---

## Özellikler

- ✅ **Toplu Maaş İşleme:** Tüm aktif personeller için tek seferde maaş tahakkuku
- ✅ **Duplikasyon Kontrolü:** Aynı ay için çift maaş kaydını engelleme
- ✅ **Otomatik Bakiye Güncelleme:** Personnel balance otomatik hesaplama
- ✅ **Durum Takibi:** Hangi personellerin maaşı işlenmiş/işlenmemiş takip
- ✅ **Bekleyen Maaşlar:** İşlenmemiş maaşları listeleme
- ✅ **Detaylı Raporlama:** Başarılı/hatalı işlemler raporu
- ✅ **Özel Maaş Tutarı:** Personel bazlı veya genel maaş tutarı tanımlama

---

## Teknik Mimari

```
┌─────────────────────────────────────────────────────────┐
│  salary-processing.ts (Server Actions)                  │
├─────────────────────────────────────────────────────────┤
│  processMonthlySalaries(month, year, salaryAmount?)     │
│  ├── Aktif personelleri al                              │
│  ├── Her personel için:                                 │
│  │   ├── Maaş tutarı kontrol (0 ise atla)              │
│  │   ├── Duplikasyon kontrol (bu ay işlenmiş mi?)      │
│  │   ├── PersonnelTransaction oluştur                  │
│  │   └── Personnel.balance güncelle (+salary)          │
│  └── Rapor döndür (success/error/results/summary)       │
├─────────────────────────────────────────────────────────┤
│  getSalaryProcessingStatus(month, year)                 │
│  ├── Belirtilen ay için işlenmiş maaşları listele       │
│  ├── Aktif personel sayısı                              │
│  └── İşlenen/İşlenmeyen/Toplam tutar                    │
├─────────────────────────────────────────────────────────┤
│  getPendingSalaries(month?, year?, defaultSalary?)      │
│  ├── Aktif personelleri al                              │
│  ├── İşlenmiş personel ID'lerini bul                    │
│  └── İşlenmemiş personelleri listele                    │
└─────────────────────────────────────────────────────────┘
```

---

## API Referansı

### `processMonthlySalaries`

Tüm aktif personeller için maaş tahakkuku yapar.

```typescript
async function processMonthlySalaries(
  month: number,      // 1-12 arası ay
  year: number,       // 4 haneli yıl (örn: 2026)
  salaryAmount?: number // Opsiyonel: Genel maaş tutarı
): Promise<{
  success: boolean;
  message: string;
  results: Array<{
    personnelId: string;
    personnelName: string;
    status: 'success' | 'skipped' | 'error';
    amount?: number;
    reason?: string;
    error?: string;
  }>;
  summary: {
    total: number;
    success: number;
    skipped: number;
    error: number;
    totalAmount: number;
  };
}>
```

**Kullanım Örneği:**

```typescript
// Ocak 2026 için tüm personellere maaş işle
const result = await processMonthlySalaries(1, 2026);

console.log(result.summary);
// {
//   total: 15,
//   success: 13,
//   skipped: 1,    // Zaten işlenmiş
//   error: 1,      // Hata oluştu
//   totalAmount: 260000 // 13 personel * 20,000 TL
// }
```

**Personel bazlı maaş ile:**

```typescript
// Her personelin kendi salary alanını kullan
const result = await processMonthlySalaries(2, 2026);
```

---

### `getSalaryProcessingStatus`

Belirli bir ay için maaş işleme durumunu getirir.

```typescript
async function getSalaryProcessingStatus(
  month: number,
  year: number
): Promise<{
  success: boolean;
  data?: {
    month: number;
    year: number;
    activePersonnel: number;
    processedCount: number;
    remainingCount: number;
    totalAmount: number;
    transactions: Array<{
      personnelId: string;
      personnelName: string;
      amount: number;
      date: Date;
      processed: boolean;
    }>;
  };
}>
```

**Kullanım Örneği:**

```typescript
const status = await getSalaryProcessingStatus(1, 2026);

if (status.success) {
  console.log(`Aktif: ${status.data.activePersonnel}`);
  console.log(`İşlenen: ${status.data.processedCount}`);
  console.log(`Kalan: ${status.data.remainingCount}`);
  console.log(`Toplam Tutar: ${status.data.totalAmount} TL`);
}
```

---

### `getPendingSalaries`

Belirli ay için henüz işlenmemiş maaşları listeler.

```typescript
async function getPendingSalaries(
  month?: number,        // Varsayılan: mevcut ay
  year?: number,         // Varsayılan: mevcut yıl
  defaultSalary?: number // Personel salary alanı boşsa kullanılacak tutar
): Promise<{
  success: boolean;
  data?: {
    month: number;
    year: number;
    totalPending: number;
    totalAmount: number;
    personnel: Array<{
      personnelId: string;
      personnelName: string;
      salary: number;
      currentBalance: number;
      pending: boolean;
    }>;
  };
}>
```

**Kullanım Örneği:**

```typescript
// Mevcut ay için bekleyen maaşlar
const pending = await getPendingSalaries();

// Şubat 2026 için, default maaş 25,000 TL
const febPending = await getPendingSalaries(2, 2026, 25000);
```

---

## Veritabanı Şeması

### İlgili Prisma Modelleri

```prisma
// Personnel modeli
model Personnel {
  id      String  @id @default(cuid())
  name    String
  status  String  // 'Aktif' | 'Pasif'
  salary  Float   // Aylık maaş tutarı
  balance Float   @default(0) // Pozitif: Şirkete borçlu (iş bekliyor)
                              // Negatif: Şirket borçlu (maaş aldı ama çalışmadı)
  
  transactions PersonnelTransaction[]
}

// PersonnelTransaction modeli
model PersonnelTransaction {
  id          String   @id @default(cuid())
  personnelId String
  personnel   Personnel @relation(fields: [personnelId], references: [id])
  
  amount      Float    // Pozitif: Ödeme aldı, Negatif: Avans/Ödeme yaptı
  type        String   // 'Payment' | 'Advance' | 'Other'
  category    String   // 'Maaş' | 'Avans' | 'Prim' | 'Diğer'
  description String?
  date        DateTime
  
  @@index([personnelId, date])
  @@index([category, date])
}
```

---

## Kullanım Senaryoları

### Senaryo 1: Aylık Toplu Maaş İşleme

```typescript
// Her ayın başında otomatik maaş tahakkuku
import { processMonthlySalaries } from '@/actions/salary-processing';

// Sayfa komponenti içinde
const handleProcessSalaries = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const result = await processMonthlySalaries(month, year);
  
  if (result.success) {
    toast.success(`✅ ${result.summary.success} personel için maaş işlendi`);
  } else {
    toast.error(`❌ ${result.summary.error} personel için hata oluştu`);
  }
};
```

---

### Senaryo 2: Maaş Durumunu Kontrol Etme

```typescript
// Yönetici dashboard'da
import { getSalaryProcessingStatus } from '@/actions/salary-processing';

const SalaryStatusCard = async () => {
  const now = new Date();
  const status = await getSalaryProcessingStatus(
    now.getMonth() + 1,
    now.getFullYear()
  );
  
  if (!status.success) return null;
  
  const { activePersonnel, processedCount, remainingCount, totalAmount } = status.data;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maaş Durumu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex justify-between">
            <span>Aktif Personel:</span>
            <span className="font-bold">{activePersonnel}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>İşlenen:</span>
            <span className="font-bold">{processedCount}</span>
          </div>
          <div className="flex justify-between text-orange-600">
            <span>Bekleyen:</span>
            <span className="font-bold">{remainingCount}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>Toplam Tutar:</span>
            <span className="font-bold">{totalAmount.toLocaleString('tr-TR')} TL</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

### Senaryo 3: Bekleyen Maaşları Listeleme

```typescript
// HR yöneticisi için bekleyen maaş raporu
import { getPendingSalaries } from '@/actions/salary-processing';

const PendingSalariesReport = () => {
  const [pending, setPending] = useState(null);
  
  useEffect(() => {
    getPendingSalaries().then(setPending);
  }, []);
  
  if (!pending?.data) return <Loading />;
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead>Mevcut Bakiye</TableHead>
          <TableHead>Maaş</TableHead>
          <TableHead>Durum</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pending.data.personnel.map(p => (
          <TableRow key={p.personnelId}>
            <TableCell>{p.personnelName}</TableCell>
            <TableCell className={p.currentBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
              {p.currentBalance.toLocaleString('tr-TR')} TL
            </TableCell>
            <TableCell className="font-bold">{p.salary.toLocaleString('tr-TR')} TL</TableCell>
            <TableCell>
              <Badge variant="outline">Bekliyor</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

### Senaryo 4: Özel Maaş Tutarı ile İşleme

```typescript
// Toplu maaş artışı uygulandıysa
const handleProcessWithNewSalary = async () => {
  const newSalary = 25000; // Yeni asgari ücret
  
  const result = await processMonthlySalaries(1, 2026, newSalary);
  
  console.log(`Toplam: ${result.summary.totalAmount} TL`);
};
```

---

## Personel Balance Mantığı

```
Balance (Bakiye) Hesaplama:
─────────────────────────────────────────────────────────

Pozitif Balance (+):
  → Personel şirkete iş borçlu
  → Maaşını aldı ama henüz çalışmadı
  → Örnek: Avans aldı, iş bitmedi
  
Negatif Balance (-):
  → Şirket personele borçlu
  → Personel çalıştı ama maaşını almadı
  → Örnek: İş bitti, maaş ödenmedi

Sıfır Balance (0):
  → Dengede
  → Maaş ve çalışma eşit
─────────────────────────────────────────────────────────

Maaş İşlendiğinde:
  Personnel.balance += salary (POZİTİF artar)
  
  Örnek:
  - Mehmet'in bakiyesi: 5,000 TL (şirkete borçlu)
  - Maaş: 20,000 TL işlendi
  - Yeni bakiye: 25,000 TL (daha fazla iş borçlu)
  
Avans Verildiğinde:
  Personnel.balance += advance (POZİTİF artar)
  
Ödeme Yapıldığında:
  Personnel.balance -= payment (NEGATİF azalır)
```

---

## UI Entegrasyonu

### Maaş İşleme Dialog Component

```typescript
// components/payroll/salary-process-dialog.tsx
'use client';

import { useState } from 'react';
import { processMonthlySalaries } from '@/actions/salary-processing';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SalaryProcessDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleProcess = async () => {
    setLoading(true);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    try {
      const res = await processMonthlySalaries(month, year);
      setResult(res);
    } catch (error) {
      console.error('Maaş işleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          Aylık Maaş İşle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Maaş Tahakkuku</DialogTitle>
        </DialogHeader>
        
        {!result ? (
          <div className="space-y-4">
            <p>Bu ayın maaşlarını işlemek istediğinize emin misiniz?</p>
            <Button 
              onClick={handleProcess} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'İşleniyor...' : 'Onayla ve İşle'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Başarılı</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.summary.success}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hatalı</p>
                <p className="text-2xl font-bold text-red-600">
                  {result.summary.error}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atlanan</p>
                <p className="text-2xl font-bold text-orange-600">
                  {result.summary.skipped}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                <p className="text-2xl font-bold">
                  {(result.summary.totalAmount / 1000).toFixed(1)}K TL
                </p>
              </div>
            </div>
            
            <Button onClick={() => setOpen(false)} className="w-full">
              Tamam
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Sorun Giderme

### Hata: "Maaş zaten işlenmiş"

**Sebep:** Aynı personel için aynı ayda birden fazla maaş işlemi yapılmış.

**Çözüm:**
```typescript
// Önce durumu kontrol et
const status = await getSalaryProcessingStatus(month, year);

// Zaten işlenmiş personelleri filtrele
const alreadyProcessed = status.data.transactions.map(t => t.personnelId);

// Manuel olarak sadece işlenmemişleri işle
// (Bu özellik henüz yok, eklenebilir)
```

---

### Hata: "Maaş tutarı 0"

**Sebep:** Personelin `salary` alanı boş veya 0.

**Çözüm:**
```typescript
// Personel detay sayfasında salary alanını doldur
// VEYA processMonthlySalaries çağrısında default salary belirt
await processMonthlySalaries(1, 2026, 20000); // Default 20,000 TL
```

---

### Hata: Personnel balance yanlış hesaplanıyor

**Sebep:** Transaction'lar silinmiş veya bozuk.

**Çözüm:**
```typescript
// Maintenance actions kullan (maintenance.ts'de)
import { reconcileCustomerBalances } from '@/actions/maintenance';

// Benzer bir fonksiyon personel için yazılabilir
// TODO: reconcilePersonnelBalances() ekle
```

---

## Otomasyon Önerileri

### 1. Aylık Cron Job (Vercel/Cloud)

```typescript
// app/api/cron/process-salaries/route.ts
import { NextResponse } from 'next/server';
import { processMonthlySalaries } from '@/actions/salary-processing';

export async function POST(req: Request) {
  // Auth kontrolü (cron secret)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const now = new Date();
  const result = await processMonthlySalaries(
    now.getMonth() + 1,
    now.getFullYear()
  );
  
  // Admin'e email gönder
  if (result.summary.error > 0) {
    await sendErrorEmail(result);
  }
  
  return NextResponse.json(result);
}
```

---

### 2. Dashboard Widget

```typescript
// components/dashboard/payroll-widget.tsx
export async function PayrollWidget() {
  const status = await getSalaryProcessingStatus(
    new Date().getMonth() + 1,
    new Date().getFullYear()
  );
  
  if (!status.success) return null;
  
  const progress = (status.data.processedCount / status.data.activePersonnel) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maaş Tahakkuku</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-muted-foreground">
          {status.data.processedCount} / {status.data.activePersonnel} personel
        </p>
        {status.data.remainingCount > 0 && (
          <Button size="sm" variant="outline" className="mt-2">
            Bekleyenleri İşle
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/salary-processing.ts` | Ana server actions |
| `src/app/personnel/page.tsx` | Personel listesi (entegrasyon) |
| `src/app/cash-book/page.tsx` | Kasa defteri (transaction görünümü) |
| `prisma/schema.prisma` | Personnel, PersonnelTransaction modelleri |

---

## Gelecek Geliştirmeler

- [ ] **Otomatik Hatırlatma:** Her ayın 1'inde admin'e email/SMS
- [ ] **Toplu Ödeme Entegrasyonu:** Banka API'si ile otomatik ödeme
- [ ] **Vergi Hesaplama:** Gelir vergisi, sigorta primi otomatik hesaplama
- [ ] **Maaş Bordrosu:** PDF bordro oluşturma ve email ile gönderme
- [ ] **Geçmiş Raporları:** Yıllık maaş raporu (vergi beyanı için)
- [ ] **Dövizli Maaş:** USD/EUR bazlı maaş tanımlama ve kur farkı hesaplama

---

## Notlar

- **Revalidasyon:** Maaş işleme sonrası `/personnel` ve `/cash-book` sayfaları otomatik yenilenir
- **Logger:** Tüm işlemler `createLogger('SalaryProcessing')` ile loglanır
- **Transaction Safety:** Her personel işlemi try-catch ile korunur, bir personel hatası diğerlerini etkilemez
- **Performance:** Büyük personel sayısı için batch processing eklenebilir

---

**Son Güncelleme:** 25 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Tamamlandı ve Dokümante Edildi
