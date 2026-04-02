---
title: Profesyonel PDF Üretimi ve Yazdırma Mimarisi
summary: Tarayıcı bağımsız, sunucu taraflı (Puppeteer) milimetrik PDF üretimi ve A4 baskı düzeni standartları.
---

# Teknik Bilgi Maddesi: Profesyonel PDF Üretimi ve Yazdırma Mimarisi

## Özet
İstemci tarafı (client-side) yazdırma işlemlerindeki tarayıcı uyumsuzluklarını ve kenar boşluğu (margin) sapmalarını gidermek amacıyla, sistem sunucu taraflı (server-side) bir PDF üretim mimarisine (`Puppeteer`) geçirilmiştir.

## Teknik Mimari
- **PDF Motoru**: `Puppeteer` (Headless Chromium).
- **API Rotası**: `/api/generate-pdf` üzerinden talep edilen teklifin (ID ile) render edilmesi ve Buffer olarak PDF döndürülmesi.
- **Render Stratejisi**: Puppeteer, arka planda teklifin yazdırma sayfasını (`/quotes/[id]/print?headless=true`) açar, `networkidle0` durumunu bekler ve piksel hassasiyetinde çıktı üretir.

## Kritik Tasarım Standartları
- **Sayfa Ölçüsü**: Standart A4 (210mm x 297mm). Taşkınları önlemek için kodda `296mm`, `min-h-[297mm]` veya sabit `h-[290mm]` (kapak için) kullanılır.
- **Kenar Boşlukları (Margins)**: 
  - **Kapak Sayfası:** Yanlar 15mm, Üst/Alt 25mm (`px-[15mm] py-[25mm]`).
  - **İçerik Sayfaları:** Yanlar 15mm (`px-[15mm]`). Üst/Alt boşluklar tablo başlık/altlık yapısına göre dinamik yönetilir.
- **Header/Footer Tekrarı**: HTML `table` yapısının `thead` ve `tfoot` özellikleri kullanılarak, çok sayfalı dökümanlarda başlıkların her sayfada otomatik çıkması sağlanmıştır.
- **CSS Özel Kuralları**: `@media print` bloğunda `@page { margin: 0 !important; }` kullanılarak tarayıcının varsayılan (istemsiz) boşlukları etkisiz hale getirilmiştir.

## Uygulama Detayları (16.02.2026 Güncellemesi)
1. **Grid Layout (Kapak Sayfası)**: Kapak sayfası, `flex` yerine `grid grid-rows-[1fr_auto]` yapısına geçirilerek footer'ın sayfanın en altına güvenli bir şekilde itilmesi sağlanmıştır.
2. **Kompakt Footer Tasarımı**: Kapak sayfasındaki iletişim bilgileri, "Antetli Kağıt" estetiğine uygun olarak tek satırda ve daha küçük puntolarla (`7pt`, `9pt`) düzenlenmiştir.
3. **Model Sütunu**: Ürün tablosuna "Model" sütunu (`w-24`) eklenmiş, ürün açıklaması genişliği optimize edilmiştir.
4. **Tam Genişlik Notlar**: "Notlar" alanı dar sütundan çıkarılarak tam genişliğe (`w-full`) yayılmış, banka hesapları ise hemen altına 3 sütunlu grid olarak yerleştirilmiştir.
5. **Canlı Önizleme (WYSIWYG)**: Tarayıcı ekranında (`screen:` modunda), dökümanlara gölge (`shadow-2xl`) ve kenarlık eklenerek "Sanal Kağıt" görünümü kazandırılmıştır. Bu stiller PDF çıktısına (`print:` modunda) yansımaz.

## Uygulama Detayları (19.02.2026 Güncellemesi)
1.  **Grup Ara Toplamları:** Yazdırılan dökümanda her ürün grubunun sonuna otomatik olarak "Grup Ara Toplam" satırı eklendi. Bu satır o grubun KDV hariç toplam tutarını gösterir.
2.  **Teklif İcmal Tablosu:** Teklifin en sonuna, kalem listesi ile imza/notlar arasına bir "İcmal ve Genel Toplam" tablosu eklendi. Bu tablo bölümler bazında toplamları dökerek teklifin bir bakışta anlaşılmasını sağlar.
3.  **Layout Optimizasyonu (Empty Space Fix):** 
    - Sayfa sonu boşluklarını gidermek için katı sayfa sonu kuralları (`break-inside-avoid`) esnetildi.
    - İçerik konteynerindeki `min-h-[297mm]` kısıtı kaldırılarak dökümanın içeriğe göre dinamik sonlanması sağlandı.
    - Yazdırma marjları ve padding değerleri küçültülerek (`pt-15mm` -> `pt-5mm`) sayfa başına kazanılan dikey alan optimize edildi.
4.  **Blok Birleştirme:** İcmal tablosu ve altındaki "KDV/Genel Toplam" blokları tek bir akışta birleştirilerek, veri sığmadığında oluşan gereksiz sayfa atlamaları engellendi.

## Kritik Dosyalar
- `src/app/api/generate-pdf/route.ts`: PDF üretim motoru (Puppeteer).
- `src/components/app/print-document.tsx`: Yazdırma şablonu ve layout mantığı.
- `src/app/globals.css`: Baskı öncelikli CSS kuralları.

---
*Son Güncelleme: 20 Şubat 2026*

## Uygulama Detayları (20.02.2026 - Kurumsal Ön Yazı ve Yazdırma Hileleri)
Bu güncelleme ile geleneksel "Kapak Sayfası" yerini daha profesyonel ve kurumsal bir "Sunuş Mektubu" (Cover Letter) formatına bırakmıştır.

1.  **Antetli Kağıt (Sunuş Mektubu) Dizaynı:**
    *   **Saf Beyaz Layout:** Gradyanlar ve arka plan renkleri kaldırılarak, beyaz antetli kağıt üzerine yazılmış resmi mektup estetiği yakalandı.
    *   **Dinamik Hitap ve Kapanış:** "Sayın [Müşteri Adı]," hitabı ve "Saygılarımızla" kapanış bloğu ile kişiselleştirilmiş bir deneyim sağlandı.
    *   **Temiz Gövde:** Mektup gövdesindeki gereksiz proje başlıkları kaldırılarak, logodan sonra doğrudan profesyonel metinle başlanması sağlandı.

2.  **Hassas Yazdırma Alanı Maksimizasyonu (Printing Hacks):**
    *   **@page :first Müdahalesi:** Puppeteer'ın varsayılan alt boşluğunu (margin-bottom) ezmek için sadece ilk sayfaya özel `@page :first { margin-bottom: 10mm !important; }` kuralı eklendi.
    *   **Sabit Yükseklik (Fixed Height):** İlk sayfa kapsayıcısına `h-[270mm]` verilerek, dökümanın A4 kağıdın fiziksel en alt noktasına (1cm payla) kadar uzanması sağlandı.
    *   **Absolute Footer:** İletişim bilgileri `absolute bottom-0` ile sayfanın en altına çivilendi. Bu sayede mektup metni kısa olsa dahi iletişim bilgileri daima kağıdın dibinde yer alır.

3.  **Minimalist Footer Teması:**
    *   Bilgiler yan yana dizilim yerine, 3 satırlık ortalanmış ve rafine bir blok haline getirildi.
    *   Küçük dikey ayraçlar (`|`) ve ultra-küçük fontlar (`10px`, `9px`) kullanılarak "antetli kağıt" şıklığı tamamlandı.
    *   Metin çakışmasını önlemek için içerik alanına `pb-24` güvenlik boşluğu eklendi.

4.  **İzolasyon Garantisi:**
    *   İlk sayfa bloğunun sonunda kullanılan `print:break-after-page` kuralı, mutlak konumlandırılmış (absolute) öğelerin ikinci sayfadaki tablo düzenini bozmasını kesin olarak engeller.
