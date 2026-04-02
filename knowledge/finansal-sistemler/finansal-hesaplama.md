# Güvenli Finansal Hesaplama

## 📋 Genel Bakış

**Amaç:** JavaScript floating point hatalarını önlemek, güvenli para hesaplamaları sağlamak.

**Sorun:** `0.1 + 0.2 = 0.30000000000000004`

**Çözüm:** Safe rounding helper fonksiyonları.

---

## 📁 Dosyalar

### `src/lib/pricing.ts`

**Görev:** Güvenli finansal hesaplama

**Özellikler:**
- ✅ Safe rounding (4 basamak ara, 2 basamak nihai)
- ✅ Helper fonksiyonlar
- ✅ KDV hesaplama
- ✅ İskonto/Kâr marjı

---

## 🔧 Helper Fonksiyonlar

### Yuvarlama

```typescript
round(num, decimals)           // 4 basamak (ara işlemler)
roundCurrency(num)             // 2 basamak (kuruş)
```

### Yüzde/İskonto

```typescript
percentageOf(value, percentage) // %20 = 0.20
applyDiscount(price, rate)      // Liste fiyatı - iskonto
```

### Kâr Marjı

```typescript
applyProfitMargin(cost, margin) // Maliyet + kâr
```

### KDV

```typescript
calculateVat(amount, rate)      // KDV tutarı
addVat(amount, rate)            // KDV dahil
removeVat(amount, rate)         // KDV hariç
```

---

## 📊 Güvenlik Önlemleri

### Floating Point Hatası

```typescript
// ❌ Güvensiz
0.1 + 0.2 = 0.30000000000000004

// ✅ Güvenli
round(0.1 + 0.2, 4) = 0.3
```

### Yuvarlama

```typescript
// Ara işlemler (4 basamak)
round(100.123456, 4) = 100.1235

// Nihai tutar (2 basamak)
roundCurrency(100.126) = 100.13
```

---

## 📋 Kullanım

### Tam Hesaplama

```typescript
import { calculateItemTotals } from '@/lib/pricing';

const result = calculateItemTotals({
  listPrice: 100,
  basePrice: 0,
  discountRate: 0.20,      // %20 iskonto
  profitMargin: 0.25,      // %25 kâr
  exchangeRate: 1,
  quantity: 10,
  vatRate: 0.20,           // %20 KDV
  priceIncludesVat: false
});

// result.cost = 80 (100 - %20)
// result.originalSellPrice = 100 (80 + %25)
// result.totalVatAmount = 20 (%20 KDV)
// result.totalTlSell = 120 (100 + 20)
```

### Manuel Hesaplama

```typescript
import { 
  applyDiscount, 
  applyProfitMargin, 
  calculateVat,
  roundCurrency 
} from '@/lib/pricing';

// 100 TL ürün, %20 iskonto
const cost = applyDiscount(100, 0.20);     // 80 TL

// %25 kâr ekle
const sellPrice = applyProfitMargin(80, 0.25);  // 100 TL

// %20 KDV ekle
const vat = calculateVat(100, 0.20);       // 20 TL
const total = roundCurrency(100 + 20);     // 120 TL
```

---

## 📅 Güncellemeler

| Tarih | Değişiklik |
|-------|------------|
| 20.02.2026 | İlk oluşturma - Görev #7 tamamlandı |

---

**Oluşturulma:** 20 Şubat 2026 Cuma - 23:00  
**Görev:** #7 - Floating Point Para Hesaplamaları ✅
