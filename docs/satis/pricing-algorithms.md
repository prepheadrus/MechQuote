# Satış Modülü: Teklif Matematiği ve Fiyatlandırma Algoritmaları

MechQuote'un en kritik bölümü olan teklif editöründeki hesaplama mantığı ve veri yönetimi süreçleri bu rehberde detaylandırılmıştır.

---

## 1. Birim Fiyat ve Kâr Hesaplama Formülleri

Sistemdeki her satır, `calculateItemTotals` fonksiyonu tarafından şu şekilde hesaplanır:

### Maliyet (Cost) Hesabı
*   **Net Liste Fiyatı:** Eğer fiyat "KDV Dahil" girilmişse, önce KDV'den arındırılır. `Liste Fiyatı / (1 + KDV Oranı)`
*   **Birim Maliyet:** `Net Liste Fiyatı * (1 - İskonto Oranı) * Güncel Döviz Kuru`

### Satış Fiyatı (Selling Price) Hesabı
*   **Birim Satış (KDV Hariç):** `Birim Maliyet * (1 + Kâr Marjı)`
*   **Satır Toplamı (KDV Hariç):** `Birim Satış * Miktar`
*   **KDV Tutarı:** `Satır Toplamı * KDV Oranı`

---

## 2. Döviz ve Kur Yönetimi

MechQuote Professional, TCMB API entegrasyonu ile çalışır.

*   **Canlı Kur:** Sayfa yüklendiğinde o anki TCMB efektif alış kurlarını çeker.
*   **Kur Kilitleme (Locking):** Teklifi kaydettiğinizde, o anki kurlar teklife özel olarak veritabanına mühürlenir. İleride kurlar değişse bile o teklifin dökümandaki TL karşılığı değişmez.
*   **Yenileme:** Eğer teklifi güncel kurlarla revize etmek isterseniz, sağ üstteki `Exchange Rate Display` üzerinden manuel güncelleme veya `Refresh` yapmanız gerekir.

---

## 3. Revizyon ve Versiyon Kontrol Sistemi

MechQuote, "Değişiklik Yapma, Yeni Versiyon Aç" prensibiyle çalışır.

*   **Root ID:** Bir teklifin tüm revizyonları aynı `rootProposalId` ile birbirine bağlıdır.
*   **v1, v2, v3...:** Her revizyon oluşturulduğunda sürüm numarası artar.
*   **Analitik Etkisi:** İstatistiklerde sadece en son (en yüksek versiyon numaralı) teklif verisi baz alınır; ancak arşivden eski versiyonlara erişim her zaman mümkündür.

---

## 4. Akıllı Teklif İthalatı (Smart Proposal Importer)

Başka sistemlerden gelen PDF veya Excel dökümanlarını MechQuote'a aktarma sürecidir:

1.  **Analiz:** Gemini AI motoru dökümanı tarar; `Ürün Adı`, `Adet`, `Birim` ve `Fiyat` alanlarını tespit eder.
2.  **Eşleştirme:** Bulunan ürün isimleri sistem kataloğundakilerle benzerlik skoruna göre eşleştirilir.
3.  **Onay:** Kullanıcı eşleşmeleri kontrol eder ve "Teklife Dönüştür" dediğinde tüm kalemler editöre dökülür.

---

## 5. Şablon (Template) Mimarisi

Sık kullanılan teklif yapıları (Örn: "Daire İçi Kalorifer Hattı") şablon olarak saklanabilir.
*   **İçerik:** Şablonlar; ürünleri, miktarları ve gruplandırmaları saklar.
*   **Uygulama:** Yeni teklif açarken şablon seçildiğinde, tüm kalemler o anki **güncel liste fiyatlarıyla** teklife eklenir (Şablonlar sabit fiyat değil, sabit miktar ve kalem listesi tutar).
