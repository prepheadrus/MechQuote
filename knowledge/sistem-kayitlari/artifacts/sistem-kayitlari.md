# Teknik Bilgi Maddesi: Sistem Kayıtları (Audit Logs) ve İzlenebilirlik

## Özet
Uygulama üzerindeki kritik veri değişikliklerini (oluşturma, silme, durum güncelleme) takip etmek için merkezi bir günlükleme (`AuditLog`) sistemi entegre edilmiştir.

## Uygulama Detayları
- **Merkezi Servis**: `src/services/audit-service.ts` altında bulunan `createAuditLog` fonksiyonu, tüm server action'lar tarafından çağrılabilir.
- **Kapsam**:
  - Teklif oluşturma, güncelleme ve silme.
  - Stok hareketleri (rezervasyonlar).
  - Sistem ayarlarındaki değişiklikler.
- **Veri Yapısı**: Kayıtlar; işlem tipi (`action`), etkilenen tablo (`entity`), kayıt ID'si, açıklama ve işlemi yapan kullanıcı bilgisini içerir.

## Kritik Kod Yapısı (`src/actions/proposals.ts`)
```typescript
await createAuditLog(
    'DELETE',
    'Proposal',
    id,
    `Teklif silindi. No: ${proposal.quoteNumber}, Müşteri: ${proposal.customerName}`,
    null,
    'System'
);
```

## Önemli Notlar
Sistem kayıtları sayfası, sadece izleme amaçlıdır ve bu kayıtların kullanıcı tarafından silinmesine izin verilmez. Bu sayede uygulamanın geçmişe dönük tam bir şeffaflık sağlaması garanti edilir.
