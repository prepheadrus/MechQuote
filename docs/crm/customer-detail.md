# CRM Modülü: Müşteri Kaydı ve Veri Alanı Tanımları

Müşteri bilgilerinin eksiksiz ve standartlara uygun girilmesi, tekliflerin profesyonelliği ve fatura eşleştirmelerinin doğruluğu için temel şarttır.

---

## 1. Yeni Cari Hesap Formu: Alan Detayları

Yeni bir müşteri eklerken karşılaşılan form alanları ve teknik gereklilikleri şunlardır:

### Temel Kimlik Bilgileri
*   **Ad / Ünvan (Zorunlu):** Şahıs ise Ad-Soyad, tüzel kişilik ise tam ticari ünvan. Teklif kapaklarında bu alan görünür.
*   **VKN / TCKN:** Vergi Kimlik Numarası veya TC Kimlik Numarası. 
    *   *Teknik Önemi:* OCR modülü faturadaki VKN ile sistemdeki VKN'yi eşleştirerek faturaları ilgili müşteriye otomatik atar.
*   **Vergi Dairesi:** Resmi dökümanlar ve PDF çıktıları için gereklidir.

### İletişim Verileri
*   **E-posta Adresi:** Tekliflerin ve bilgilendirmelerin gönderileceği ana adres. "Email" ikonuna basıldığında bu adres otomatik kullanılır.
*   **Telefon:** Uluslararası formatta girilmesi önerilir. Arama ve SMS entegrasyonları için anahtar veridir.

### Hiyerarşik Adres Yapısı
MechQuote, adresleri sadece metin olarak değil, parçalı veri olarak saklar:
*   **Şehir & İlçe:** İstatistiksel raporlama için filtreleme aracıdır.
*   **Mahalle / Cadde / Sokak:** Lojistik ve şantiye planlaması için kullanılır.
*   **Bina & Daire No:** Tam adres dökümü için ayrı alanlar olarak tutulur.

---

## 2. Cari Kart Analiz Panelleri

Bir müşterinin üzerine tıklandığında açılan detay ekranındaki fonksiyonlar:

### Bakiye Takibi (Balance Card)
*   **Pozitif Bakiye (+):** Müşterinin firmaya olan toplam borcunu temsil eder (Onaylanmış teklifler ve satışlar).
*   **Negatif Bakiye (-):** Müşterinin fazla ödeme yaptığını veya firmadan alacaklı olduğunu gösterir.

### Hareket Girişi (Transaction Entry)
*   **Tür:** Ödeme (Payment), Satış (Debt), İade (Credit).
*   **Kategori:** Nakit, Banka Havalesi, Çek, Kredi Kartı.
*   *İpucu:* Her ödeme girişinde "Referans No" (Dekont No) girilmesi, mutabakat süreçlerini hızlandırır.

### Etkileşim Günlüğü (Interaction Logs)
Müşteri ile yapılan her temasın (Toplantı, Telefon, Şantiye Gezisi) kayıt altına alındığı yerdir. Bu veriler silinemez, sadece arşivlenir; bu sayede ticari hafıza korunur.
