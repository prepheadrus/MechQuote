# Finans Modülü: Master Analiz ve OCR Teknik Rehberi

Tedarikçi maliyetlerinin ve satış stratejilerinin veri odaklı yönetilmesi için kullanılan teknik dökümandır.

---

## 1. OCR (Optik Karakter Tanıma) İş Akışı

Fatura okuma işlemi iki katmanlıdır:

### Katman 1: PDF Parsing
Dosya yüklendiğinde önce dijital metin katmanı taranır. Eğer PDF metin tabanlıysa (e-arşiv faturalar gibi) veriler %100 doğrulukla çekilir.

### Katman 2: Tesseract İşlemesi
Eğer döküman taranmış bir kağıtsa veya resimse, görüntü pikselleri analiz edilir. Bu durumda kullanıcı eşleşmeleri daha dikkatli kontrol etmelidir.

---

## 2. Birleştirilmiş Fiyatlandırma Raporu (Analiz Algoritması)

Bu rapor, seçilen faturalardaki verileri `Bölüm 1, 2 ve 3` olarak Excel'de kurgular.

*   **Dinamik Hesaplama:** Excel içindeki `VLOOKUP` ve `IF` formülleriyle kurgulanmıştır.
*   **Maliyet Geri Besleme:** Bir ürünün farklı faturalardaki farklı alış fiyatları varsa, rapor size en yüksek (en güvenli) maliyeti veya ağırlıklı ortalamayı önerir.
*   **Kâr Simülasyonu:** Excel'deki "Hedef Satış Tutarı" hücresini değiştirdiğinizde, her bir ürünün satır bazlı kâr marjı saniyeler içinde yeniden hesaplanır.

---

## 3. Ürün Eşleştirme (Mapping) Zekası

Sistem bir faturayı okuduğunda; `Tedarikçi Ürün Adı` ile `Katalog Ürün Adı` arasında bir "Eşleşme Tablosu" oluşturur.

*   **Levenstein Mesafesi:** Benzerlik skorlaması için kullanılır. "Vana DN50" ile "Duyar Vana DN-50" arasındaki benzerlik tespit edilir ve kullanıcıya önerilir.
*   **Repair Mode:** Eksik veya hatalı eşleşmeleri toplu olarak düzeltmek için kullanılır. Bu işlem veritabanındaki `InvoiceItem` tablolarını günceller.
