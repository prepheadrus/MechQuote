---
title: Teklif Şablonları (Templates)
summary: Grup bazlı hızlı teklif oluşturma ve şablon yönetimi sistemi.
---

# Teknik Bilgi Maddesi: Teklif Şablonları (Templates) Sistemi

## Özet
Teklif hazırlama sürecini hızlandırmak için grup bazlı şablon (`Template`) yapısı kurulmuştur. Bu sistem, sık kullanılan ürün setlerinin tek tıkla teklife eklenmesini sağlar.

## Teknik Mimari
- **Veri Modeli**: `Template` tablosu, şablon adını ve içeriğini (JSON formatında ürün listesi) depolar.
- **Dinamik Filtreleme**: Şablonlar, ürün gruplarına (`groupName`) göre kategorize edilir. Teklif oluşturma ekranında kullanıcı bir grup seçtiğinde, sadece o gruba ait şablonlar listelenir.
- **Veri Entegrasyonu**: Bir şablon seçildiğinde, şablon içindeki kalemler mevcut teklif kalemlerinin sonuna (veya yerine) akıllı bir şekilde eklenir.

## Kritik Kod Yapısı
```typescript
// Şablon içeriğinin teklife aktarılması (Örnek mantık)
const applyTemplate = (templateItems) => {
    const newItems = templateItems.map(item => ({
        ...item,
        id: crypto.randomUUID(), // Yeni ID ataması
        orderIndex: currentItems.length + 1
    }));
    setItems([...currentItems, ...newItems]);
};
```

## Önemli Notlar
Şablonlar sadece statik veri depolamaz; şablon seçildiği anda sistemdeki güncel liste fiyatlarını (`listPrice`) kontrol ederek teklife en yeni fiyatlarla ekleme yapabilecek şekilde tasarlanmıştır.
