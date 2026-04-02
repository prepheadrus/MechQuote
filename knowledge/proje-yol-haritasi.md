# Proje ve Ekip Yönetimi Geliştirme Haritası (Roadmap)

Bu döküman, projedeki saha ekipleri ve finansal yönetim modüllerinin gelişim aşamalarını ve mevcut durumunu gösterir.

## 📍 Mevcut Konum: "Finansal Temeller ve Esnek Yönetim"

### ✅ Tamamlanan Aşamalar (Faz 1)
1. **Dinamik Ekip Atama**: Tekliften bağımsız olarak projelere sonradan ekip ekleme yeteneği.
2. **Cari Hesap Sistemi (Ledger)**:
   - `PersonnelTransaction` modeli ile Borç/Alacak takibi.
   - `Personnel.balance` ile anlık mutabakat tutarı gösterimi.
3. **Avans ve Borç Yönetimi**:
   - Ekip değişikliğinde ödenen paraların otomatik borç olarak cari hesaba devretmesi.
   - Hakediş (Earning) ve Ödeme (Payment) ayrımı.
4. **Denetim Kayıtları (Audit Logs)**: Tüm kritik ekip/finans işlemlerinin loglanması.
5. **Teknik Hafıza (Documentation)**: Sistemin çalışma mantığının Knowledge Base'e işlenmesi.
6. **12 Aşamalı Proje Yaşam Döngüsü**: Tekliften kesin hesaba kadar tüm operasyonel adımların (Saha Mobilizasyonu, Montaj vb.) dijital takibi.
7. **Dinamik Durum Yönetimi**: Proje detay sayfasından hızlı "Quick Status" geçişleri ve senkronize analitik göstergeler.
8. **Merkezi Biçimlendirme Motoru**: Durumların Analytics ve Müşteri panellerinde tutarlı görsel dil (Badge/Label) ile sunulması.
9. **Detaylı Zaman Çizelgesi (Timeline)**: Proje aşamalarının tarih ve not bazlı tarihçe kaydı (Lifecycle History).
10. **Modern Sekme Mimarisi**: Proje detay sayfasında dikey yığılmayı önleyen, yatayda kaydırılabilir modern tab yapısı.

---

## 🗺️ Yol Haritası (Gelecek Planı)

### 📈 Faz 2: Raporlama ve Analitik (Sıradaki Adım)
- [ ] **Ekip Cari Kartı Paneli**: Her ekibin tüm geçmiş hareketlerini görebileceği detaylı bir liste görünümü.
- [ ] **Proje Karlılık Analizi**: Saha işçilik maliyetlerinin projenin toplam kârına anlık etkisinin görselleştirilmesi.
- [ ] **Otomatik Uyarı Sistemi**: Bakiyesi belirli bir limitin üzerine çıkan (çok borçlu olan) ekipler için uyarı gösterimi.

### 📱 Faz 3: Saha Entegrasyonu
- [ ] **Mobil Saha Girişi**: Ekip liderlerinin yapılan işleri (hakediş talebi) mobil üzerinden girebilmesi.
- [ ] **Dijital Onay Süreci**: Saha hakediş taleplerinin ofis tarafından onaylanıp cari hesaba otomatik işlenmesi.

### 🛡️ Faz 4: Gelişmiş Finans
- [ ] **KDV ve Tevkifat**: Personel ödemelerinde vergi ve kesinti kalemlerinin otomatik hesaplanması.
- [ ] **Banka Entegrasyonu**: Ödemelerin toplu halde banka formatına (EFT/Havale) dönüştürülmesi.

---

## 🛠️ Teknik Sağlık Durumu
- **Model Güvencesi**: Prisma şeması cari sistemi destekleyecek şekilde güncellendi.
- **Veri Tutarlılığı**: Transaction-base bakiye yönetimi ile kuruş farkları önlendi.
- **Lint Durumu**: TypeScript tip uyumlulukları üzerinde çalışmalar devam ediyor.
