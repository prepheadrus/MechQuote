# Teknik Bilgi Maddesi: Layout ve Kaydırma (Scroll) Yönetimi

## Özet
Uygulamanın genelinde yaşanan kaydırma (scrolling) sorunlarını çözmek için global bir CSS yaklaşımı yerine, modüler bir "per-page scrolling" stratejisi benimsenmiştir.

## Karşılaşılan Sorunlar
- `RootLayout` üzerindeki `h-screen overflow-hidden` sınıfları, sayfa içeriğinin ekran boyutunu aşması durumunda alt kısımların asla görünmemesine neden oluyordu.
- Yazdırma (print) preview sayfalarında içerik kesiliyordu.

## Çözüm Yöntemi
1.  **Global Kilit Kaldırıldı**: `app/layout.tsx` dosyasındaki `body` etiketinden `h-screen` ve `overflow-hidden` kaldırıldı.
2.  **Sorumluluk Paylaşımı**: Ana uygulama layout'unda (`AppLayout`), yan menü sabit tutulurken içerik alanı (`main`) `overflow-y-auto` sınıfı ile kendi kaydırmasını yönetecek hale getirildi.
3.  **Özel Durumlar**: Form sayfaları (`Settings`, `Company Profile`) için konteyner seviyesinde `h-full` ve `overflow-y-auto` kullanılarak uzun formların başlık ve butonlar arasında kaybolması engellendi.

## Kritik Kod Değişikliği (`src/components/app/app-layout.tsx`)
```tsx
<main className={cn("flex-1 flex flex-col print:block overflow-y-auto page-transition")}>
    {children}
</main>
```

## Önemli Not
Print sayfalarında bu kaydırma sınıfları `print:block` ile devre dışı bırakılarak, tüm sayfanın kağıda/PDF'e tam olarak yansıması sağlanmaktadır.
