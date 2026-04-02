---
title: Teklif Analiz, Ara Toplam ve İcmal Sistemi
summary: Teklif hazırlama ekranındaki grup bazlı ara toplam hesaplamaları, finansal analiz özetleri ve yazdırma şablonuna entegre edilen icmal tablosu mimarisi.
---

# Teknik Bilgi Maddesi: Teklif Analiz, Ara Toplam ve İcmal Sistemi

## Özet
Çok kalemli ve karmaşık tekliflerde finansal kontrolü ve okunabilirliği artırmak amacıyla, sistem grup bazlı ara toplamlar ve merkezi bir "Teklif İcmali" (Summary) yapısıyla geliştirilmiştir. Bu sistem hem hazırlama aşamasında (`Interactive UI`) hem de çıktı aşamasında (`PDF/Print`) tutarlılık sağlar.

## Teknik Mimari

### 1. Grup Bazlı Ara Toplamlar (UI)
- **Konum**: `QuoteDetailClientPage` bileşeni içerisinde, her grubun başlık (`Group Header`) alanında.
- **Mantık**: Grubun içindeki tüm kalemlerin `totalTlSell` (KDV Hariç Mevcut Kur Üzerinden TL Satış) değerleri toplanır.
- **Performans**: React Hook Form'un `useWatch` kancası kullanılarak, standart `watch` yöntemine göre daha derin ve güvenilir bir reaktivite sağlanmıştır. Kalem adetleri, fiyatlar veya indirimler değiştiği anda `useMemo` tetiklenerek toplamlar anlık güncellenir.
- **Grup Bazlı Kontroller**: Grup başlığında İskonto ve Kâr Marjı için iki ayrı "Uygula" (Uygula - Turuncu ve Uygula - Yeşil) butonu sunulur. Bu sayede grup seviyesinde tekil finansal müdahaleler yapılabilir.
- **Görünüm**: Grup kapalı/daraltılmış olsa bile ara toplam sağ tarafta belirgin (`bold text-slate-700`) bir şekilde görünmeye devam eder.

### 2. Yapışkan Aksiyon Çubuğu (Sticky Action Bar - NEW)
Teklif hazırlama sayfasının altına sabitlenen bu bar, teklifin anlık finansal durumunu özetler:
- **Tasarım**: `backdrop-blur-xl` (buzlu cam), `bg-white/95` (pastel beyaz) ve `border-4 border-orange-600` (kalın turuncu çerçeve) ile yüksek fark edilebilirlik.
- **Detaylı Finansal Döküm**:
    - **KDV Hariç Modu**: Sadece büyük "Teklif Toplamı" ve "İskonto/Net Kâr" özeti.
    - **KDV Dahil Modu**: Matrah, KDV (Ortalama % Oranıyla) ve Genel Toplam yan yana listelenerek tam muhasebe dökümü sunulur.
- **Hızlı Aksiyonlar**: PDF indir, Şablon yap, Versiyon geçmişi karşılaştır ve Yeni Versiyon oluştur aksiyonları merkezileştirilmiştir.

### 3. Yazdırma (PDF) Entegrasyonu
Yazdırılan dökümanda (`PrintDocument.tsx`) verilerin sunumu yeniden optimize edilmiştir:
- **Grup Ara Toplam Satırları**: Her grup tablosunun bitimine, o grubun dökümünü kapatan bir ara toplam satırı eklenmiştir.
- **İcmal Tablosu**: Teklifin sonunda tüm bölümleri listeleyen, kalem dökümünden bağımsız bir özet tablo oluşturulmuştur.
- **Blok Yapısı**: İcmal tablosu ve genel toplamlar `break-inside-auto` kurallarıyla birleştirilerek sayfa sonu boşlukları (white space) minimize edilmiştir.

## Kritik Kod Yapıları

### Hazırlama Ekranı Hesaplama Mantığı (`QuoteDetailClientPage`)
```typescript
{groupOrder.map((groupName) => {
    const groupItems = fields.map((f, i) => ({ ...f, ...watchedItems[i] }))
                             .filter(f => (f.groupName || 'Diğer') === groupName);
    const subtotal = groupItems.reduce((sum, item) => sum + (item.totalTlSell || 0), 0);
    // ... UI render
})}
```

### Yazdırma Ekranı Veri Hazırlığı (`PrintDocument`)
```typescript
const { groupedItems, sortedGroupNames, groupTotals } = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const totals: Record<string, number> = {};
    teklif.items.forEach((item) => {
        const gName = item.groupName || 'Diğer';
        if (!groups[gName]) { groups[gName] = []; totals[gName] = 0; }
        groups[gName].push(item);
        totals[gName] += item.total;
    });
    return { groupedItems, sortedGroupNames, groupTotals: totals };
}, [teklif.items]);
```

## Kritik Dosyalar
- `src/app/quotes/[id]/quote-detail-client-page.tsx`: Etkileşimli ara toplamlar ve analiz paneli.
- `src/components/app/print-document.tsx`: Yazdırma şablonuna eklenen icmal tablosu ve ara toplam satırları.
- `src/lib/pricing.ts`: Temel hesaplama fonksiyonları.

---
*İmza: Mekanik Teklif Analitik Sistemi (19.02.2026)*
