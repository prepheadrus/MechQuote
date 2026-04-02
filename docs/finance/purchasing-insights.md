# Akıllı Satınalma ve Tedarikçi Analizi (AI)

MechQuote, sadece bir veri kayıt sistemi değil, aynı zamanda işletmenizin kârlılığını artırmak için çalışan dijital bir satınalma asistanıdır. "Akıllı Satınalma Önerileri", yapay zeka desteğiyle tedarikçi verilerinizi analiz ederek size stratejik avantaj sağlar.

---

## 1. Analiz Süreci Nasıl Çalışır?

Sistem, bir ürünün geçmişte hangi tedarikçilerden, hangi tarihlerde ve ne kadara alındığını (`PurchaseHistory`) tarar. Gemini AI motoru bu verileri şu kriterlere göre işler:

*   **Fiyat Trendi Analizi:** Son alımların fiyatlarının yükseliş eğiliminde mi yoksa düşüş eğiliminde mi olduğunu tespit eder.
*   **Tedarikçi Karşılaştırması:** Aynı ürün için birden fazla tedarikçiden alım yapıldıysa, fiyat/vade dengesine göre en avantajlı kaynağı belirler.
*   **Zamanlama Önerisi:** Ürünün mevsimsel veya kur bazlı fiyat hareketlerini analiz ederek "şimdi al" veya "bir sonraki teklifte şu fiyattan baz al" önerisi sunar.

---

## 2. Satınalma Önerileri Kartı

Ürün detay sayfasında sağ panelde yer alan **"Akıllı Satınalma Önerisi"** kartı şu bilgileri içerir:

### AI Tavsiyesi (İtalik Metin)
Yapay zekanın size doğrudan seslendiği kısımdır. 
*   *Örnek:* "Bu ürünün fiyatı son 3 alımda %15 artış gösterdi. En ucuz alım X firmasından yapıldı, bir sonraki teklifte maliyeti bu firmanın fiyatına göre güncelleyin."

### En Uygun Kaynak (Best Source)
Sistemin tarihindeki en düşük birim fiyatı veren tedarikçiyi ve o fiyatı gösterir.

### Fiyat Trendi (Trend Tracker)
*   **Yükseliş (Kırmızı Ok):** Son fiyat bir önceki fiyattan daha yüksek.
*   **Düşüş (Yeşil Ok):** Son fiyat bir önceki fiyattan daha düşük.
*   **Sabit (Çizgi):** Fiyat istikrarlı seyrediyor.

---

## 3. Veri Güvenliği ve Doğruluğu

Bu modülün doğru çalışması için:
1.  **Fatura OCR** işlemlerinden sonra ürünlerin doğru eşleştirilmesi kritiktir.
2.  Tedarikçi faturalarındaki **İskonto Oranlarının** doğru girilmesi, net maliyet analizinin temelidir.

---

## 💡 Stratejik İpucu
Teklif hazırlamadan önce, büyük hacimli kalemlerin detay sayfasına giderek yapay zekanın o anki önerisini kontrol edin. Bu basit kontrol, kurumsal tekliflerdeki kâr marjınızı %3 ila %5 arasında koruyabilir.
