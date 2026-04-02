# Proje Otopsisi: Tahmini vs. Gerçekleşen Maliyet Analizi

MechQuote Professional, bir projenin kârlılığını sadece teklif aşamasında değil, iş bitiminde de ölçmenizi sağlayan gelişmiş bir "Otopsi" (Analiz) modülüne sahiptir. Bu modül, işletmenizin gerçek finansal performansını görmenizi sağlar.

---

## 1. Veri Kaynakları (Nasıl Hesaplanır?)

Sistem, projeyi iki farklı açıdan ele alır:

### Planlanan (Tahmini) Maliyetler
Bu veriler, projeye bağlı olan **Onaylanmış Teklif**ten gelir:
*   **Malzeme Tahmini:** Teklifteki ürünlerin `Baz Fiyat` (Alış Fiyatı) x Miktarlarının toplamıdır.
*   **İşçilik Tahmini:** "İş Atamaları" kısmında ustalara söz verilen (Assigned) toplam tutardır.

### Gerçekleşen (Fiili) Maliyetler
Bu veriler, proje süresince sisteme girilen **Gerçek Hareketler**den toplanır:
*   **Malzeme Gerçek:** Proje ile ilişkilendirilmiş olan "Gelen Faturalar"ın toplamıdır.
*   **İşçilik Gerçek:** Ustalara yapılan "Fiili Ödemeler" (Avanslar ve Hakedişler) toplamıdır.
*   **Diğer Giderler:** Kasa modülünden girilen sarf malzemeleri, yemek, nakliye gibi ek proje masraflarıdır.

---

## 2. Analiz Ekranındaki Bölümler

**Erişim:** `Projeler > Proje Seçin > Proje Otopsisi (Sekme)`

### A. Üst Karşılaştırma Kartları
*   **Planlanan vs. Gerçekleşen:** İki maliyet arasındaki farkı yüzdesel olarak gösterir. %0'ın üzerindeki her değer, bütçenin aşıldığını (over-budget) işaret eder.
*   **Kâr Değişimi:** Beklediğiniz kâr ile cebinizde kalan kâr arasındaki farktır.

### B. Kategori Bazlı Karşılaştırma
Bu bölümde malzeme ve işçilik giderleri ayrı ayrı barlarla gösterilir. 
*   *Örnek:* Malzeme gideri %100 (Planlanana sadık), ancak işçilik %130 ise; bu, sahadaki usta maliyetinin öngörülenin çok üzerine çıktığını net bir şekilde gösterir.

### C. Karlılık Karnesi (Verdict)
Yapay zeka ve istatistik motoru projeyi şu şekilde değerlendirir:
*   **Karlılık Beklentinin Üstünde:** Eğer gerçekleşen maliyet, planlanandan düşükse sistem sizi tebrik eder.
*   **Karlılık Beklentinin Altında:** Eğer bütçe aşıldıysa, sistem bir sonraki teklifte dikkat etmeniz gereken "sapma oranını" söyler.

---

## 💡 Stratejik Önemi
"Proje Otopsisi" yapmadan bir sonraki teklife geçmek, aynı hataları tekrarlamak demektir. Eğer projelerinizde işçilik sürekli %20 sapma gösteriyorsa, teklif editöründeki "Reçete" maliyetlerinizi bu doğrultuda güncellemelisiniz.
