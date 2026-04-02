# Teknik Bilgi Maddesi: Workspace ve Drag-and-Drop (DND) Yönetimi

## Özet
Bu döküman, uygulamadaki sekme (workspace tabs) sisteminin kalıcılığını ve teklif detay sayfasındaki karmaşık sürükle-bırak (drag-and-drop) mekanizmasının işleyişini açıklar.

## 1. Sekme Kalıcılığı (Workspace Persistence)

### Sorun
Sayfa yenilendiğinde (refresh) veya sert navigasyonlarda (hard push) bellekte tutulan sekmeler siliniyor, kullanıcı Dashboard dışındaki tüm açık pencerelerini kaybediyordu.

### Çözüm (src/components/workspace/workspace-context.tsx)
- **LocalStorage Entegrasyonu**: Sekme listesi ve aktif sekme bilgisi her değişiklikte `mechquote_tabs` anahtarıyla tarayıcı hafızasına kaydedilir.
- **Initialization Effect**: Uygulama yüklendiğinde `useEffect` ile hafızadaki sekmeler okunur ve `isInitialized` durumuyla güvenli bir şekilde state'e aktarılır.
- **Senkronizasyon (Sync)**: URL değiştiğinde mevcut sekmelerle eşleşme kontrol edilir (`closest match`), eşleşme yoksa (direkt URL girişi gibi) yeni sekme otomatik oluşturulur.

## 2. Gruplama ve Sürükle-Bırak (Dnd-Kit)

### Karşılaşılan Sorunlar
1. **Collapsed Group Dragging**: Gruplar daraltıldığında (collapsed), `QuoteItemGroup` içerisindeki `ref={setNodeRef}` çakışması nedeniyle sürükleme alanı kayboluyordu.
2. **Hatalı Hedef Tespiti**: `closestCenter` stratejisi, çok ince (daraltılmış) hedeflerde kararsız çalışıyordu.

### Çözüm (src/app/quotes/[id]/quote-detail-client-page.tsx)
1. **Ref Temizliği**: `QuoteItemGroup` bileşeninde `CollapsibleContent` içerisindeki mükerrer `ref={setNodeRef}` kaldırıldı. Artık referans sadece en üst seviyedeki grup konteynerinde tutuluyor.
2. **Strateji Değişikliği**: `collisionDetection` stratejisi `closestCorners` olarak güncellendi. Bu, özellikle dar hedeflerin üzerine bırakma (drop) işlemlerinde daha hassas sonuç verir.
3. **Z-Index ve Opacity**: Sürükleme anında görsel karışıklığı önlemek için aktif öğeye `opacity: 0.3` ve `zIndex: 50` uygulandı.

## Kritik Bilgi
Dnd-Kit bileşenlerinde birden fazla alt elemana `setNodeRef` atamak, kütüphanenin alan hesaplamalarını bozar. Her zaman en kapsayıcı (outermost) elemana ref atanmalıdır.
