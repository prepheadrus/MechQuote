# Teknik Bilgi Maddesi: Toplu İşlemler (Bulk Actions) Mimarisi

## Özet
Teklif arşivi gibi liste görünümlerinde, çoklu kayıtlar üzerinde aynı anda işlem yapmayı sağlayan bir toplu işlem yeteneği geliştirilmiştir.

## Teknik Uygulama
- **Durum Yönetimi (State)**: Seçili öğelerin ID'leri bir `Set` veya `Array` içinde (`selectedIds`) tutulur.
- **Toplu Seçim Logic**: "Hepsini Seç" özelliği, filtrelenmiş listedeki tüm ID'leri tek seferde state'e ekler veya çıkarır.
- **Performans**: Toplu işlemler Prisma'nın `updateMany` veya `deleteMany` fonksiyonları kullanılarak veri tabanı seviyesinde optimize edilir.

## Kritik Çözümler
1. **Güvenlik Kontrolü**: Toplu silme gibi işlemlerden önce kullanıcıya etkilenen kayıt sayısını gösteren bir `AlertDialog` onayı sunulur.
2. **Durum Bazlı Filtreleme**: Örneğin; sadece "Taslak" modundaki tekliflerin toplu silinmesine izin verilerek, onaylı tekliflerin yanlışlıkla silinmesi engellenir.

## Önemli Not
Toplu işlem butonları sadece en az bir öğe seçildiğinde görünür hale gelerek arayüz karmaşasını (UI clutter) azaltır.
