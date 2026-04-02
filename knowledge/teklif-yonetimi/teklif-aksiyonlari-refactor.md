---
description: `src/actions/proposals.ts` dosyasındaki mimari, tip güvenliği ve veri tutarlılığı sorunlarının tespiti ve merkezi `pricing.ts` motoruna uyumlu hale getirilmesi sürecini belgeler.
tags: [refactor, pricing, type-safety, proposals, server-actions, technical-debt]
created: 2026-02-17
---

# 🛠️ Refactor: `proposals.ts` Aksiyonlarının Kurallara Uygun Hale Getirilmesi

Bu doküman, `src/actions/proposals.ts` dosyasında tespit edilen ve projenin temel kurallarını (`.cursorrules`) ihlal eden kritik sorunları ve bu sorunları gidermek için uygulanan refactor sürecini açıklamaktadır.

## 🚩 Sorun: Tespit Edilen İhlaller

`@current_problems` komutu ile yapılan kod tabanı analizinde, teklif yönetiminin kalbi olan `proposals.ts` dosyasında dört ana başlıkta ciddi sorunlar tespit edilmiştir:

1.  **Mimari Sorun: Yinelenen Fiyatlandırma Mantığı**
    -   `createProposal`, `updateProposalItems`, `copyProposalToCustomer` gibi kritik fonksiyonlar, tekliflerin toplam tutarını hesaplarken merkezi fiyatlandırma motoru olan `src/lib/pricing.ts`'i kullanmak yerine kendi içlerinde manuel formüller uyguluyordu.
    -   **Risk:** Bu durum, `pricing.ts`'de yapılacak bir kural değişikliğinin (örn: yeni vergi) sisteme yansımamasına ve ciddi hesaplama tutarsızlıklarına yol açma potansiyeli taşıyordu.

2.  **Tip Güvenliği İhlalleri (`any` kullanımı)**
    -   `.cursorrules` dosyasında `any` tipi kesinlikle yasaklanmış olmasına rağmen, `getProposals` fonksiyonunda filtreleme objesi `where: any` olarak tanımlanmış ve bazı fonksiyonlarda `as any` cast işlemi uygulanmıştı.
    -   **Risk:** Bu ihlaller, TypeScript'in sağladığı tip güvenliğini ortadan kaldırarak beklenmedik çalışma zamanı hatalarına zemin hazırlıyordu.

3.  **Veri Tutarlılığı Sorunları (Sihirli String'ler)**
    -   Teklif durumu (`status`) gibi alanlar, `'Approved'`, `'Draft'` gibi doğrudan kod içine yazılmış metinlerle yönetiliyordu.
    -   **Risk:** Bu yaklaşım, yazım hatalarına son derece açıktır ve bulunması zor hatalara neden olabilir.

4.  **Hatalı Veri Kullanımı (Hardcoded Değerler)**
    -   `copyProposalToCustomer` fonksiyonu, döviz kurlarını veritabanındaki `Settings` tablosundan çekmek yerine `const exchangeRateUSD = 32.50;` gibi sabit değerlerle atıyordu.
    -   **Risk:** Bu durum, sistemin dinamik ayarlarını işlevsiz kılıyordu.

---

## ⚙️ Uygulanan Çözüm

Bu sorunları çözmek ve dosyayı proje standartlarına çekmek için kapsamlı bir refactor süreci başlatılmıştır.

### 1. Fiyatlandırma Mantığının Merkezileştirilmesi
Tutar hesaplaması yapılan tüm fonksiyonlar (`createProposal`, `updateProposalItems`, `copyProposalToCustomer`, `getProposalDiff` vb.) `src/lib/pricing.ts` dosyasındaki `calculateItemTotals` fonksiyonunu kullanacak şekilde yeniden yazılmıştır. Bu, tüm fiyatlandırma mantığının tek bir kaynaktan yönetilmesini garanti altına alır.

**Örnek Kritik Kod Parçası (`createProposal`):**

*   **Önce:**
    ```typescript
    // Manuel ve hatalı hesaplama
    const totalAmount = data.items.reduce((sum, item) => {
        // ... karmaşık ve yinelenen formüller ...
        const sellPrice = cost * (1 + item.profitMargin) * exchangeRate;
        const itemTotal = sellPrice * item.quantity;
        return sum + itemTotal;
    }, 0);
    ```

*   **Sonra:**
    ```typescript
    // Merkezi pricing.ts motorunu kullanan, güvenilir ve tek satırlık hesaplama
    const totalAmount = data.items.reduce((sum, item) => {
        const totals = calculateItemTotals({ ...item, exchangeRate });
        return sum + totals.totalTlSell; // totalTlSell KDV hariç toplamdır.
    }, 0);
    ```

### 2. Tip Güvenliğinin Sağlanması
-   `any` tipi kullanılan tüm yerler, Prisma tarafından otomatik üretilen (`Prisma.ProposalWhereInput` gibi) veya özel olarak tanımlanmış (`ProposalStatus` gibi) tiplerle değiştirilmiştir.
-   `as any` cast işlemleri tamamen kaldırılmıştır.

### 3. "Magic String"lerin Ortadan Kaldırılması
-   Teklif durumları için `'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Cancelled'` gibi değerleri içeren `ProposalStatus` adında bir `type` oluşturulmuştur.
-   Fonksiyon parametreleri ve iç mantıklar artık bu güvenli tipi kullanmaktadır.

```typescript
// Önce: export async function updateProposalStatus(id: string, newStatus: string)
// Sonra:
export type ProposalStatus = 'Draft' | 'Sent' | 'Approved' | 'Rejected' | 'Cancelled';
export async function updateProposalStatus(id: string, newStatus: ProposalStatus) { ... }
```

### 4. Dinamik Veri Kullanımı
-   Sabit kodlanmış döviz kurları gibi değerler, veritabanındaki `Settings` tablosundan veya ilgili teklifin kendi kayıtlı kur değerlerinden okunacak şekilde düzeltilmiştir.

---

## ✅ Sonuç
Bu refactor işlemiyle `proposals.ts` dosyası, projenin temel mimari prensiplerine tam uyumlu hale getirilmiştir. Bu sayede kodun sürdürülebilirliği, okunabilirliği ve güvenilirliği önemli ölçüde artırılmıştır. Gelecekte yapılacak fiyatlandırma kuralı değişiklikleri, artık hiçbir ek müdahaleye gerek kalmadan sistemin tamamına doğru bir şekilde yansıyacaktır.