# Proje Yaşam Döngüsü ve Durum Yönetimi

Bu döküman, projenin "Teklif Onayı" sonrası başlayan ve "Kesin Hesap" ile biten tüm yaşam döngüsünün teknik implementasyonunu detaylandırır.

## 1. Veri Modeli (Prisma Enum)

Projeler, `ProjeDurumu` enum yapısı üzerinden 12 farklı teknik aşamada takip edilir. Bu yapı, basit "Devam Eden/Tamamlandı" mantığının ötesinde, operasyonel gerçekliği (malzeme tedariği, test-devreye alma vb.) yansıtır.

```prisma
enum ProjeDurumu {
  SOZLESME_ASAMASI          // Faz 1: Hazırlık
  PROJE_PLANLAMA
  MALZEME_TEDARIK
  SAHA_MOBILIZASYONU        // Faz 2: Uygulama
  MONTAJ_VE_IMALAT
  TEST_VE_DEVREYE_ALMA
  GECICI_KABUL              // Faz 3: Kapanış
  EKSIK_GIDERME
  PROJE_TAMAMLANDI
  FATURALANDIRILDI_VE_KAPANDI
  ASKIYA_ALINDI             // Özel Durumlar
  IPTAL_EDILDI
}

model ProjectStatusHistory {
  id        String      @id @default(uuid())
  projectId String
  status    ProjeDurumu
  note      String?
  date      DateTime    @default(now())
  createdAt DateTime    @default(now())
}
```

## 2. Merkezi Biçimlendirme (formatters.tsx)

Durumların kullanıcı arayüzünde profesyonel ve tutarlı görünmesi için `src/lib/formatters.tsx` içerisinde iki ana fonksiyon kullanılır:

- **`getProjectStatusLabel(status)`**: Enum değerlerini Türkçe insan-okunabilir etiketlere dönüştürür.
- **`getProjectStatusBadge(status)`**: Durumu görsel bir hiyerarşiye göre renklendirir.
    - **Mavi (Okunur)**: Devam eden aktif aşamalar.
    - **Yeşil**: Tamamlanma/Kapanış aşamaları.
    - **Sarı/Amber**: Beklemede (Askıya Alındı).
    - **Kırmızı**: İptal/Red.

## 3. Akıllı Filtreleme Mantığı

Backend (`getProjects` action), UI sekmelerini (Ongoing, Completed vb.) karşılamak için durumları mantıksal gruplara ayırır:

- **Ongoing (Devam Eden)**: İlk 6 aşamayı kapsar (`SOZLESME_ASAMASI` -> `TEST_VE_DEVREYE_ALMA`).
- **Completed (Tamamlanan)**: Kapanış sürecindeki tüm durumları kapsar (`GECICI_KABUL` -> `FATURALANDIRILDI`).

Projelerin aşamaları ve tarihçesi şu mekanizmalarla yönetilir:

1.  **Zaman Çizelgesi (Project Timeline)**: `ProjectLifecycleView` bileşeni ile projenin başından sonuna kadar geçirdiği tüm evreler tarih ve not bazlı listelenir.
2.  **Aşama Güncelleme Formu**: Akış sekmesi içinde yer alan form aracılığıyla projenin yeni aşaması, işlem tarihi ve özel açıklaması ile birlikte kaydedilir.
3.  **Otomatik Denetim İzi (Audit Trail)**: Her durum değişikliği `ProjectStatusHistory` tablosuna kalıcı olarak işlenir, böylece geriye dönük raporlama ve analiz imkanı sağlanır.
4.  **Düzenleme Formu (Edit Dialog)**: `EditProjectDialog` içerisindeki ana durum seçimi de bu tarihçe sistemini tetikleyerek veritabanı tutarlılığını korur.

## 5. Kritik Senkronizasyon (Side Effects)

- **Legacy Desteği**: Veritabanında eski verilerden kalma "Ongoing" veya "Completed" gibi string değerler bulunması durumunda, sistem bunları otomatik olarak yeni enum görsel dökümüne eşler (Fallback).
- **Müşteri Kartı Uyumu**: Müşteri detay sayfasındaki "Aktif Projeler" sayacı, yalnızca `Stage 1-6` arasındaki projeleri sayacak şekilde revize edilmiştir.
