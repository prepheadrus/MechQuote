# Teknik Bilgi Maddesi: Maliyet ve Fiyatlandırma Mantığı

## Özet
Uygulama genelinde teklif kalemlerinin maliyet, satış fiyatı ve kâr hesaplamaları merkezi bir mantığa (`src/lib/pricing.ts`) dayanmaktadır.

## Teknik Detaylar
- **KDV Normalizasyonu**: Kullanıcı KDV oranını tamsayı (örn: 20) veya ondalık (örn: 0.20) olarak girse bile sistem bunu otomatik olarak normalize eder.
- **Maliyet Hesaplama**: 
  - Eğer tedarikçi liste fiyatı (`listPrice`) varsa: `Maliyet = Liste Fiyatı * (1 - İskonto)`.
  - Liste fiyatı yoksa `basePrice` doğrudan maliyet kabul edilir.
- **Satış Fiyatı**: `Satış Fiyatı = Maliyet * (1 + Kâr Marjı)`.
- **Döviz Çevrimi**: Hesaplamalar önce orijinal para biriminde yapılır, ardından teklif tarihindeki (`exchangeRateUSD/EUR`) kurlar kullanılarak TL'ye çevrilir.

## Kritik Kod Parçası (`calculateItemTotals`)
```typescript
const cost = netListPrice > 0
    ? netListPrice * (1 - discountRate)
    : netBasePrice;
const originalSellPrice = cost * (1 + profitMargin);
```

## Önemli Notlar
Fiyatların KDV dahil girilip girilmediği (`priceIncludesVat`) kontrol edilerek, tüm hesaplamalar net (KDV hariç) değerler üzerinden yürütülür.
