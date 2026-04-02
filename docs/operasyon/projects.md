# Operasyon Modülü: Proje ve Şantiye Yönetimi

MechQuote, onaylanan teklifleri otomatik olarak projeye dönüştürerek sahadaki operasyonun finansal ve idari takibini sağlar.

---

## 1. Proje Kartı ve Analiz Ekranı

Her proje, içinde birden fazla finansal hareketi barındıran bir "konteynır" görevi görür.

### Finansal Metrikler
*   **Sözleşme Tutarı:** Tekliften gelen onaylı satış bedeli.
*   **Toplam Maliyet:** Proje kapsamında girilen faturaların ve işçilik ödemelerinin toplamı.
*   **Proje Karlılığı:** (Sözleşme Tutarı - Toplam Maliyet) formülüyle hesaplanan net kârdır.

---

## 2. Şantiye Adres Yönetimi

Mekanik tesisat işlerinde lojistik planlama için projenin lokasyon bilgisi kritiktir.
*   **Google Maps Entegrasyonu (Geliştirme Aşamasında):** Adres alanına girilen koordinatlar üzerinden şantiye konumu haritada işaretlenebilir.
*   **Adres Detayları:** Sevkiyatların yapılacağı tam şantiye adresi "Proje Kartı" üzerinde her zaman ulaşılabilir durumdadır.

---

## 3. Durum Döngüsü (Lifecycle)

Bir proje sırasıyla şu aşamalardan geçer:
1.  **Ongoing (Devam Eden):** Saha çalışmaları aktif. Tüm harcamalar kâr marjını etkiler.
2.  **Pending (Beklemede):** Müşteri veya teknik nedenlerle iş durdurulmuş.
3.  **Completed (Tamamlanan):** İş bitti, hakedişler kapandı. Proje arşive kaldırılır.
4.  **Cancelled (İptal):** İş başlamadan veya yarıda durdurularak tasfiye edilmiş.

---

## 4. Proje Bazlı Fatura Takibi

"Faturalar" modülünden girilen her kalem, ilgili proje ile ilişkilendirilebilir. Bu sayede bir faturanın hangi şantiyeye harcandığı (Örn: "Ateşoğlu Rezidans - Kazan Dairesi Malzemeleri") tek bir ekranda raporlanabilir.
