# CRM Modülü: Cari Hesap Veri Standartları ve İthalat/İhracat

Bu döküman, CRM modülündeki veri giriş süreçlerini ve toplu veri yönetimini en ince teknik ayrıntısına kadar açıklar.

---

## 1. Veri Alanı Spesifikasyonları

Müşteri kartındaki her alanın sistem içindeki teknik rolü:

### Kimlik Bilgileri
*   **Ad / Ünvan:** Sistemde benzersiz olması önerilir. Teklif PDF'lerinde ana başlık olarak kullanılır.
*   **VKN (10 Hane) / TCKN (11 Hane):** Sayısal doğrulama yapılır. OCR modülü, gelen faturadaki vergi numarasını bu alandaki veriyle eşleştirerek faturayı ilgili cariye bağlar.
*   **Vergi Dairesi:** Şehir bilgisiyle uyumlu olması önerilir.

### İletişim ve Adres (Hiyerarşik)
Adres verileri Prisma veritabanında `JSON` objesi olarak saklanır:
*   **Neighborhood (Mahalle):** Lojistik planlama için.
*   **Street/Road (Cadde/Sokak):** Tam lokasyon tespiti.
*   **Building & Apartment No:** Fatura adresi standartları için.
*   **Zip Code:** Posta kodu (5 hane).

---

## 2. Toplu Veri Yönetimi (Import/Export)

**Erişim:** `Cari Hesaplar > [İçeri/Dışarı Aktar]`

### Excel'den Müşteri Aktarımı
1.  **Şablon Hazırlığı:** Excel dosyanızdaki sütun isimleri; `name`, `email`, `phone`, `taxId`, `taxOffice`, `address` şeklinde olmalıdır.
2.  **Yükleme Süreci:** Dosyayı seçtiğinizde sistem bir önizleme sunar. Hatalı satırlar (Örn: Geçersiz e-posta formatı) kırmızı ile işaretlenir.
3.  **Çakışma Yönetimi:** Eğer aynı VKN'ye sahip bir müşteri sistemde varsa, sistem o kaydı güncellemek mi yoksa atlamak mı istediğinizi sorar.

### Veri Dışa Aktarımı
Tüm müşteri listenizi; bakiye bilgileri, etiketler ve son etkileşim tarihleriyle birlikte `.xlsx` veya `.csv` formatında indirebilirsiniz. Bu döküman, harici muhasebe programlarına veri aktarımı için temel teşkil eder.

---

## 3. Finansal İzleme (Transaction & Balance)

### Bakiye Hesaplama Algoritması
Müşteri bakiyesi şu formülle anlık hesaplanır:
`Bakiye = (Onaylı Teklif Tutarları + Manuel Borçlandırmalar) - (Tahsilatlar + İadeler)`

*   **Vade Takibi:** "Son Teklif Tarihi" ve "Bakiye" sütunları yan yana getirilerek, uzun süredir işlem yapmamış ama borcu olan müşteriler tespit edilebilir.

---

## 4. Etkileşim Hafızası (Interaction Logging)

Her kayıt; **Tarih**, **Kullanıcı**, **İletişim Tipi** ve **Detay Not** verilerini saklar.
*   **Dosya Eki:** (Geliştirme Aşamasında) Notlara şantiye fotoğrafları veya tutanak PDF'leri eklenebilecektir.
