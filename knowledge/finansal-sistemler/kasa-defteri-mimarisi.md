-----
description: MechQuote merkezi Kasa Defteri ve nakit akışı yönetim sistemi mimarisini açıklar.
tags: [finans, kasa, nakit-akışı, muhasebe]
created: 2026-02-18
---

# 💹 Kasa Defteri (Cash Book) Mimarisi

Kasa Defteri, uygulama içindeki tüm parçalı finansal verileri (Projeler, Personel, Müşteriler) tek bir "Nakit Akışı" dökümünde birleştiren merkezi bir modüldür.

## 1. Veri Kaynakları ve Sentezleme
Kasa Defteri aşağıdaki fiziksel para hareketlerini baz alır:

| Kaynak | Hareket Tipi | Açıklama |
| :--- | :--- | :--- |
| **Ödemeler (Payment)** | Giriş (+) veya Çıkış (-) | Faturalara (Gelen/Giden) bağlı gerçek tahsilat ve ödemeler. |
| **Proje Hareketleri (ProjectExpense)** | Giriş (+) veya Çıkış (-) | Proje içinden girilen "Gelir" veya "Gider" kalemleri. |
| **Personel Ödemeleri** | Çıkış (-) | Personel hakediş ödemeleri (`PersonnelTransaction`'daki 'Payment' kayıtları). |
| **Cari İşlemler** | Giriş (+) veya Çıkış (-) | Müşterilerle yapılan (bir faturaya bağlı olmayan) manuel nakit alışverişleri. |

## 2. Teknik Uygulama
- **Server Action (`getCashBookEntries`):** Tüm tablolardan verileri asenkron olarak çeker, `CashEntry` interface'ine map eder ve tarihe göre tersten dizer.
- **Yinelenen Veri Koruması:** `CustomerTransaction` tablosundan veri çekilirken, projelere veya faturalara bağlı olan (referenceId'si olan) kayıtlar elenerek mükerrer sayım engellenir.

## 3. UI Özellikleri
- **Anlık Özetler:** Filtrelenmiş listeye göre Toplam Tahsilat, Toplam Ödeme ve Net Kasa Durumu kartları.
- **Smart Navigation:** Tablodaki herhangi bir satıra tıklandığında, işlemin kaynağına (İlgili Proje, Müşteri veya Personel sayfası) akıllı yönlendirme yapılır.
- **Kategorizasyon:** İşlemler; Maaş, Tahsilat, Tedarikçi Ödemesi, Malzeme Gideri gibi kategorilerle görsel olarak ayrıştırılır.

## 4. Dosya Yapısı
- **Logic:** `src/actions/cash-book.ts`
- **View:** `src/app/cash-book/page.tsx`
- **Component:** `src/app/cash-book/cash-book-client-page.tsx`
