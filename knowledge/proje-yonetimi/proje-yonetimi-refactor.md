---
title: Proje Yönetimi Refactor (Status Fix)
summary: Proje oluşturma ve güncelleme süreçlerinde veritabanı şema değişikliklerine uyum sağlamak için yapılan teknik düzenlemeler.
---

# Proje Yönetimi: Status Alanı Uyuşmazlığı ve Çözümü

## Özet
Proje veritabanında `status` alanı `ProjeDurumu` (Enum) olarak tanımlanmıştır. Ancak Prisma Client tarafından oluşturulan TypeScript tipleri ile veritabanı şeması arasında, özellikle `status` alanının isimlendirilmesi veya tipi konusunda bir uyuşmazlık (`durum` vs `status`) yaşanmıştır. Bu durum, proje oluşturma ve güncelleme fonksiyonlarında TypeScript derleme hatalarına neden olmuştur.

## Sorun: Prisma Tip Uyuşmazlığı
`src/actions/projects.ts` dosyasında, `prisma.project.create`, `update` ve `findMany` metodlarında kullanılan `select` ve `data` objeleri, `status` alanını tanıyamamaktaydı.

Hata Mesajı Örneği:
```
Property 'status' does not exist on type 'ProjectCreateInput'.
```

## Çözüm: Tip Esnetme (Type Assertion)
Sorunun kök nedeni olan `node_modules` senkronizasyon problemi çözülene kadar, uygulamanın çalışabilirliğini sağlamak amacıyla veritabanı işlemlerinde `as any` tip dönüşümü (casting) uygulanmıştır.

### Uygulanan Değişiklikler

1.  **Select Sorguları:**
    `findMany` metodunda `select` objesi `any` olarak işaretlenerek `status` alanının sorgulanması sağlandı.

    ```typescript
    const allProjects = await prisma.project.findMany({
        select: { status: true, contractAmount: true } as any
    });
    ```

2.  **Veri Güncelleme (Update):**
    `project.update` metodunda `data` objesi `any` yapılarak `status` alanının güncellenmesi sağlandı.

    ```typescript
    await prisma.project.update({
        where: { id },
        data: { status: newStatus } as any
    });
    ```

3.  **Veri Oluşturma (Create):**
    `project.create` metodunda da benzer şekilde `data` objesi cast edildi.

### 4. İlişkili Kayıt Problemi (customerId & customerName)
Proje güncelleme (`update`) işlemlerinde, `data` objesi içerisinde `customerId` veya `customerName` gönderildiğinde Prisma runtime hatası vermektedir.
- `customerName`: Modelde bulunmayan bir sanal alan olduğu için hata verir.
- `customerId`: Veritabanında scalar bir alan olsa da, Prisma `update` sırasında bu alanın doğrudan güncellenmesine izin vermemekte, bunun yerine `customer: { connect: { id: ... } }` yapısını beklemektedir.

**Çözüm:**
Güncelleme fonksiyonlarında (`updateProject`, `importProject` upsert kısmı), bu alanlar payload'dan çıkarılarak (destructuring) Prisma'ya gönderilmemesi sağlanmıştır.

```typescript
// Örnek Çözüm
const { customerId, customerName, ...projectData } = rawData;
await prisma.project.update({
    where: { id },
    data: projectData as any
});
```

### İleriye Dönük Plan
Uzun vadede, proje bağımlılıklarının (`node_modules`) tamamen temizlenip `prisma generate` komutunun çalıştırılmasıyla, Prisma Client tiplerinin şema ile tam senkronize olması hedeflenmektedir. Bu gerçekleştiğinde `as any` kullanımları kaldırılarak tam tip güvenliği (type safety) geri getirilecektir.
