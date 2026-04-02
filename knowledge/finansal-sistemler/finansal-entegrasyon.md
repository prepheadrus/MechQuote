---
description: Proje, Müşteri, Fatura ve Kasa modülleri arasındaki uçtan uca finansal veri akışını ve senkronizasyon mimarisini açıklar.
tags: [finans, entegrasyon, proje-yonetimi, cari-hesap, kasa, fatura]
created: 2026-02-17
---

# 🏦 Finansal Entegrasyon Mimarisi

Bu doküman, MechQuote uygulamasındaki finansal varlıkların (Proje, Müşteri, Fatura, Kasa) birbirleriyle nasıl etkileşime girdiğini ve veri tutarlılığının nasıl sağlandığını açıklar. 

> **Temel Prensip:** Uygulamada gerçekleşen her finansal hareket (Gelir/Gider), ilgili tüm paydaşların (Proje ve Müşteri) bakiyelerine eş zamanlı ve tutarlı bir şekilde yansımalıdır.

## 1. Finansal Varlık İlişkileri

Sistemde para akışı üç ana varlık üzerinden takip edilir:

1.  **Müşteri (Cari Hesap):** Sistemin finansal merkezidir. Her türlü borç (Satış) ve alacak (Tahsilat/İade) nihayetinde Müşteri Bakiyesini (`Balance`) etkiler.
2.  **Proje (Operasyon Merkezi):** Finansal hareketlerin gruplandığı yerdir. Proje kendi başına bir tüzel kişilik değildir; yapılan harcama ve tahsilatlar Proje Raporunu etkilerken, aynı zamanda Müşteri Carisine işlenir.
3.  **Kasa (Nakit Akışı):** Şirketin anlık nakit durumunu gösterir.

---

## 2. Senkronizasyon Mekanizması

Aşağıdaki tabloda, sistemde yapılan işlemlerin hangi modülleri etkilediği gösterilmiştir:

| İşlem Tipi | Kaynak Modül | Hedef Modüller | Etki ve Mantık |
| :--- | :--- | :--- | :--- |
| **Satış Faturası** | Fatura (Outgoing) | • Müşteri Cari <br> • Proje Raporu | Müşteriye **Borç (Debt)** yazılır. <br> Müşteri Bakiyesi: **Artar (+)** |
| **Alış Faturası** | Fatura (Incoming) | • Tedarikçi Cari <br> • Proje Gideri | Tedarikçiye **Alacak (Credit)** yazılır. <br> (Sistemde Borç gibi görünür, ödenmesi gerekir) |
| **İade Faturası** | Fatura (PurchaseReturn) | • Tedarikçi Cari <br> • Genel Giderler | Tedarikçi Bakiyesinden düşülür. <br> **Toplam Giderler azalır.** |
| **Tahsilat (Manuel)** | Proje (Transaction) | • Proje Kasası <br> • Müşteri Cari | Müşteriden **Ödeme (Payment)** alınmış sayılır. <br> Müşteri Bakiyesi: **Azalır (-)** |
| **Avans Alımı** | Proje Oluşturma | • Proje Kasası <br> • Müşteri Cari | Proje başlarken alınan para, Müşteri Carisinden **Ödeme** olarak düşülür. |
| **Proje Silme** | Proje Yönetimi | • Müşteri Cari | Projeye ait tüm **Borç** ve **Tahsilat** kayıtları Müşteri Carisinden silinir ve bakiye eski haline döner. |

---

## 3. Uygulama Detayları

### 3.1. Projeden Manuel Tahsilat Girişi (`Transactions`)

Proje sayfasındaki "Kasa / Finans" sekmesinden (veya `TransactionDialog` üzerinden) "Gelir" (Income) girildiğinde, sistem arka planda iki kayıt oluşturur:

1.  **Proje Kaydı (`ProjectExpense`):** Projenin "Nakit Girişi" ni gösterir.
2.  **Müşteri Kaydı (`CustomerTransaction`):** Bu paranın havadan gelmediğini, **Müşterinin Borcundan** düştüğünü belirtmek için `Payment` tipinde kayıt atar.

> **Kritik Kod:** `src/actions/transactions.ts` -> `createTransaction` fonksiyonu, `type === 'Income'` durumunda otomatik olarak `createCustomerTx` (Payment) çağırır.

### 3.2. Teklif -> Proje Dönüşümü ve Avans

Bir teklif projeye dönüştürülürken (`createProject`):
1.  **Sözleşme Tutarı:** Müşteriye **Borç (Debt)** olarak işlenir.
2.  **Avans (Varsa):** Eğer kullanıcı "Alınan Avans" girdiyse, sistem bunu **Tahsilat (Payment)** olarak işler ve Müşteri Bakiyesinden hemen düşer.

> **Örnek:** 
> - Sözleşme: 10.000.000 TL (Müşteri Borcu: 10M)
> - Avans: 1.000.000 TL (Müşteri Ödemesi: 1M)
> - **Sonuç Bakiye:** 9.000.000 TL

### 3.3. Dashboard Hesaplamaları (`dashboard-actions.ts`)

Ana sayfadaki finansal özet şu formüllerle hesaplanır:

*   **Toplam Ciro (Revenue):** 
    *   `∑ Satış Faturaları` + `∑ Manuel Proje Gelirleri`
*   **Toplam Tahsilat (Cash In):**
    *   `∑ Fatura Ödemeleri` + `∑ Manuel Proje Gelirleri`
*   **Toplam Gider (Expenses):**
    *   (`∑ Alış Faturaları` - `∑ İade Faturaları`) + `∑ Manuel Proje Giderleri` + `∑ Personel Ödemeleri`
*   **Net Kârlılık:**
    *   `Toplam Ciro` - `Toplam Gider`

---

## 4. Teknik Notlar ve Uyarılar

*   **Veri Bütünlüğü:** Proje silindiğinde, ona bağlı tüm finansal kayıtların (Borç ve Tahsilat) silinmesi kritik önem taşır. `deleteProject` fonksiyonu bu temizliği ("Rollback") yapar.
*   **Manuel Giderler:** Şu an için Proje Giderleri (Transaction Type: Expense) anonim nakit çıkışı kabul edilir. Bir tedarikçi carisine işlenmez. Eğer tedarikçiye işlenmesi gerekiyorsa, bunun **Fatura (Incoming Invoice)** olarak girilmesi önerilir.
*   **İade Faturası:** Tipi `PurchaseReturn` olan faturalar, muhasebeleşirken Gider düşürücü (Net gideri azaltan) kalem olarak işlem görür.

## 5. İlgili Dosyalar

*   `src/actions/transactions.ts`: Manuel işlem ve cari entegrasyonu.
*   `src/actions/projects.ts`: Proje oluşturma, silme ve avans yönetimi.
*   `src/services/invoice-service.ts`: Fatura ve cari entegrasyonu.
*   `src/actions/dashboard-actions.ts`: Genel raporlama mantığı.
