# Finans Modülü: Akıllı OCR ve Fatura Yönetimi

MechQuote Finans modülü, tedarikçi faturalarını dijitalleştirerek maliyet analizlerini otomatize etmek için tasarlanmıştır. Bu rehber, faturanın sisteme girişinden maliyet raporuna dönüşmesine kadar olan süreci kapsar.

---

## 1. Fatura Yükleme ve OCR İşlemi

**Erişim:** `Sol Menü > Faturalar > Gelen Faturalar`

### Dosya Yükleme (Uploader)
*   **Sürükle-Bırak Alanı:** E-Arşiv/E-Fatura formatındaki PDF veya XML dosyalarını bu alana bırakın.
*   **Arka Plan İşlemi:** Sistem, Tesseract OCR ve özel yapay zeka modellerini kullanarak aşağıdaki verileri ayıklar:
    - **Firma Bilgisi:** Gönderici VKN/TCKN ve Ünvan.
    - **Fatura Künyesi:** Tarih, Fatura No, ETTN (Evrensel Tekil Tanımlama Numarası).
    - **Kalem Detayları:** Ürün adı, miktarı, birim fiyatı, KDV oranı ve satır iskontosu.

---

## 2. Ürün Eşleştirme (Product Mapping)

OCR ile okunan ürün isimleri tedarikçiye özeldir. Sistemin maliyet hesabı yapabilmesi için bu isimlerin sizin kataloğunuzdaki standart ürünlerle eşleşmesi gerekir.

### [Eşle] Butonu ve Penceresi
*   **Eşleşmemiş Ürünler:** Sarı renkte vurgulanır.
*   **İşlem:** "Eşle" butonuna bastığınızda, sistem kataloğunuzdaki benzer isimli ürünleri önerir.
*   **Kalıcı Hafıza:** Bir ürünü bir kez eşleştirdiğinizde, MechQuote bu bağı hatırlar. Gelecek faturalarda aynı isimli kalem geldiğinde otomatik olarak katalogdaki karşılığını bulur.

---

## 3. Master Rapor: Birleştirilmiş Fiyatlandırma

Birden fazla faturanın verisini harmanlayarak projeye özel maliyet ve satış listesi oluşturma sürecidir.

### Uygulama Adımları:
1.  **Seçim:** Fatura listesinde, aynı projeye ait olan faturaların başındaki kutucukları işaretleyin.
2.  **Aksiyon:** Tepede beliren **[Faturayı Birleştir ve Yönet]** butonuna tıklayın.
3.  **Excel Analizi:** Sistem size çok sekmeli bir Excel raporu sunar:
    - **Sekme 1 (Özet):** Toplam maliyet, döviz bazlı dağılım ve hedef kâr marjı giriş alanı.
    - **Sekme 2 (Detaylı Liste):** Her bir kalemin alış fiyatı, uygulanan kâr ve önerilen satış fiyatı.

---

## 4. İade Faturaları ve Cari Denge
Tedarikçiye yapılan ürün iadelerini `İade Faturaları` sekmesinden kaydedin. Bu işlem:
*   Müşteri/Tedarikçi cari bakiyesini otomatik günceller.
*   İlgili ürünün stok maliyet geçmişine negatif hareket olarak işlenir.

---

## 💡 Finansal İpuçları
- **Dövizli Faturalar:** Faturadaki kur bilgisi otomatik okunur. Eğer fatura USD/EUR ise, maliyetler faturanın kesildiği günkü kur üzerinden TL'ye çevrilerek kaydedilir.
- **Toplu Veri Onarımı:** Yanlış okunan veya eksik eşleşen ürünleri düzeltmek için sağ üstteki **[Repair Products]** aracını kullanın.
