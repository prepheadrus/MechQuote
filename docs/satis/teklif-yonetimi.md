# 🎓 Uzman Rehberi: Teklif Editörü ve Akıllı Hesaplama Motoru

MechQuote Teklif Editörü, sadece bir veri giriş ekranı değil; mühendislik maliyetlerini, kâr marjlarını ve tedarik zinciri süreçlerini (RFQ) yöneten profesyonel bir kontrol panelidir.

---

## 🏗️ 1. Grup Yönetimi ve Finansal Analiz Paneli
Teklifler "Gruplar" halinde organize edilir (Örn: Ekipmanlar, İşçilik). Her grubun tepesinde dinamik bir **Finansal Özet** barı bulunur.

*   **Maliyet / Satış / Net Kâr:** Grubun toplam finansal fotoğrafını anlık olarak gösterir.
*   **Maliyet-Kâr Dağılım Grafiği:** Kırmızı (Maliyet) ve Yeşil (Kâr) çubukları ile grubun karlılık oranını görselleştirir. 
*   **Grup Aksiyonları (Sağ Üst):** 
    *   `Toplu İskonto/Kâr`: Tüm gruba tek tuşla % iskonto veya kâr uygular.
    *   `Fiyatları Tazele`: Gruptaki tüm ürünleri katalogdaki en güncel kurlar ve fiyatlarla yenilenecek şekilde sistemden çeker.

---

## ⚡ 2. Ürün Ekleme Yöntemleri

### A. 🪄 Akıllı Ürün Ekle (Smart Add)
Grubun en altında bulunan "Akıllı Ürün Ekle..." kutusu AI destekli bir giriş alanıdır.
*   **Kullanım:** "12 adet 25mm küresel vana" yazıp Enter'a bastığınızda sistem miktarı ve ürünü katalogdan otomatik eşleştirir. Bir "buton" değil, hızlı bir metin giriş alanıdır.

### B. Katalogdan Seç
Geleneksel arama paneli. Marka, kategori veya teknik özellikler üzerinden seçim yapmanızı sağlar.

### C. Özel Kalem
Katalogda olmayan, o projeye özel hizmetler veya sarf malzemeler için boş bir satır açar.

---

## 🟦 3. Çoklu Seçim ve Mavi Aksiyon Barı
Bir veya birden fazla satırı seçtiğinizde ekranın üzerinde **Mavi Seçim Barı** belirir. Bu bar şu kritik özellikleri barındırır:

*   **📦 Kataloğa Kaydet:** Seçilen "Özel Kalem"leri veya fiyatı değişmiş tüm satırları tek tıkla ana ürün kataloğunuza kalıcı olarak işler.
*   **🔄 Gruba Taşı:** Seçilen kalemleri teklif içindeki başka bir bölüme transfer eder.
*   **✉️ Teklif İste (RFQ):** Seçilen ürünler için tedarikçilere gönderilmek üzere "Fiyat İstek Formu" (PDF) hazırlar.
*   **🗑️ Sil:** Seçilen tüm satırları toplu olarak temizler.

---

## 📑 4. Satır Bazlı Detaylı Kontroller
*   **Sıralama:** En soldaki tutamaç (6 nokta) ile satırları sürükleyebilirsiniz.
*   **Döviz Seçimi:** Liste fiyatını USD/EUR girseniz dahi sistem TL karşılığını ve maliyeti anlık hesaplar.
*   **Katalog Senkronu:** Satır sonundaki `🔄` (Tazele) ve `💾` (Kataloğa Kaydet) butonlarıyla tekil güncellemeler yapabilirsiniz.

---

## 💾 5. Kaydetme ve Versiyonlama
*   **Kaydet:** Mevcut çalışmanızı DB'ye yazar.
*   **Yeni Versiyon:** Teklifi dondurup "v2, v3..." gibi yeni bir kopya oluşturur. Müşteriye farklı opsiyonlar sunarken mutlaka yeni versiyon açın.
