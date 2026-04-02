# Operasyon Modülü: İş Atamaları ve Hakediş Yönetimi

Bu modül, sahadaki personel ve taşeron ekiplerinin yönetildiği, hakediş ve ödeme dengesinin takip edildiği operasyonel merkezdir.

---

## 1. Personel ve Ekip Tanımları

**Erişim:** `Sol Menü > Ekipler`

*   **Yeni Personel Ekle:** Ad-Soyad, Rol (Usta, Şef, Taşeron) ve İletişim bilgileri girilir.
*   **Günlük Birim Maliyet (Opsiyonel):** Personelin standart yevmiyesi girilirse, sistem bütçe tahminlerinde bu veriyi kullanır.

---

## 2. İş Atama İş Akışı (Job Assignment Workflow)

Teklif onaylandıktan sonra bir işin ekibe atanması süreci şu adımları izler:

### Atama Oluşturma
1.  **[Yeni Atama]** butonuna tıklanır.
2.  **Proje Seçimi:** Atama yapılacak aktif proje/teklif seçilir.
3.  **Personel Seçimi:** İşi yapacak olan usta veya taşeron ekip seçilir.
4.  **Hakediş Tutarı:** İş bitiminde personele ödenecek olan toplam net tutar girilir.

---

## 3. Ödeme ve Bakiye Kontrolü

**Erişim:** `Sol Menü > İş Atamaları`

Atanan işler liste halinde listelenir. Her satırda üç kritik finansal değer bulunur:
*   **Toplam Hakediş:** Sözleşilen toplam iş bedeli.
*   **Ödenen Toplam:** Personele yapılan avans ve ara ödemelerin toplamı.
*   **Kalan Bakiye:** İş bitiminde personele yapılması gereken nihai ödeme.

### [Ödemeleri Yönet] Fonksiyonu
Bu butona basıldığında açılan pencerede:
- Yapılan ödemeler tarih, miktar ve ödeme yöntemi bazında kaydedilir.
- Personelin imzalayacağı hakediş formuna temel teşkil eden "Ödeme Geçmişi" dökümü alınabilir.

---

## 4. Durum Yönetimi (Status Tracking)

İş atamaları üç farklı durumda takip edilir:
- **Ödenmedi:** Personele henüz hiçbir ödeme yapılmadı.
- **Kısmi Ödendi:** İş devam ediyor ve ara ödemeler/avanslar verildi.
- **Ödendi:** Toplam hakediş miktarının tamamı personele teslim edildi ve hesap kapatıldı.
