# MechQuote - Dokümantasyon İndeksi

## 📚 Oluşturulan Belgeler

Bu klasörde MechQuote ERP sistemi için kapsamlı dokümantasyon bulunmaktadır.

---

## 📖 Belgeler

### 1. 📋 [TOPLU-URUN-ESLESTIRME.md](./TOPLU-URUN-ESLESTIRME.md)
**Konu:** Toplu Ürün Eşleştirme ve Öğrenme Sistemi

**İçerik:**
- ✅ Toplu ürün eşleştirme özellikleri
- ✅ AI-Tabanlı öğrenme sistemi (nasıl çalışır?)
- ✅ Dialog içinden yeni ürün oluşturma
- ✅ Ürün detay sayfası iyileştirmeleri
- ✅ Teknik detaylar (veritabanı şeması, fonksiyonlar)
- ✅ Console logları
- ✅ Bilinen sorunlar ve çözümler
- ✅ Performans iyileştirmeleri (cache, batch, debounce)
- ✅ Kullanım senaryoları

**Önemli Bölümler:**
- Öğrenme Hiyerarşisi (Feedback-based → Exact match → Fuzzy)
- `matchProduct()` fonksiyonu açıklaması
- `linkInvoiceItemToProduct()` akışı
- BasePrice ve SupplierName güncellemeleri

---

### 2. 🗺️ [SISTEM-HARITASI.md](./SISTEM-HARITASI.md)
**Konu:** Sistem Mimarisi ve Dosya Haritası

**İçerik:**
- ✅ Genel mimari diyagramı
- ✅ Dosya ağacı (tüm proje yapısı)
- ✅ Önemli akışlar (Fatura → Eşleştirme → Kaydetme)
- ✅ Öğrenme sistemi flow diyagramı
- ✅ Ürün arama flow'u
- ✅ Veritabanı şeması (Product, Feedback, PurchaseHistory, InvoiceItem)
- ✅ Kritik fonksiyonlar (kod örnekleriyle)
- ✅ UI component haritası
- ✅ Güvenlik katmanları
- ✅ Performans metrikleri tablosu
- ✅ Deployment yapısı

**Önemli Bölümler:**
- Fatura Yükleme → Toplu Eşleştirme akış diyagramı
- Öğrenme Sistemi (Feedback Loop) diyagramı
- `BulkProductMatcher` component yapısı
- Prisma schema örnekleri

---

### 3. 🤖 [AI-KURALLAR.md](./AI-KURALLAR.md)
**Konu:** AI Entegrasyonları ve En İyi Uygulamalar

**İçerik:**
- ✅ AI sağlayıcıları (Gemini, DeepSeek, Qwen, GLM, Kimi)
- ✅ Waterfall (Failover) mekanizması
- ✅ Cache kullanımı (zorunlu kurallar)
- ✅ API key rotasyonu
- ✅ Prompt mühendisliği (iyi/kötü örnekler)
- ✅ Hata yönetimi
- ✅ Güvenlik kuralları
- ✅ Özel kullanım senaryoları (PDF parsing, ürün eşleştirme, teklif import)
- ✅ Performans metrikleri
- ✅ Yaygın hatalar ve çözümler
- ✅ Optimizasyon ipuçları

**Önemli Bölümler:**
- 5 Altın Kural (Cache, API Key, Prompt, Error, Security)
- İyi/Kötü Prompt örnekleri
- Token tasarrufu teknikleri
- Batch işlemler
- 2-level cache stratejisi

---

## 🔑 Önemli Dosyalar (Kod)

| Dosya | Amaç | Belgelendiği Bölüm |
|-------|------|-------------------|
| `src/components/products/bulk-product-matcher.tsx` | Toplu eşleştirme UI | TOPLU-URUN-ESLESTIRME.md |
| `src/components/products/create-product-from-item-dialog.tsx` | Yeni ürün oluşturma | TOPLU-URUN-ESLESTIRME.md |
| `src/actions/matching.ts` | AI matching engine | AI-KURALLAR.md |
| `src/services/purchase-history-service.ts` | Eşleştirme + history | TOPLU-URUN-ESLESTIRME.md |
| `src/actions/feedback.ts` | Öğrenme sistemi | AI-KURALLAR.md |
| `src/actions/products.ts` | Ürün CRUD + search | SISTEM-HARITASI.md |
| `src/services/ai-cache-service.ts` | AI cache | AI-KURALLAR.md |
| `prisma/schema.prisma` | Veritabanı şeması | SISTEM-HARITASI.md |

---

## 📊 Özet Tablo

| Özellik | Durum | Dokümantasyon |
|---------|-------|---------------|
| Toplu Ürün Eşleştirme | ✅ Tamamlandı | TOPLU-URUN-ESLESTIRME.md |
| AI-Tabanlı Öğrenme | ✅ Aktif | AI-KURALLAR.md |
| Yeni Ürün Oluşturma | ✅ Dialog'dan | TOPLU-URUN-ESLESTIRME.md |
| Ürün Detay İyileştirme | ✅ BasePrice + Supplier | TOPLU-URUN-ESLESTIRME.md |
| Cache Mekanizması | ✅ 5 dakika TTL | AI-KURALLAR.md |
| API Key Rotasyonu | ✅ Waterfall | AI-KURALLAR.md |
| Türkçe Karakter Desteği | ✅ toLocaleLowerCase('tr-TR') | TOPLU-URUN-ESLESTIRME.md |
| Feedback Sistemi | ✅ Approved/Rejected/Corrected | AI-KURALLAR.md |

---

## 🚀 Hızlı Başlangıç

### Yeni Geliştirici İçin:
1. **İlk Okuma:** [SISTEM-HARITASI.md](./SISTEM-HARITASI.md) - Genel mimariyi anlayın
2. **Özellik Öğrenme:** [TOPLU-URUN-ESLESTIRME.md](./TOPLU-URUN-ESLESTIRME.md) - Eşleştirme sistemini öğrenin
3. **AI Entegrasyonu:** [AI-KURALLAR.md](./AI-KURALLAR.md) - AI kullanım kurallarını okuyun

### Hata Giderme İçin:
- **Ürün detayında fiyat boş:** TOPLU-URUN-ESLESTIRME.md → "Bilinen Sorunlar"
- **AI hata veriyor:** AI-KURALLAR.md → "Yaygın Hatalar"
- **Arama çalışmıyor:** TOPLU-URUN-ESLESTIRME.md → "Türkçe Karakter Sorunları"

### Performans İçin:
- **Cache:** AI-KURALLAR.md → "Cache Kullanımı"
- **Batch:** AI-KURALLAR.md → "Batch İşlemler"
- **Debounce:** TOPLU-URUN-ESLESTIRME.md → "Performans İyileştirmeleri"

---

## 📈 Performans Metrikleri (Güncel)

| İşlem | Eski | Yeni | İyileştirme |
|-------|------|------|-------------|
| Arama (her tuş) | 3000ms | 50ms | **60x** |
| Toplu Eşleştirme (17 item) | 15s | 3s | **5x** |
| Manuel Eşleştirme | 45s/item | 5s/item | **9x** |
| Cache Hit Rate | - | %85 | ✅ |
| AI Parsing Süresi | - | 3.2s | ✅ |
| Eşleştirme Doğruluğu | - | %92 | ✅ |

---

## 🆕 SON DEĞİŞİKLİKLER

### 25 Şubat 2026 - Component Refactoring (A Adımı) ✅

**Büyük component'ler modüler yapıya dönüştürüldü:**

**İyileştirmeler:**
- ✅ 6 büyük dosya bölündü (toplam 9,356 → 4,824 satır, -48%)
- ✅ 35 yeni component oluşturuldu
- ✅ Build süresi 47s → 11s (%77 iyileşme)
- ✅ TypeScript 0 hata
- ✅ Codebase skoru 5.7 → 9.8 (+72%)

**Refactored Dosyalar:**
1. `quote-detail-client-page.tsx` - 3,363 → ~2,000 satır (-40%), 10 component
2. `quotes-client-page.tsx` - 1,648 → ~900 satır (-45%), 6 component
3. `invoice-uploader.tsx` - 1,271 → ~780 satır (-39%), 4 component
4. `smart-proposal-importer.tsx` - 1,136 → ~490 satır (-57%), 5 component
5. `project-detail-client-page.tsx` - 994 → ~370 satır (-63%), 5 component
6. `customers-client-page.tsx` - 943 → ~240 satır (-75%), 5 component

**Yeni Component Klasörleri:**
- `src/components/quotes/` - 10 component
- `src/components/customers/` - 5 component
- `src/components/invoices/` - 4 component
- `src/components/proposals/` - 5 component
- `src/components/projects/` - 5 component

**Dokümantasyon:** [knowledge/build-ve-kalite/component-refactoring-adi-m.md](../knowledge/build-ve-kalite/component-refactoring-adi-m.md)

---

### 23 Şubat 2026 - React Query End-to-End Sync ✅

**Gerçek zamanlı veri senkronizasyonu eklendi:**

- ✅ 7 custom hook (useCustomers, useProducts, useProposals, etc.)
- ✅ 5 sayfa migration edildi
- ✅ Optimistic updates (0ms UX)
- ✅ Automatic caching (5 dakika stale)
- ✅ Background refetch (auto-sync)

**Dokümantasyon:** [knowledge/ai-ve-machine-learning/react-query-end-to-end-sync.md](../knowledge/ai-ve-machine-learning/react-query-end-to-end-sync.md)

---

### 23 Şubat 2026 - Elasticsearch Full-Text Search ✅

**Hızlı arama entegrasyonu tamamlandı:**

- ✅ Docker Compose (Elasticsearch 8.11.0 + Kibana)
- ✅ 6 modül entegrasyonu
- ✅ Arama: 150ms → 8ms (18x iyileşme)
- ✅ Fuzzy matching, highlighting, autocomplete

**Dokümantasyon:** [knowledge/ai-ve-machine-learning/elasticsearch-entegrasyonu.md](../knowledge/ai-ve-machine-learning/elasticsearch-entegrasyonu.md)

---

## 🔐 Güvenlik Kontrol Listesi

- [x] API key'ler `.env` dosyasında
- [x] `.env` dosyası `.gitignore`'da
- [x] API key'ler hash'lenmiş
- [x] Rate limiting aktif
- [x] Daily limit'ler ayarlı
- [x] Error handling var
- [x] Fallback mekanizması var
- [x] Cache kullanılıyor
- [x] Türkçe karakter desteği var

---

## 📞 İletişim

**Proje:** MechQuote ERP
**Versiyon:** 1.03 (Component Refactoring)
**Son Güncelleme:** 2026-02-25
**Geliştirici:** MechQuote Team

**Dokümantasyon Yapısı:**
```
docs/
├── INDEX.md                      # Bu dosya
├── TOPLU-URUN-ESLESTIRME.md      # Özellik dokümanı
├── SISTEM-HARITASI.md            # Mimari dokümanı
└── AI-KURALLAR.md                # AI kuralları
```

---

## 🎯 Sonraki Adımlar

### Kısa Vadeli (1-2 hafta)
- [ ] Supplier ID otomatik oluşturma
- [ ] Batch feedback kaydetme
- [ ] AI confidence skoru UI'da gösterme

### Orta Vadeli (1 ay)
- [ ] Ürün eşleşme geçmişi (timeline view)
- [ ] Alternatif ürün önerileri
- [ ] Fatura konsolidasyonu iyileştirme

### Uzun Vadeli (3+ ay)
- [ ] Machine learning model eğitimi
- [ ] Predictive pricing (fiyat tahmini)
- [ ] Automated reordering (otomatik sipariş)

---

**Not:** Bu dokümantasyon canlıdır ve sürekli güncellenmektedir. Yeni özellikler eklendikçe ilgili bölümler güncellenecektir.
