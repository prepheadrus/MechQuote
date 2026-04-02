---
title: Maliyet ve Fiyatlandırma Mantığı
summary: MechQuote projesindeki maliyet hesaplama, KDV normalizasyonu ve kâr marjı kuralları.
---

# Teknik Bilgi Maddesi: Maliyet ve Fiyatlandırma Mantığı (GÜNCEL)

## Özet
Uygulama genelinde teklif kalemlerinin maliyet, satış fiyatı ve kâr hesaplamaları merkezi bir mantığa (`src/lib/pricing.ts`) dayanmaktadır.

## Teknik Detaylar
- **KDV Normalizasyonu**: Kullanıcı KDV oranını tamsayı (örn: 20) veya ondalık (örn: 0.20) olarak girse bile sistem bunu otomatik olarak normalize eder.
- **Maliyet Hesaplama**: 
  - Eğer tedarikçi liste fiyatı (`listPrice`) varsa: `Maliyet = Liste Fiyatı * (1 - İskonto)`.
  - Liste fiyatı yoksa `basePrice` doğrudan maliyet kabul edilir.
- **Satış Fiyatı**: `Satış Fiyatı = Maliyet * (1 + Kâr Marjı)`.
- **Döviz Çevrimi**: Hesaplamalar önce orijinal para biriminde yapılır, ardından teklif tarihindeki (`exchangeRateUSD/EUR`) kurlar kullanılarak TL'ye çevrilir.

## Hassasiyet ve Yuvarlama (Safe Rounding)
JavaScript'in ondalık sayı (floating point) saklama biçiminden kaynaklanan `29.9999999` gibi hataları önlemek için sistem **Safe Rounding** katmanıyla çalışır.
- **Ara Hesaplamalar**: 4 basamak hassasiyet (`Number.EPSILON` desteğiyle).
- **Nihai TL Tutarlar**: Kesinlikle 2 basamak (kuruş) yuvarlaması.

## Kritik Kod Parçası (`calculateItemTotals`)
```typescript
const round = (num: number, decimals: number = 4) => {
  return Math.round((num + Number.EPSILON) * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

const cost = round(netListPrice > 0 ? netListPrice * (1 - discountRate) : netBasePrice);
const tlSellPrice = round(originalSellPrice * exchangeRate, 2);
```

## Önemli Notlar
Fiyatların KDV dahil girilip girilmediği (`priceIncludesVat`) kontrol edilerek, tüm hesaplamalar net (KDV hariç) değerler üzerinden yürütülür.

## Proje Maliyet Ayrıştırması (17.02.2026)
Tekliften projeye geçişte tahmini maliyetler (`estimatedMaterialCost` ve `estimatedLaborCost`) şu şekilde ayrıştırılır:
- **Malzeme Maliyeti:** Teklif kalemlerinden kategorisi 'İşçilik' olmayan ürünlerin `basePrice` toplamları (İlgili döviz kuruyla çarpılarak).
- **İşçilik Maliyeti:** Teklif üzerindeki `jobAssignments` (Ekip Atamaları) toplamı. Bu, projenin gerçek "source of truth" işçilik maliyeti olarak kabul edilir.
- **Dinamik Kontrol:** `projects.ts` içerisinde ürünlerin kategorileri anlık olarak çekilir ve 'İşçilik' kategorisindekiler malzeme maliyetinden düşülür.
