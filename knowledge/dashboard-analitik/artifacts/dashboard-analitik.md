# Teknik Bilgi Maddesi: Dashboard ve Veri Görselleştirme

## Özet
Yönetim paneli (Dashboard), Recharts kütüphanesi kullanılarak finansal ve operasyonel verileri dinamik olarak sunacak şekilde optimize edilmiştir.

## Veri Analitiği Teknikleri
- **Kâr Analizi**: Dashboard artık sadece toplam ciroyu değil, teklif kalemlerinin gerçek maliyetleri üzerinden hesaplanan kâr marjını da gösteriyor.
- **Dinamik Trendler**: Son 6 aylık ciro ve kâr verileri `AreaChart` üzerinde birleşik (stacked) değil, ayrı katmanlar olarak gösterilerek performans takibi kolaylaştırıldı.
- **Proje Sağlık İzleyicisi**: Proje bütçe kullanım oranları (`spent / budget`) hesaplanarak `%80` üzeri "Uyarı", `%100` üzeri "Kritik" olarak renk kodlarıyla işaretlendi.

## UI Tasarım Kararları
- **Sekmeli Yapı**: Veri yoğunluğunu yönetmek için Dashboard "Genel Bakış", "Teklif Analizi", "Operasyonel Durum" ve "Envanter" olmak üzere 4 ana sekmeye bölündü.
- **Uyarı ve Hatırlatıcılar**: Kritik stok ve takip edilmesi gereken teklifler sayfa sonuna (bottom) taşınarak ana grafiklerin önü açıldı ve `max-height` ile sınırlandırıldı.

## Kritik Fonksiyon (`dashboard-view.tsx`)
Onaylı teklifler üzerinden gerçek kâr hesaplama mantığı:
```typescript
approvedProposals.forEach(p => {
    p.items.forEach(item => {
        const totals = calculateItemTotals({...});
        totalProfit += totals.totalProfit;
    });
});
```

## Neden Bu Tercih Yapıldı?
Statik listeler yerine görsel grafiklerin kullanılması, yöneticilerin tek bakışta firmanın gidişatını (Kâr marjı, Stok riski vb.) anlamasını sağlamak için yapılmıştır.
