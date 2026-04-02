# Teknik Bilgi Maddesi: Stok Rezervasyon Sistemi

## Özet
Teklif onay süreci ile stok yönetimi arasında atomik bir entegrasyon kurulmuştur. Ürünlerin sadece satıldığında değil, "onaylandığında" rezerve edilmesi sağlanmıştır.

## Teknik Çözüm: Atomik İşlemler
Teklif durumu her değiştiğinde `prisma.$transaction` kullanılarak şu işlemler gerçekleştirilir:

1.  **Onaylanma Durumu (Approved)**:
    - Teklif içindeki tüm ürünler için `product.reservedQuantity` artırılır.
    - `StockMovement` tablosuna "RESERVED" tipinde bir kayıt atılır.
    - Müşteri bakiyesi (Debt) artırılır ve finansal işlem kaydedilir.

2.  **İptal veya Durum Değişikliği**:
    - Teklif "Onaylandı"dan başka bir duruma çekilirse `reservedQuantity` aynı miktarda azaltılır.
    - Rezervasyon kaydı geri alınır (`RESERVE_RELEASED`).
    - Müşteri bakiyesi ve ilgili finansal kayıtlar temizlenir.

## Kritik Kod Yapısı (`src/actions/proposals.ts`)
```typescript
if (newStatus === 'Approved' && oldStatus !== 'Approved') {
    // Stok Rezerve Et
    await tx.product.update({
        where: { id: item.productId },
        data: { reservedQuantity: { increment: item.quantity } }
    });
} else if (oldStatus === 'Approved' && newStatus !== 'Approved') {
    // Rezervasyonu Kaldır
    await tx.product.update({
        where: { id: item.productId },
        data: { reservedQuantity: { decrement: item.quantity } }
    });
}
```

## Neden Bu Tercih Yapıldı?
Stoktaki ürünlerin fiziksel olarak çıkışı yapılmadan önce (fatura/sevk aşaması), başka bir teklife satılmasını engellemek için "Rezervasyon" mantığı tercih edilmiştir.
