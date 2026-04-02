# Job Assignment Silme ve Kasa Defteri Temizleme

**Tarih:** 28 Şubat 2026  
**Öncelik:** 🔴 KRİTİK (P0)  
**Durum:** ✅ TAMAMLANDI

---

## 📋 SORUN

### Senaryo
1. Proje oluşturuldu (Deneme Projesi)
2. Ekip atandı (Emrah Taşoğlu)
3. 2 ödeme yapıldı:
   - 350,000 TL (Hakediş)
   - 30,000 TL (Ödeme)
4. Proje silindi
5. Ekip atamaları silindi
6. **SORUN:** Kasa defterinde ödemeler hala görünüyor! ❌

### Neden?

**Önceki Kod:**
```typescript
if (totalPaid > 0) {
    await extendedPrisma.personnelTransaction.create({
        data: {
            personnelId: assignment.personnelId,
            amount: 0,
            type: 'Adjustment',
            category: 'Proje Ayrılışı',
            description: `Proje görevlendirmesi iptal edildi...`
        }
    });
}
```

**Sorun:**
- ❌ Sadece Adjustment kaydı oluşturuluyor
- ❌ Mevcut Personnel Transaction'lar silinmiyor
- ❌ Kasa defteri temizlenmiyor
- ❌ Kullanıcı "ödemeler hala var" diyor

---

## ✅ ÇÖZÜM

### Yeni Kod

```typescript
if (totalPaid > 0) {
    // ✅ Personnel Transaction'ları bul
    const personnelTransactions = await prisma.personnelTransaction.findMany({
        where: {
            personnelId: assignment.personnelId,
            referenceId: id, // Bu assignment'a bağlı transaction'lar
            isDeleted: false
        }
    });
    
    // ✅ Her transaction'ı soft delete et
    for (const pt of personnelTransactions) {
        await prisma.personnelTransaction.update({
            where: { id: pt.id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        
        // ✅ Kasa defterinden de sil (ID formatı: ptx-{id})
        await deleteCashEntry(`ptx-${pt.id}`);
    }
    
    // ✅ Adjustment kaydı artık gerek yok (transaction'lar silindi)
}
```

---

## 📊 AKIŞ DİYAGRAMI

```
Job Assignment Sil
    ↓
Assignment Soft Delete (isDeleted: true)
    ↓
Personnel Transaction'ları Bul (referenceId = assignment.id)
    ↓
Her Transaction İçin:
    ├─ Soft Delete (isDeleted: true, deletedAt: new Date)
    └─ Kasa Defterinden Sil (deleteCashEntry)
    ↓
Audit Log Oluştur
    ↓
Revalidate Path (/assignments, /projects)
    ↓
✅ TAMAMLANDI
```

---

## 🧪 TEST SENARYOLARI

### Senaryo 1: Proje Silince Kasa Defteri Temizleniyor mu?

**Adımlar:**
1. Yeni proje oluştur (Test Projesi)
2. Ekip ata (Emrah Taşoğlu)
3. 2 ödeme kaydet:
   - 350,000 TL (Avans)
   - 30,000 TL (Ödeme)
4. Kasa defterinde görünüyor ✅
5. Projeyi sil
6. Kasa defterine git
7. ✅ **Ödemeler artık görünmüyor!**

**Beklenen Sonuç:**
- Personnel Transaction'lar soft delete edildi ✅
- Kasa defteri entry'leri soft delete edildi ✅
- UI'da görünmüyor ✅
- Veritabanında `isDeleted: true` ✅

---

### Senaryo 2: Ekip Üyesi Kaldırma

**Adımlar:**
1. Proje detayına git
2. Ekip sekmesine git
3. Ekip üyesini kaldır (Sil butonu)
4. ✅ "Ekip üyesi kaldırıldı" mesajı
5. Sayfayı yenile (F5)
6. ✅ Kaldırılan üye görünmüyor
7. Kasa defterine git
8. ✅ Ödemeler görünmüyor

---

### Senaryo 3: Zaten Silinmiş Assignment

**Adımlar:**
1. Ekip üyesini kaldır
2. Tekrar silmeye çalış
3. ✅ "Bu atama zaten silinmiş" mesajı

**Kod:**
```typescript
// ✅ Zaten silinmiş mi kontrol et
if (assignment.isDeleted) {
    return { success: false, error: "Bu atama zaten silinmiş." };
}
```

---

## 📁 DOSYALAR

### Güncellenen Dosyalar

**1. `src/actions/job-assignments.ts`**
```typescript
// Import
import { deleteCashEntry } from './cash-book-crud';

// deleteJobAssignment fonksiyonu güncellendi
export async function deleteJobAssignment(id: string) {
    // ...
    if (totalPaid > 0) {
        // Personnel Transaction'ları bul ve sil
        const personnelTransactions = await prisma.personnelTransaction.findMany({
            where: {
                personnelId: assignment.personnelId,
                referenceId: id,
                isDeleted: false
            }
        });
        
        for (const pt of personnelTransactions) {
            await prisma.personnelTransaction.update({
                where: { id: pt.id },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            
            await deleteCashEntry(`ptx-${pt.id}`);
        }
    }
    // ...
}
```

**2. `src/actions/cash-book-crud.ts`**
```typescript
// Yeni dosya
export async function deleteCashEntry(entryId: string) {
    // Entry type'ı bul (prefix'e göre)
    if (entryId.startsWith('ptx-')) {
        // Personnel Transaction
        await prisma.personnelTransaction.update({
            where: { id: entryId.replace('ptx-', '') },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/cash-book');
        return { success: true, message: 'Kasa kaydı silindi.' };
    }
    // ... diğer tipler
}
```

---

## 🔍 KOD DETAYLARI

### 1. Reference ID ile Transaction Bulma

```typescript
const personnelTransactions = await prisma.personnelTransaction.findMany({
    where: {
        personnelId: assignment.personnelId,
        referenceId: id, // Bu assignment ID'si
        isDeleted: false
    }
});
```

**Neden `referenceId: id`?**
- Her Personnel Transaction'ın `referenceId` alanı var
- Job Assignment silinirken `referenceId: assignment.id` set edilir
- Böylece sadece bu assignment'a bağlı transaction'lar bulunur

---

### 2. ID Formatı

**Personnel Transaction ID:** `abc123...` (UUID)  
**Cash Book Entry ID:** `ptx-abc123...` (Prefix + UUID)

```typescript
// Personnel Transaction'dan Cash Book Entry ID'si oluştur
const cashBookEntryId = `ptx-${pt.id}`;

// deleteCashEntry çağır
await deleteCashEntry(cashBookEntryId);
```

---

### 3. Soft Delete Pattern

```typescript
await prisma.personnelTransaction.update({
    where: { id: pt.id },
    data: {
        isDeleted: true,
        deletedAt: new Date()
    }
});
```

**Soft Delete Avantajları:**
- ✅ Veri kaybolmaz (geri yüklenebilir)
- ✅ Audit trail korunur
- ✅ Raporlarda tutarlılık
- ✅ Yanlışlıkla silme durumunda geri alınabilir

---

## ⚠️ DİKKAT EDİLECEKLER

1. **Transaction Atomikliği:**
   - Personnel Transaction silme
   - Cash Book Entry silme
   - İkisi de başarılı olmalı

2. **Revalidate Path:**
   ```typescript
   revalidatePath('/cash-book');
   revalidatePath('/assignments');
   revalidatePath('/projects');
   ```

3. **Audit Log:**
   ```typescript
   await createAuditLog(
       'DELETE_ASSIGNMENT',
       'JobAssignment',
       id,
       `Ekip üyesi ataması silindi. Ekip: ${assignment.personnel.name}. Toplam ödenen: ${totalPaid} TL`,
       null,
       'System'
   );
   ```

---

## 📊 METRİKLER

| Metrik | Önce | Sonra |
|--------|------|-------|
| Personnel Transaction Silme | ❌ Yok | ✅ Var |
| Cash Book Cleanup | ❌ Yok | ✅ Var |
| Soft Delete | ❌ Yok | ✅ Var |
| Audit Trail | ✅ Var | ✅ Geliştirildi |
| Revalidate | ✅ Var | ✅ Geliştirildi |

---

## 🚀 GELECEKTE DİKKAT EDİLECEKLER

1. **Başka bir entity silindiğinde:**
   - İlişkili transaction'ları bul
   - Soft delete et
   - Cash book'tan sil

2. **Pattern:**
   ```typescript
   // 1. İlişkili transaction'ları bul
   const transactions = await prisma.XTransaction.findMany({
       where: { referenceId: id, isDeleted: false }
   });
   
   // 2. Soft delete et
   for (const t of transactions) {
       await prisma.XTransaction.update({
           where: { id: t.id },
           data: { isDeleted: true, deletedAt: new Date() }
       });
       
       // 3. Cash book'tan sil
       await deleteCashEntry(`prefix-${t.id}`);
   }
   ```

---

**Doküman Oluşturulma:** 28 Şubat 2026  
**Son Güncelleme:** 28 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Production-Ready
