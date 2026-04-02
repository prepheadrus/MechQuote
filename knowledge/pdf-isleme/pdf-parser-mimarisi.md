---
title: PDF Parser Mimarisi
summary: Koordinat tabanlı PDF veri ayıklama ve TypeScript tip güvenliği çözümleri.
---

# Teknik Bilgi Maddesi: PDF Veri Ayıklama ve İşleme (PDF Parser)

## Özet
Uygulama, gelen PDF dökümanlarından (örneğin tedarikçi listeleri) otomatik veri ayıklama yeteneğine sahiptir. Bu işlem `pdf-lib` ve özel bir koordinat tabanlı parser mantığı ile yürütülür.

## Teknik Zorluklar ve Çözümler
- **TypeScript Hataları**: Parser içerisinde `sortedItems` dizisi işlenirken, PDF objelerinin belirsiz tipleri (TextItem vs TextMarkedContent) TypeScript uyarılarına neden oluyordu.
- **Çözüm (Type Predicates)**: Gelişmiş bir filtreleme fonksiyonu (`isTextItem`) kullanılarak, sadece beklediğimiz özelliklere (`transform`, `str`) sahip objelerin işlenmesi sağlandı.

## Veri Eşleştirme Stratejisi
PDF'den okunan metinler, koordinat sistemine (y-axis) göre gruplanarak satırlara bölünür. Bu satırlar daha sonra regex ve mesafe algoritmaları ile şu alanlara ayrıştırılır:
- Ürün Adı / Marka / Model
- Birim Fiyat ve Para Birimi
- Miktar ve Birim

## Kritik Kod Yapısı (`src/lib/pdf-parser.ts`)
```typescript
const isTextItem = (item: any): item is TextItem => {
    return 'str' in item && 'transform' in item;
};

// ...
const sortedItems = items.filter(isTextItem).sort((a, b) => {
    if (a.transform[5] !== b.transform[5]) return b.transform[5] - a.transform[5];
    return a.transform[4] - b.transform[4];
});
```

## Neden Bu Tercih Yapıldı?
Manuel veri girişini azaltmak ve teklif hazırlama süresini kısaltmak için koordinat tabanlı bir veri ayıklama motoru tercih edilmiştir.
