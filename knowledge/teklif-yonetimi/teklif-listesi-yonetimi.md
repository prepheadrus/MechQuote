---
title: Teklif Listesi Yönetimi
summary: Teklif listesi gruplama mantığı ve performans iyileştirmelerini kapsar.
---

# Teklif Listesi

## Gruplama ve Performans (15.02.2026)
Teklifler, "Müşteri" > "Teklif Grubu" > "Versiyon" hiyerarşisinde gruplanır.

### Key Prop Hatası
`QuoteListGroupedView` bileşeninde `customerGroups.map` işlemi sırasında, eğer `customerId` verisi eksikse (null/undefined) veya veritabanındaki tutarsızlıklar nedeniyle birden fazla "Bilinmeyen Müşteri" grubu oluşursa React "Warning: Each child in a list should have a unique 'key' prop." hatası verir.

**Çözüm:** `customerId` olmayan durumlarda unique key sağlamak için grup indexi fallback olarak kullanılmaya başlanmıştır:
```typescript
key={customerGroup.customerId || `customer-group-${index}`}
```

Bu sayede liste rendering performansı artırılmış ve konsol hataları giderilmiştir.

## Navigasyon ve Sekme Yönetimi (16.02.2026)

### Workspace Tab Mimarisi
Kullanıcı deneyimini (UX) iyileştirmek amacıyla, teklif listesinden detay sayfalarına geçişlerde **"Yeni Uygulama Sekmesi"** (Workspace Tabs) stratejisi benimsenmiştir.
- **Davranış:** Teklif listesindeki "Görüntüle" butonları artık mevcut görünümü değiştirmek yerine `WorkspaceContext` üzerinden yeni bir uygulama sekmesi açar.
- **Fonksiyon:** `openTab(url: string, label: string)`
- **Başlık Formatı:** Sekme başlıkları dinamikleştirilmiştir: `[Müşteri Adı] - [Teklif No] (v[Versiyon No])`.
  - Örnek: `Beymen Club - TF-2024-001 (v1)`

### openTab State Yönetimi İyileştirmesi
`WorkspaceContext` içerisindeki `openTab` fonksiyonu, React render döngüsü hatalarını ("Cannot update component while rendering") önlemek için yeniden düzenlenmiştir:
- **Eski Yaklaşım:** Sadece `router.push()` yapılıyor, sekme oluşturma işlemi `useEffect` içinde reaktif olarak yönetiliyordu. Bu durum, aynı URL'ye yapılan çağrılarda tutarsızlığa ve bazı durumlarda state güncelleme hatalarına yol açıyordu.
- **Yeni Yaklaşım:** Fonksiyon artık manuel state yönetimi yapar:
    1. Hedef URL'ye ait sekme var mı kontrol et.
    2. Varsa o sekmeyi aktif yap (`setActiveTabId`).
    3. Yoksa yeni sekme objesi oluşturup `tabs` state'ine ekle.
    4. Yönlendirmeyi (`router.push`) en son yap.
    5. Tüm bu işlemler `setTabs` callback'inin dışında, güvenli bir şekilde gerçekleştirilir.

## Liste Görünümü ve Bilgi Yoğunluğu (19.02.2026)

Teklif Arşivi sayfasında kullanıcıların daha hızlı karar verebilmesi için liste görünümleri (Grouped ve Flat) zenginleştirilmiştir.

### Gelişmiş Bilgi Görünümü
- **Proje / Açıklama Sütunu:** Grup görünümündeki revizyon tablosuna (inner table) projenin ismini/açıklamasını içeren yeni bir sütun eklenmiştir. Bu sayede farklı revizyonlarda değişen proje isimleri detay sayfasına girmeden görülebilir.
- **Tarih Bilgisi:**
    - **Grup Görünümü:** Ana özet satırına projenin son güncellenme tarihi eklenmiştir.
    - **Liste Görünümü:** Her teklif satırına `createdAt` bilgisini gösteren "Tarih" sütunu eklenmiştir.
- **UI Refactoring:**
    - Sütun genişlikleri (col-span) veri yoğunluğuna göre optimize edilmiştir.
    - Metin boyutları ve badge stilleri (Atandı, Durum vb.) daha kompakt bir görünüm için revize edilmiştir.

### Arayüz Temizliği (Cleanup)
- **Mükerrer Bileşen Kaldırma:** Sayfada hem üstte hem altta görünen "Akıllı Teklif Sihirbazı" (SmartProposalImporter) çubukları teke indirilmiştir. 
    - Sayfa bazlı yerel çağrı kaldırılmış, `AppLayout` içerisindeki global çağrı merkezi yapı olarak korunmuştur.
    - Üst buton grubundaki "Akıllı Teklif Oluştur" butonu hızlı erişim için bırakılmıştır.
