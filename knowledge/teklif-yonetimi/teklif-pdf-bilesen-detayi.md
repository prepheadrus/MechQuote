---
title: Teklif PDF Bileşen Detayı (PrintDocument)
summary: PrintDocument bileşeninin iç yapısı, sayfa düzeni (layout) mantığı, CSS yazdırma kuralları ve özelleştirilmiş sayfa sonu yönetimi.
---

# Teknik Bilgi Maddesi: Teklif PDF Bileşen Detayı (PrintDocument)

## 1. Bileşen Amacı
`PrintDocument` (`src/components/app/print-document.tsx`), backend (`Puppeteer`) tarafından A4 boyutunda PDF'e dönüştürülmek üzere tasarlanmış, React tabanlı bir görsel şablondur. Hem tek sayfalık basit teklifleri hem de 500+ kalemlik çok sayfalı projeleri, profesyonel mizanpaj kurallarına (pagination, widows/orphans) uygun şekilde render eder.

## 2. Mimari Yapı ve İzolasyon
Sayfa başı ve sonu tekrarlarını doğru yönetmek için bileşen 3 ana katmana ayrılmıştır:

### A. Sunuş Mektubu (Cover Letter) Sayfası
*   **İzolasyon:** `print:break-after-page` ile dökümanın geri kalanından (tablolardan) kesin olarak ayrılır.
*   **Yerleşim Mantığı:** `relative h-[270mm]` kapsayıcısı içinde `absolute bottom-0` ile dibe çivilenmiş bir footer yapısına sahiptir.
*   **Yazdırma Hilesi:** `@page :first` CSS kuralı ile dökümanın sadece ilk sayfasının alt boşluğu 10mm'ye düşürülerek kağıdın tüm alanı kullanılır.
*   **Amaç:** Teklifi "Kapak Sayfası" yerine, antetli kağıda yazılmış resmi bir üst yazı (Executive Letterhead) şıklığında sunmak.

### B. Sabit Üst Bilgiler (Tablo Sayfaları)
*   **Bileşenler:** `PrintHeader`, `PrintCustomerInfo`
*   **Konum:** Tablo yapısının tamamen **dışında** (bağımsız divler).
*   **Görünüm:** Bu bilgiler Sunuş MektuBundan sonraki **ilk tablo sayfasında** sabit olarak görünür. Tablo hücreleri içine konulmaz.

### B. Dinamik Ürün Tablosu
*   **Yapı:** `<table>` -> `<thead>` (Sadece teknik başlıklar) -> `<tbody>` (Ürünler)
*   **Sütun Başlıkları:** `<thead>` içindeki `#`, `Ürün Adı`, `Fiyat` satırları, tarayıcı motoru tarafından her yeni sayfada otomatik olarak tekrar ettirilir.
*   **Satır Koruma:** Her `<tr>` etiketinde `print:break-inside-avoid` bulunur. Bir ürün satırı asla ortadan ikiye bölünmez.

### C. İzole İcmal ve Alt Bilgiler (Footer & Summary)
*   **Konum:** Ana ürün tablosu kapandıktan **sonra**.
*   **Yapı:** 
    1.  **İcmal Bloğu:** Grup toplamları, Ara Toplam, KDV ve Genel Toplamı içeren yekpare `div`. (`print:break-inside-avoid` kilitli).
    2.  **Notlar ve Banka:** Sayfanın en altındaki `PrintFooter` bileşeni.

## 3. Sayfa Bölünme Yönetimi (Pagination Logic)

### Widow & Orphan Kontrolü
Metin bloklarının (özellikle Notlar) sayfa sonunda anlamsızca bölünmesini engellemek için CSS'in `orphans` ve `widows` özellikleri kullanılır.

```tsx
// Örnek: Notlar Bölümü
<div style={{ orphans: 4, widows: 4 }}>
    {/* En az 4 satır sığmıyorsa tamamını sonraki sayfaya at */}
    <div className="content">...</div>
</div>
```

### CSS Break Kuralları (Tailwind)
*   `print:break-inside-avoid`: Bir öğenin (satır, kutu, kart) sayfa sonuna denk gelirse bölünmesini yasaklar, bütün olarak sonraki sayfaya taşır.
*   `print:break-after-page`: Bir öğeden sonra zorunlu yeni sayfa başlatır (Örn: Kapak sayfası sonrası).
*   `print:break-before-avoid`: Bir öğenin kendinden önceki öğeden koparılmasını engellemeye çalışır (Örn: "Ara Toplam" satırının son üründen kopmaması için).

## 4. Tipografi ve Estetik (Print-Specific Styling)
Mürekkep ve kağıt tasarrufu sağlamak, aynı zamanda okunabilirliği artırmak için `print:` varyantları ile özel stiller tanımlanmıştır.

*   **Font Küçültme:** Notlar gibi uzun metinlerde `print:text-[11px]` ve `print:leading-tight` kullanılarak dikey alan kazanılır.
*   **Marj Yönetimi:** 
    *   Yatay: `print:px-5` (Geniş içerik alanı).
    *   Dikey: `print:pb-20` (İçeriğin kağıt altına yapışmasını önler).
*   **Görünürlük:** `print:shadow-none` (Gölgeleri kaldırır), `print:bg-transparent` (Arka plan renklerini kaldırır).

## 5. Veri Hazırlığı (Calculations)
Bileşen, gelen ham veriyi (`items`) render etmeden önce `useMemo` ile işler:
*   **Gruplama:** Ürünleri `groupName`'e göre ayırır.
*   **Ara Toplamlar:** Her grubun kendi alt toplamını (`groupTotals`) hesaplar.
*   **Sıralama:** Grupları belirlenen mantığa göre (örn: giriş sırası) dizer.

## 6. Örnek DOM Hiyerarşisi
```html
<div class="print:px-5 print:pt-8">
    <!-- 1. Bölüm: Sadece İlk Sayfa -->
    <div><PrintHeader /></div>
    <div><PrintCustomerInfo /></div>

    <!-- 2. Bölüm: Çok Sayfalı Tablo -->
    <table>
        <thead>
            <!-- Her sayfada tekrar eder -->
            <tr><th>Ürün</th><th>Fiyat</th></tr>
        </thead>
        <tbody>
            <!-- Ürün Listesi -->
            <tr>...</tr>
            <tr>...</tr>
        </tbody>
    </table>

    <!-- 3. Bölüm: İzole İcmal (Bölünmez Blok) -->
    <div class="print:break-inside-avoid">
        <div>Grup Toplamları...</div>
        <div>Genel Toplam...</div>
    </div>

    <!-- 4. Bölüm: Notlar (Akıllı Bölünme) -->
    <div style="orphans:4; widows:4">
        <PrintFooter />
    </div>
</div>
```
