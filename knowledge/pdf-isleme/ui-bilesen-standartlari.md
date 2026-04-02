---
title: UI Bileşen Standartları
summary: Uygulamanın görsel tasarımı, kullanılan bileşenler ve tasarım tercihleri.
---

# UI Bileşen Standartları

## Sekme Çubuğu (Tabs) ve Navigasyon (15.02.2026)
Eski statik ve blok benzeri sekme çubuğu, modern bir tarayıcı estetiğine (Chrome/VS Code tarzı) güncellendi.
- **Bileşen:** `TabBar` (`src/components/workspace/tab-bar.tsx`)
- **Tasarım:**
    - `rounded-t-md` ve `border-t-2` ile belirginleştirilmiş aktif sekme.
    - Yatay kaydırma (`horizontal scroll`) için `w-max` kullanımı.
    - Her modül için özel ikon kullanımı (`lucide-react`).
- **Teknik Detay:**
    - `ScrollArea` bileşeni artık `orientation` prop'u yerine CSS (`whitespace-nowrap`, `w-max`) ile yatay kaydırmayı yönetiyor.
    - Sekme kapatma butonu (`X`) sadece aktif sekmede veya üzerine gelindiğinde görünür hale getirildi.
    - TypeScript tip hatasını gidermek için `tab.href` yerine doğru alan adı olan `tab.url` kullanıldı.

```tsx
// Örnek Tasarım
className={cn(
    "group relative flex items-center gap-2 px-3 h-8 min-w-[140px] max-w-[220px] ... rounded-t-md",
    isActive ? "bg-white border-t-2 border-primary ..." : "bg-transparent hover:bg-slate-200/50"
)}
```

## Bildirim Sistemi (Toast) - 17.02.2026
Sistem genelinde işlem geri bildirimleri için **shadcn/ui** `useToast` hook'u standartlaştırılmıştır.

- **Tercih Sebebi:** Uygulamanın geri kalanıyla görsel bütünlük sağlaması ve `ToastAction` desteği.
- **Kullanım:** `sonner` kütüphanesi yerine `@/hooks/use-toast` içerisindeki `toast` fonksiyonu kullanılmalıdır.

## Proje Durum Yönetimi (ProjectStatusUpdater)
Projelerin yaşam döngüsünü yönetmek için görsel bir takip bileşeni (`Progress Bar` + `Select`) kullanılmaktadır.

- **Görsel Geri Bildirim:** Mevcut duruma göre (`ProjeDurumu` enum değerleri) otomatik dolan mavi bir ilerleme çubuğu sunar.
- **Durum Sıralaması:** `statusOrder` array'i ile projenin mantıksal akışı (Sözleşme -> Planlama -> ... -> Kapanış) kontrol edilir.
- **Kısıtlamalar:** Projeler `ASKIYA_ALINDI` veya `IPTAL_EDILDI` değilse, genellikle sadece ileriye doğru hareket edebilir (İş akışı güvenliği).

## Detay Sayfası Sekme Yerleşimi (Detailed Tab Layout) - 18.02.2026
Detay sayfalarında (Proje, Müşteri vb.) kullanılan çoklu sekme (7+) yapıları için dikey yığılmayı önleyen yatay tasarım standartlaştırılmıştır.

- **Yapı:** `TabsList` bileşeni bir `overflow-x-auto` div içine alınmalı ve grid yerine `justify-start` flex yapısı kullanılmalıdır.
- **Tasarım:** 
    - `rounded-none`, `border-b-2` ve `bg-transparent` özellikleri ile "Underlined" (altı çizili) stil tercih edilmelidir.
    - Sekmeler arası boşluk için `gap-6` kullanılmalıdır.
    - `no-scrollbar` utility sınıfı ile yatay kaydırma çubuğu gizlenmelidir.

```tsx
<div className="border-b mb-1 overflow-x-auto no-scrollbar">
    <TabsList className="h-11 w-full justify-start bg-transparent p-0 gap-6 rounded-none">
        <TabsTrigger className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary ...">
            Sekme Adı
        </TabsTrigger>
    </TabsList>
</div>
```

## Yapışkan Aksiyon Çubuğu (Sticky Action Bar) - 20.02.2026
Teklif hazırlama gibi kritik veri giriş sayfalarında, genel toplamları ve ana aksiyonları her zaman görünür kılmak için yapışkan bir alt bar standardı getirilmiştir.

- **Tasarım Elementleri**:
    - **Sınırlar**: `border-4 border-orange-600` ile sayfa içeriğinden sert bir şekilde ayrıştırılmış turuncu çerçeve.
    - **Yüzey**: `bg-white/95` (veya darkMode'da `slate-900/95`) ve `backdrop-blur-xl` ile buzlu cam etkisi.
    - **Şekil**: `rounded-[2.5rem]` ile yumuşatılmış köşeler.
    - **Gölge**: `shadow-[0_20px_60px_rgba(0,0,0,0.3)]` ile derinlik.
- **Düzen (Layout)**:
    - **Sol**: Finansal özet (Toplam, Matrah, KDV, Kâr).
    - **Orta**: Görünüm modları (KDV Dahil/Hariç).
    - **Sağ**: Kritik aksiyonlar (PDF, Şablon, Kaydet).

```tsx
<div className="fixed bottom-6 z-50 ...">
    <div className="backdrop-blur-xl bg-white/95 border-4 border-orange-600 rounded-[2.5rem] ...">
        {/* İçerik */}
    </div>
</div>
```

## Yazdırma Düzeni (Print Layout) - 19.02.2026
Teklif ve Rapor modüllerinde kullanılan yazdırma şablonları için aşağıdaki Tailwind varyantları ve CSS kuralları standartlaştırılmıştır.

1.  **Sayfa Bölünmesini Önleme (Page Breaking):**
    *   **Kullanım:** `print:break-inside-avoid`
    *   **Uygulama Alanı:** Tablo satırları (`<tr>`), bilgi kartları, not blokları ve icmal tabloları.
    *   **Amaç:** İçeriğin sayfa sonunda ikiye bölünmesini (yarısı bir sayfada, yarısı diğerinde) engeller.

2.  **Görünürlük Yönetimi:**
    *   **Kullanım:** `print:hidden` vs `screen:hidden`
    *   **Uygulama Alanı:** Yazdırma butonları, navigasyon çubukları ve sadece ekranda anlamlı olan interaktif öğeler için `print:hidden`. Sadece baskıda çıkması gereken filigran/altbilgi için `screen:hidden`.

3.  **Tipografi Optimizasyonu:**
    *   **Kullanım:** `print:text-[11px]`, `print:leading-tight`
    *   **Amaç:** Kağıt alanını verimli kullanmak için baskı anında font boyutları ve satır aralıkları küçültülür.

4.  **Yetim/Dul Kontrolü (Widow/Orphan):**
    *   **Kullanım:** `style={{ orphans: 4, widows: 4 }}`
    *   **Amaç:** Özellikle "Notlar" gibi metin bloklarında, sayfa sonuna denk gelen paragrafların en az 4 satır bütünlükle taşınmasını sağlar.
