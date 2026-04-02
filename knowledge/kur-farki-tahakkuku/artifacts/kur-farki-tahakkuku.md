# Kur Farkı Tahakkuk Sistemi (Currency Revaluation)

## Genel Bakış

MechQuote'un otomatik kur farkı tahakkuk sistemi, dövizli işlemlerin TL karşılıklarını dönem sonu kur farklarına göre otomatik olarak hesaplar ve muhasebeleştirir. Özellikle USD/EUR gibi döviz cinsinden çalışan cari hesaplar için kritik bir sistemdir.

**Dosya:** `src/actions/currency-revaluation.ts` (180+ satır)

---

## Özellikler

- ✅ **Bireysel Kur Farkı:** Tek müşteri için kur farkı hesaplama
- ✅ **Toplu Kur Farkı:** Tüm dövizli müşteriler için otomatik hesaplama
- ✅ **Döviz Pozisyonu:** Currency exposure analizi
- ✅ **Transaction Bazlı:** Her işlem için ayrı hesaplama
- ✅ **Otomatik Bakiye Güncelleme:** Müşteri bakiyesini otomatik güncelleme
- ✅ **Kur Geçmişi:** Eski/yeni kur karşılaştırması

---

## Teknik Mimari

```
┌──────────────────────────────────────────────────────────────┐
│  currency-revaluation.ts                                      │
├──────────────────────────────────────────────────────────────┤
│  calculateCurrencyRevaluation(customerId, newRate, oldRate)   │
│  ├── Dövizli işlemleri bul (category: 'Dövizli İşlem')       │
│  ├── Her işlem için:                                         │
│  │   ├── TL Değer (Eski) = Döviz Tutar × Eski Kur            │
│  │   ├── TL Değer (Yeni) = Döviz Tutar × Yeni Kur            │
│  │   └── Fark = Yeni - Eski                                  │
│  ├── Toplam farkı hesapla                                    │
│  ├── CustomerTransaction oluştur (category: 'Kur Farkı')     │
│  ├── Customer.balance güncelle                               │
│  └── Sonuç döndür                                            │
├──────────────────────────────────────────────────────────────┤
│  calculateBulkCurrencyRevaluation(rates, oldRates)            │
│  ├── Dövizli işlemi olan tüm müşterileri bul                 │
│  ├── Her müşteri için calculateCurrencyRevaluation çağır     │
│  ├── Tüm sonuçları topla                                     │
│  └── Rapor döndür                                            │
├──────────────────────────────────────────────────────────────┤
│  getCurrencyExposure(customerId)                              │
│  ├── Müşterinin dövizli işlemlerini al                       │
│  ├── Description'dan currency çıkar (regex)                  │
│  ├── Her para birimi için net pozisyon hesapla               │
│  └── Exposure objesi döndür { USD: 10000, EUR: 5000 }        │
└──────────────────────────────────────────────────────────────┘
```

---

## API Referansı

### `calculateCurrencyRevaluation`

Tek müşteri için kur farkı hesaplar.

```typescript
async function calculateCurrencyRevaluation(
  customerId: string,
  newRate: number,    // Yeni kur (örn: 34.50)
  oldRate: number,    // Eski kur (örn: 32.50)
  currency: string    // Para birimi (örn: 'USD')
): Promise<{
  success: boolean;
  message: string;
  difference: number; // Pozitif: Müşteri borçlu arttı, Negatif: Azaldı
}>
```

**Kullanım Örneği:**

```typescript
import { calculateCurrencyRevaluation } from '@/actions/currency-revaluation';

// USD kuru 32.50 → 34.50 yükseldi
const result = await calculateCurrencyRevaluation(
  'customer-123',
  34.50,  // Yeni kur
  32.50,  // Eski kur
  'USD'
);

if (result.success) {
  console.log(`Kur farkı: ${result.difference} TL`);
  // Pozitif ise: Müşterinin borcu arttı (kur yükseldi)
  // Negatif ise: Müşterinin borcu azaldı (kur düştü)
}
```

---

### `calculateBulkCurrencyRevaluation`

Tüm dövizli müşteriler için toplu kur farkı hesaplar.

```typescript
async function calculateBulkCurrencyRevaluation(
  rates: { [key: string]: number },     // Yeni kurlar { USD: 34.50, EUR: 37.80 }
  oldRates: { [key: string]: number }   // Eski kurlar { USD: 32.50, EUR: 35.00 }
): Promise<{
  success: boolean;
  message: string;
  results: Array<{
    customerId: string;
    customerName: string;
    currency: string;
    difference: number;
  }>;
}>
```

**Kullanım Örneği:**

```typescript
// Dönem sonu kur farkı hesaplama
const result = await calculateBulkCurrencyRevaluation(
  { USD: 34.50, EUR: 37.80 },   // Yeni kurlar
  { USD: 32.50, EUR: 35.00 }    // Eski kurlar
);

console.log(result.results);
// [
//   { customerId: 'abc', customerName: 'ABC Ltd.', currency: 'USD', difference: 5000 },
//   { customerId: 'xyz', customerName: 'XYZ A.Ş.', currency: 'EUR', difference: -2000 }
// ]
```

---

### `getCurrencyExposure`

Müşterinin döviz pozisyonunu gösterir.

```typescript
async function getCurrencyExposure(
  customerId: string
): Promise<{
  success: boolean;
  data: { [key: string]: number }; // { USD: 10000, EUR: 5000 }
}>
```

**Kullanım Örneği:**

```typescript
const exposure = await getCurrencyExposure('customer-123');

if (exposure.success) {
  console.log('Döviz Pozisyonu:');
  Object.entries(exposure.data).forEach(([currency, amount]) => {
    console.log(`  ${currency}: ${amount}`);
  });
}
```

---

## Muhasebe Mantığı

### Kur Farkı Hesaplama

```
Senaryo: Müşteri 1000 USD borçlu
─────────────────────────────────────────────────────────

Dönem Başı Kuru: 32.50 TL
Dönem Sonu Kuru: 34.50 TL

Hesaplama:
  Eski TL Değer: 1000 × 32.50 = 32,500 TL
  Yeni TL Değer: 1000 × 34.50 = 34,500 TL
  Kur Farkı:     34,500 - 32,500 = 2,000 TL

Muhasebe Kaydı:
  BORÇ:  120 Alıcılar (Müşteri)     2,000 TL
  ALACAK: 646 Kambiyo Karları       2,000 TL

Sonuç:
  - Müşterinin borcu 2,000 TL arttı
  - Şirket kurdan 2,000 TL kar etti
─────────────────────────────────────────────────────────

Senaryo: Kur düşerse (34.50 → 32.50)
─────────────────────────────────────────────────────────

Hesaplama:
  Eski: 1000 × 34.50 = 34,500 TL
  Yeni: 1000 × 32.50 = 32,500 TL
  Fark: 32,500 - 34,500 = -2,000 TL

Muhasebe Kaydı:
  BORÇ:  647 Kambiyo Zararları     2,000 TL
  ALACAK: 120 Alıcılar (Müşteri)   2,000 TL

Sonuç:
  - Müşterinin borcu 2,000 TL azaldı
  - Şirket kurdan 2,000 TL zarar etti
─────────────────────────────────────────────────────────
```

---

## Kullanım Senaryoları

### Senaryo 1: Aylık Kur Farkı Hesaplama

```typescript
// Her ay sonunda otomatik kur farkı
import { calculateBulkCurrencyRevaluation } from '@/actions/currency-revaluation';

const handleMonthEndRevaluation = async () => {
  // TCMB veya Merkez Bankası'ndan güncel kurları al
  const currentRates = await getRatesFromTCMB(); // { USD: 34.50, EUR: 37.80 }
  
  // Önceki ayın kurları (veritabanından)
  const previousRates = await getPreviousMonthRates(); // { USD: 32.50, EUR: 35.00 }
  
  const result = await calculateBulkCurrencyRevaluation(
    currentRates,
    previousRates
  );
  
  if (result.success) {
    console.log(`${result.results.length} müşteri için kur farkı hesaplandı`);
    
    // Yöneticiye rapor gönder
    await sendRevaluationReport(result.results);
  }
};
```

---

### Senaryo 2: Müşteri Bazlı Kur Farkı

```typescript
// Müşteri detay sayfasında manuel kur farkı
import { calculateCurrencyRevaluation } from '@/actions/currency-revaluation';

const CustomerCurrencyCard = ({ customer }) => {
  const [newRate, setNewRate] = useState(34.50);
  const [oldRate, setOldRate] = useState(32.50);
  
  const handleCalculate = async () => {
    const result = await calculateCurrencyRevaluation(
      customer.id,
      newRate,
      oldRate,
      'USD'
    );
    
    if (result.success) {
      toast.success(`Kur farkı: ${result.difference.toFixed(2)} TL`);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kur Farkı Hesaplama</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label>Eski Kur</label>
            <Input 
              type="number" 
              value={oldRate} 
              onChange={(e) => setOldRate(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label>Yeni Kur</label>
            <Input 
              type="number" 
              value={newRate} 
              onChange={(e) => setNewRate(parseFloat(e.target.value))}
            />
          </div>
          <Button onClick={handleCalculate}>
            Hesapla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

### Senaryo 3: Döviz Pozisyonu Raporu

```typescript
// CFO Dashboard - Currency Exposure
import { getCurrencyExposure } from '@/actions/currency-revaluation';

const CurrencyExposureWidget = async () => {
  const customers = await getCustomersWithForeignTransactions();
  
  const totalExposure = { USD: 0, EUR: 0, GBP: 0 };
  
  for (const customer of customers) {
    const exposure = await getCurrencyExposure(customer.id);
    if (exposure.success) {
      Object.entries(exposure.data).forEach(([currency, amount]) => {
        totalExposure[currency] = (totalExposure[currency] || 0) + amount;
      });
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Döviz Pozisyonu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(totalExposure).map(([currency, amount]) => (
            <div key={currency} className="flex justify-between">
              <span className="font-bold">{currency}</span>
              <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                {amount.toLocaleString('tr-TR')}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Pozitif: Müşteriler borçlu (Alacak) | Negatif: Şirket borçlu (Borç)
        </p>
      </CardContent>
    </Card>
  );
};
```

---

### Senaryo 4: Kur Farkı Preview (İşlemeden Önce)

```typescript
// Kullanıcıya preview göster, onay al
const handlePreviewRevaluation = async () => {
  const customers = await getCustomersWithForeignTransactions();
  const preview = [];
  
  for (const customer of customers) {
    const exposure = await getCurrencyExposure(customer.id);
    if (exposure.success) {
      Object.entries(exposure.data).forEach(([currency, amount]) => {
        const oldRate = 32.50;
        const newRate = 34.50;
        const difference = amount * (newRate - oldRate);
        
        preview.push({
          customerName: customer.name,
          currency,
          amount,
          oldRate,
          newRate,
          difference
        });
      });
    }
  }
  
  setPreview(preview);
  setShowPreviewDialog(true);
};

// Preview Dialog
<Dialog open={showPreviewDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Kur Farkı Önizleme</DialogTitle>
    </DialogHeader>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Müşteri</TableHead>
          <TableHead>Döviz</TableHead>
          <TableHead>Tutar</TableHead>
          <TableHead>Fark</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {preview.map((p, i) => (
          <TableRow key={i}>
            <TableCell>{p.customerName}</TableCell>
            <TableCell>{p.currency}</TableCell>
            <TableCell>{p.amount.toLocaleString()} {p.currency}</TableCell>
            <TableCell className={p.difference >= 0 ? 'text-green-600' : 'text-red-600'}>
              {p.difference.toLocaleString('tr-TR')} TL
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <Button onClick={handleConfirmRevaluation}>
      Onayla ve İşle
    </Button>
  </DialogContent>
</Dialog>
```

---

## Veritabanı Şeması

### CustomerTransaction Modeli

```prisma
model CustomerTransaction {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  
  amount       Float
  type         String   // 'Debt' | 'Credit'
  category     String   // 'Dövizli İşlem' | 'Kur Farkı' | 'Normal'
  description  String?
  date         DateTime
  referenceType String? // 'CurrencyRevaluation' | 'PeriodTransfer'
  
  @@index([customerId, date])
  @@index([category, date])
}
```

### Customer Modeli

```prisma
model Customer {
  id         String   @id @default(cuid())
  name       String
  balance    Float    @default(0)
  // Pozitif: Müşteri şirkete borçlu (Alacak)
  // Negatif: Şirket müşteriye borçlu (Borç)
  
  transactions CustomerTransaction[]
}
```

---

## Transaction Category Yapısı

```typescript
// Dövizli işlem kaydedilirken
await prisma.customerTransaction.create({
  data: {
    customerId: 'abc123',
    amount: 1000,  // Döviz cinsinden tutar (örn: 1000 USD)
    type: 'Debt',
    category: 'Dövizli İşlem',  // ← ÖNEMLİ: Bu kategori ile filtreleme yapılıyor
    description: 'USD 1000 - Fatura No: 2024-001',  // ← Currency buradan çıkar
    date: new Date()
  }
});

// Kur farkı otomatik oluşturulurken
await prisma.customerTransaction.create({
  data: {
    customerId: 'abc123',
    amount: 2000,  // TL cinsinden kur farkı
    type: 'Debt',
    category: 'Kur Farkı',  // ← Kur farkı işlemi
    description: 'USD kur farkı tahakkuku (32.50 → 34.50)',
    date: new Date(),
    referenceType: 'CurrencyRevaluation'
  }
});
```

---

## Sorun Giderme

### Hata: "Dövizli işlem bulunamadı"

**Sebep:** Müşterinin `category: 'Dövizli İşlem'` ile kaydedilmiş transaction'ı yok.

**Çözüm:**
```typescript
// Dövizli işlemleri doğru kategori ile kaydet
await createCustomerTransaction({
  customerId: 'abc',
  amount: 1000,
  type: 'Debt',
  category: 'Dövizli İşlem',  // ← Bu kategori ŞART
  description: 'USD 1000 - Fatura'
});
```

---

### Hata: "Kur farkı 0"

**Sebep:** Eski ve yeni kur aynı veya işlem tutarı çok küçük.

**Çözüm:**
```typescript
// Floating point hatalarını önlemek için 0.01 threshold kullanılıyor
if (Math.abs(totalDifference) > 0.01) {
  // Transaction oluştur
}
```

---

### Hata: "Müşteri bakiyesi yanlış güncelleniyor"

**Sebep:** Transaction type (Debt/Credit) ters.

**Çözüm:**
```typescript
// Kural:
// - Kur artarsa → Müşteri borcu artar → type: 'Debt' → balance increment
// - Kur düşerse → Müşteri borcu azalır → type: 'Credit' → balance decrement

const type = totalDifference > 0 ? 'Debt' : 'Credit';

await prisma.customer.update({
  where: { id: customerId },
  data: {
    balance: {
      increment: totalDifference > 0 ? totalDifference : 0,
      decrement: totalDifference < 0 ? Math.abs(totalDifference) : 0
    }
  }
});
```

---

## Entegrasyon Örnekleri

### TCMB Kur Entegrasyonu

```typescript
// services/tcmb-rates.ts
export async function getRatesFromTCMB(date?: string) {
  const url = `https://www.tcmb.gov.tr/kurlar/today.xml`;
  
  const response = await fetch(url);
  const xml = await response.text();
  
  // XML parse
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');
  
  const rates = {
    USD: parseFloat(xmlDoc.querySelector('Currency[@Kod="USD"] BanknoteSelling').textContent),
    EUR: parseFloat(xmlDoc.querySelector('Currency[@Kod="EUR"] BanknoteSelling').textContent),
    GBP: parseFloat(xmlDoc.querySelector('Currency[@Kod="GBP"] BanknoteSelling').textContent)
  };
  
  return rates;
}
```

---

### Otomatik Kur Farkı Cron Job

```typescript
// app/api/cron/currency-revaluation/route.ts
import { NextResponse } from 'next/server';
import { calculateBulkCurrencyRevaluation } from '@/actions/currency-revaluation';
import { getRatesFromTCMB } from '@/services/tcmb-rates';

export async function POST(req: Request) {
  // Auth kontrolü
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  // Güncel kurları al
  const currentRates = await getRatesFromTCMB();
  
  // Önceki ayın kurlarını al (veritabanından)
  const previousRates = await getPreviousMonthRates();
  
  // Kur farkı hesapla
  const result = await calculateBulkCurrencyRevaluation(
    currentRates,
    previousRates
  );
  
  // Yeni kurları kaydet (gelecek ay için)
  await saveCurrentRates(currentRates);
  
  // Rapor gönder
  if (result.results.length > 0) {
    await sendEmailToAdmin({
      subject: 'Aylık Kur Farkı Raporu',
      body: generateReport(result.results)
    });
  }
  
  return NextResponse.json(result);
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/currency-revaluation.ts` | Ana server actions |
| `src/app/customers/page.tsx` | Müşteri listesi (entegrasyon) |
| `src/app/cash-book/page.tsx` | Kasa defteri (transaction görünümü) |
| `prisma/schema.prisma` | Customer, CustomerTransaction modelleri |

---

## Gelecek Geliştirmeler

- [ ] **TCMB Entegrasyonu:** Otomatik kur çekme
- [ ] **Günlük Kur Takibi:** Her günün kurunu kaydetme
- [ ] **Kur Grafiği:** Döviz kuru trend analizi
- [ ] **Hedge Önerileri:** Kur riskine karşı hedging stratejileri
- [ ] **Vadeli İşlemler:** Forward contract desteği
- [ ] **Multi-Currency Balance:** Müşteri bakiyesini döviz cinsinden de gösterme

---

## Notlar

- **Revalidasyon:** Kur farkı sonrası `/customers` ve `/cash-book` sayfaları otomatik yenilenir
- **Logger:** Tüm işlemler `createLogger('CurrencyRevaluation')` ile loglanır
- **Floating Point:** 0.01 threshold kullanılarak küçük yuvarlama hataları önlenir
- **Transaction Safety:** Her müşteri işlemi try-catch ile korunur

---

**Son Güncelleme:** 25 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Tamamlandı ve Dokümante Edildi
