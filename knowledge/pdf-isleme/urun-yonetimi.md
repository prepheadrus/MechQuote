---
title: Ürün Yönetimi ve Fiyatlandırma
summary: Ürün listeleme, eşleştirme ve geçmiş fiyat analizi ile ilgili bilgileri içerir.
---

# Ürün Yönetimi

## Satın Alma Geçmişi Fiyat Gösterimi (15.02.2026)
Ürün detaylarında gösterilen "Satın Alma Geçmişi" tablosunda, iskonto oranı veritabanındaki `discountRate` alanından değil, dinamik olarak `(Liste Fiyatı - Net Fiyat) / Liste Fiyatı` formülüyle hesaplanarak gösterilmeye başlanmıştır.

### Neden?
Veritabanında bazen `0.45` (%45), bazen `45` (%45) gibi farklı formatlarda veri tutulabilmesi veya yanlış veri girişi (örn: 2300) nedeniyle kullanıcı arayüzünde "%2300" gibi hatalı gösterimler oluşuyordu.
Parasal değerler (`netPrice`, `listPrice`) kesin olduğu için oran bu değerlerden türetilerek her zaman doğru sonucun gösterilmesi sağlandı.

```typescript
const rate = record.listPrice > 0
    ? ((record.listPrice - record.netPrice) / record.listPrice) * 100
    : 0;
// Sonuç: %25.5 veya %10
```

## Ürün Detay Sayfası Modernizasyonu (Server Actions)
Ürün detay sayfası, performans ve güvenlik gerekçeleriyle **Server Component** yapısına dönüştürülmüştür.

- **Eski Yöntem:** İstemci tarafında (`useEffect`) veri çekme (Client-side fetching).
- **Yeni Yöntem:** Sunucu tarafında (`page.tsx`) `Promise.all` ile paralel veri çekme (`getProductDetails` + `getPurchasingInsights`) ve bileşenlere prop olarak geçme.
- **Avantajı:** Sayfa yüklendiğinde veriler hazır olur (SSR), SEO dostudur ve API key (Gemini) istemcide görünmez.
+
+## Hızlı Ürün Oluşturma ve Akıllı Eşleştirme (17.02.2026)
+Teklif hazırlama sırasında katalogda bulunmayan ürünler için `GenericProductMatcher` ve `QuickAddProduct` bileşenleri geliştirilmiştir.
+
+- **Smart Defaults:** Yeni ürün eklenirken `stockQuantity`, `reservedQuantity` ve `minStockLevel` alanları artık sunucu tarafında (`createProduct`) opsiyoneldir ve varsayılan olarak `0` atanır. Bu, front-end formlarının sadece gerekli teknik verilere odaklanmasını sağlar.
+- **Joker Kod:** Manuel eklenen ürünler için `AUTO-[TIMESTAMP]` formatında otomatik benzersiz kod üretimi desteklenmektedir.
+
+- **Grup Bazlı Organizasyon:** Teklif kalemlerine `groupName` alanı eklendi. Bu sayede teklifler içerisinde kalemler "Mekanik", "Elektrik", "Genel" gibi mantıksal gruplara ayrılarak PDF çıktılarında ve UI'da daha düzenli gösterilmektedir. `SmartProposalImporter` artık ithal edilen kalemler için varsayılan olarak "Genel" grubunu atamaktadır.

## Mükerrer Kayıt (Duplicate) Yönetimi
+Sistemde aynı isimle açılmış farklı ürün kartlarını temizlemek için "Birleştirme" (Merge) mekanizması kurulmuştur.
+
+- **Mantık:** İki veya daha fazla ürün birleştirildiğinde;
+    1. Tüm `InvoiceItem` (Fatura kalemleri) referansları hedef ürüne aktarılır.
+    2. Tüm `ProposalItem` (Teklif kalemleri) referansları hedef ürüne aktarılır.
+    3. Kaynak ürünler silinerek veri bütünlüğü korunur.
+- **Bileşen:** `MergeProductsDialog`
+- **Servis:** `src/actions/maintenance.ts` içindeki `findDuplicateProducts` normalleştirilmiş isim karşılaştırması yapar.
