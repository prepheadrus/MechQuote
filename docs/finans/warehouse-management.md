# Depo ve Stok Yönetimi: Akıllı Takip Sistemi

MechQuote Professional, fatura ve teklif süreçlerinizi depo hareketleriyle birbirine bağlayarak dükkanınızdaki malzeme akışını tam kontrol altına alır.

---

## 1. Otomatik Stok Girişi (Fatura Entegrasyonu)

Bu sistemin en büyük gücü, elinizi sürmeden stokları güncellemesidir.
*   **Gelen Fatura OCR:** Bir tedarikçi faturasını yükleyip ürünleri eşleştirdiğiniz an, o malzemeler otomatik olarak **"Depo"**ya giriş yapar.
*   **Hafıza:** "Fatura ile giriş" açıklamasıyla birlikte, malzemenin hangi faturadan, ne zaman ve ne kadar geldiği tarihçeye işlenir.

---

## 2. Akıllı Rezervasyon Mantığı

Bir teklif onaylandığında, malzemeler henüz dükkandan çıkmamış olsa bile "ayrılmış" (rezerve) kabul edilir.
*   **Onay Anı:** Teklif durumunu "Onaylandı" yaptığınızda, sistem teklifteki tüm kalemleri stokta **"Rezerve"** durumuna çeker.
*   **Kullanılabilir Stok:** Sistem size iki rakam sunar:
    1.  **Fiziksel Stok:** Rafta duran gerçek miktar.
    2.  **Kullanılabilir Stok:** Fiziksel stok - Rezerve edilen miktar. 
*   *Örnek:* Rafta 10 vana var ama 8 tanesi onaylı bir proje için ayrıldıysa, sistem size "Sadece 2 tane satabilirsin" uyarısı verir.

---

## 3. Stok Hareketleri ve Tarihçe

**Erişim:** `Sol Menü > Depo / Stok`

Sayfanın sağ tarafındaki **"Son Hareketler"** paneli, dükkanın günlüğüdür:
*   **Yeşil İkonlar (+):** Malzeme girişlerini (Faturalar veya manuel girişler) temsil eder.
*   **Turuncu İkonlar (-):** Malzeme çıkışlarını veya rezervasyonları temsil eder.

---

## 4. Kritik Stok ve Uyarılar

Eğer bir malzemenin stoğu sizin belirlediğiniz **"Minimum Seviye"**nin altına düşerse, sistem ürünün yanında kırmızı bir **"Kritik"** uyarısı çıkarır. Bu, satınalma yapmanız gerektiğini hatırlatan erken uyarı sistemidir.

---

## 💡 Operasyonel İpucu
Depo sayfasındaki **"Tahmini Stok Değeri"**, dükkanınızdaki tüm malzemelerin alış fiyatları üzerinden hesaplanmış nakit değerini gösterir. Sigorta veya envanter sayımlarında bu rakamı baz alabilirsiniz.
