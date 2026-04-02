---
description: Proje durum yönetimi, tipleme standartları ve projelendirme aşamasındaki maliyet ayrıştırma mantığı.
tags: [project, status, typescript, prisma, toast, costs]
created: 2026-02-17
---

# 📋 Proje Durum Sistemi ve Tip Güvenliği

## 🚩 Sorun
Proje durum takibi (`durum`) sistemi, başlangıçta Prisma Enum yapısı ile planlanmış ancak uygulama genelinde `String` ve farklı tiplemelerle (örn: `ProjectStatus` interface) kullanılması nedeniyle TS hatalarına yol açıyordu. Ayrıca:
- `Project` modeli ile finansal kalemler (`InvoiceItem`, `ProposalItem`) arasındaki ilişkiler eksikti.
- Toast bildirimlerinde eski `sonner` kütüphanesi kullanılıyordu, bu da UI bütünlüğünü bozuyordu.
- Next.js 15'e geçiş sonrası dinamik route parametreleri (`params`) asenkron hale gelmiş, ancak kodda hala senkron olarak erişilmeye çalışılıyordu.

## 🛠️ Uygulanan Çözüm
Sistem, tip güvenliği ve Next.js 15 standartlarına uygun olarak tamamen refaktör edildi:

1.  **Şema Standardizasyonu:** `prisma/schema.prisma` dosyasında `durum` alanı `status` (String) olarak güncellendi. Varsayılan değer `SOZLESME_ASAMASI` olarak belirlendi.
2.  **İlişkisel Bütünlük:** `Project` modeli ile `InvoiceItem` ve `ProposalItem` arasında ters ilişkiler (back-relations) tanımlandı. Bu, projenin maliyet analizini ve mükerrer ürün birleştirmeyi kolaylaştırdı.
3.  **UI Refaktörü:** `ProjectStatusUpdater` bileşeni `@/hooks/use-toast` (shadcn) yapısına geçirildi. Durum geçişlerinde ileriye dönük iş akışı kontrolü (business logic) eklendi.
4.  **Next.js 15 Uyumu:** `ProjectDetail`, `ProductDetail` ve `QuotePrint` gibi sayfalarda `params` ve `searchParams` erişimleri `await` ile asenkron hale getirildi.
5.  **Durum Geçiş Kontrolü (Business Logic):** Proje durumları artık sadece hiyerarşik olarak ileriye (veya iptal/askıya alma gibi terminal durumlara) taşınabilir. Bu, iş akışının tutarlılığını sağlar ve geçmişe dönük hatalı durum güncellemelerini engeller.
6.  **Maliyet Ayrıştırma:** Proje maliyetleri; malzeme (kategori bazlı) ve işçilik (ekip ataması bazlı) olarak otomatik ayrıştırılacak şekilde `src/actions/projects.ts` içinde güncellendi.

## 🧩 Kritik Kod Parçaları

### 1. Durum Güncelleme Mantığı (`ProjectStatusUpdater.tsx`)
```tsx
const handleStatusChange = async (newStatus: ProjeDurumu) => {
  setIsUpdating(true);
  try {
    const result = await updateProjectStatus(project.id, newStatus);
    if (result.success) {
      setCurrentStatus(newStatus);
      toast({ title: "Başarılı", description: "Proje durumu güncellendi." });
    } else {
      throw new Error(result.error);
    }
  } catch (error: any) {
    toast({ variant: "destructive", title: "Hata", description: error.message });
  } finally {
    setIsUpdating(false);
  }
};
```

### 2. Maliyet Ayrıştırma ve Tip Güvenliği (`src/actions/projects.ts`)
```typescript
// Malzeme ve işçilik maliyetlerini dinamik olarak hesaplama
calculatedMaterialCost = proposalWithItems.items.reduce((sum: number, item: any) => {
    const category = item.productId ? productCategoryMap.get(item.productId) : null;
    if (category === 'İşçilik') return sum; // İşçilik kalemlerini hariç tut
    const xr = getExchangeRate(item.currency, proposalWithItems);
    return sum + (item.quantity * item.basePrice * xr);
}, 0);

calculatedLaborCost = proposalWithItems.jobAssignments.reduce((sum: number, ja: any) => 
    sum + (ja.assignedAmount || 0), 0);
```

### 3. İlişkisel Şema Tanımı (`schema.prisma`)
```prisma
model Project {
  id      String @id @default(uuid())
  status  String @default("SOZLESME_ASAMASI")
  // ...
  invoiceItems InvoiceItem[]
  proposals    Proposal[] @relation("ProjectProposals")
}
```

## ✅ Kazanımlar
- Tüm projede tutarlı tipleme (TypeScript Hataları: 0).
- Proje detay sayfalarında otomatik hesaplanan malzeme/işçilik bütçesi.
- Next.js 15 standartlarına tam uyumluluk.
- Mükerrer ürün kartlarının birleştirilmesi sırasında veri kaybının önlenmesi.
