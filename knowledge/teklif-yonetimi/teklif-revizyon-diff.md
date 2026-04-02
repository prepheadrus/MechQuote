---
title: Teklif Revizyon ve Diff Analizi
summary: Teklif versiyonları arası finansal ve içerik farklarını analiz eden sistem.
---

# Teknik Bilgi Maddesi: Teklif Revizyon ve Diff Analizi

## Özet
Satış ekibinin revize edilen tekliflerdeki değişiklikleri (fiyat, miktar, kârlılık) net bir şekilde görebilmesi için bir karşılaştırma (Diff) sistemi geliştirilmiştir.

## Teknik Mimari
- **Veri Modeli**: Her revizyon `Proposal` tablosunda yeni bir satır olarak saklanır ve `rootProposalId` ile birbirine bağlanır.
- **Diff Algoritması**: `getProposalDiff` fonksiyonu iki teklif ID'si alır:
  - **Eşleştirme**: Kalemler `productId` veya `name` üzerinden eşleştirilir.
  - **Analiz**: Miktar, liste fiyatı, iskonto ve kâr marjı değişiklikleri tespit edilir.
  - **Sonuç**: `added`, `removed`, `updated` ve `unchanged` olarak dört kategoride raporlanır.

## Kritik Kod Yapısı (`src/actions/proposals.ts`)
```typescript
// Kalem değişikliklerini tespit eden döngü
if (oldItem.quantity !== newItem.quantity) changes.push('quantity');
if (oldItem.profitMargin !== newItem.profitMargin) changes.push('margin');

// Kâr farkı analizi
const diffProfit = newProfit - oldProfit;
const profitDiff = {
    old: oldProfit,
    new: newProfit,
    diff: diffProfit,
    percent: (diffProfit / oldProfit) * 100
};
```

## UI Tasarımı
`ProposalDiffViewer` bileşeni, değişiklikleri görselleştirmek için kullanılır:
- **Renk Kodları**: Pozitif değişimler (kâr artışı) yeşil, negatifler (kâr düşüşü) kırmızı ile gösterilir.
- **Sekmeli Yapı**: "Değişenler", "Eklenenler" ve "Silinenler" ayrı sekmelerde sunularak karmaşıklık önlenir.

## Sorun Giderme ve İyileştirmeler

### NaN Hatası ve Unit Price Hesaplaması (15.02.2026)
**Sorun:** Teklif kalemlerinde `unitPrice` (satış birim fiyatı) veritabanında saklanmadığı için, diff algoritması sırasında bu değer `undefined` veya eksik kalıyordu. Sonuç olarak, arayüzde fiyat değişimleri `NaN` olarak görünüyordu.

**Çözüm:** `getProposalDiff` fonksiyonuna `calculateUnitPrice` yardımcı fonksiyonu eklendi. Bu fonksiyon, her kalem için anlık olarak:
- KDV dahil/hariç durumuna göre net liste fiyatını bulur.
- İskonto oranını düşer.
- Kâr marjını ekler.
- Döviz kurunu (USD/EUR) uygular.

Bu sayede karşılaştırma öncesi tüm kalemler zenginleştirilmiş (`enriched`) veriye dönüştürülür ve `NaN` hatası giderilir.
