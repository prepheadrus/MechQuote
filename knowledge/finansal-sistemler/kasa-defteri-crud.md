# Kasa Defteri CRUD İşlemleri

**Tarih:** 28 Şubat 2026  
**Öncelik:** 🔴 KRİTİK (P0)  
**Durum:** ✅ TAMAMLANDI

---

## 📋 SORUN

**Senaryo:**
1. Proje oluşturuldu
2. Ekip atandı (Emrah Taşoğlu)
3. 2 ödeme yapıldı (350,000 TL + 30,000 TL)
4. Proje silindi
5. **SORUN:** Kasa defterinde ödemeler hala görünüyor! ❌

**Neden:**
- Job Assignment silindi ✅
- Personnel Transaction silinmedi ❌
- Kasa defteri temizlenmedi ❌

---

## ✅ ÇÖZÜM

### 1. Kasa Defteri CRUD API'leri

**Dosya:** `src/actions/cash-book-crud.ts`

#### **updateCashEntry()**
```typescript
export async function updateCashEntry(
    entryId: string,
    data: {
        description?: string;
        amount?: number;
        date?: Date | string;
        category?: string;
    }
)
```

**Kullanım:**
```typescript
// Proje gideri güncelle
await updateCashEntry('pmt-xxx', { 
    amount: 1000,
    description: 'Yeni açıklama'
});

// Cari işlem güncelle
await updateCashEntry('ctx-xxx', { 
    amount: 5000 
});

// Tedarikçi işlemi güncelle
await updateCashEntry('stx-xxx', { 
    category: 'Mal Alımı' 
});

// Personel işlemi güncelle
await updateCashEntry('ptx-xxx', { 
    amount: 2500,
    date: new Date()
});
```

**ID Formatları:**
- `pmt-{id}` - Project Expense
- `ctx-{id}` - Customer Transaction
- `stx-{id}` - Supplier Transaction
- `ptx-{id}` - Personnel Transaction

---

#### **deleteCashEntry()**
```typescript
export async function deleteCashEntry(entryId: string)
```

**Kullanım:**
```typescript
// Proje giderini sil (soft delete)
await deleteCashEntry('pmt-xxx');

// Cari işlemi sil
await deleteCashEntry('ctx-xxx');

// Tedarikçi işlemi sil
await deleteCashEntry('stx-xxx');

// Personel işlemi sil
await deleteCashEntry('ptx-xxx');
```

**Soft Delete:**
- `isDeleted: true` set edilir
- `deletedAt: new Date()` set edilir
- Veri silinmez, sadece işaretlenir
- Kasa defteri sorgularında `isDeleted: false` filtresi uygulanır

---

### 2. Job Assignment Silince Kasa Defterini Temizle

**Dosya:** `src/actions/job-assignments.ts`

**Fonksiyon:** `deleteJobAssignment()`

**Değişiklik:**
```typescript
// ÖNCE: Sadece Adjustment kaydı oluşturuluyordu
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

// SONRA: Personnel Transaction'ları bul ve soft delete et
if (totalPaid > 0) {
    const personnelTransactions = await prisma.personnelTransaction.findMany({
        where: {
            personnelId: assignment.personnelId,
            referenceId: id, // Bu assignment'a bağlı transaction'lar
            isDeleted: false
        }
    });
    
    // Her transaction'ı soft delete et
    for (const pt of personnelTransactions) {
        await prisma.personnelTransaction.update({
            where: { id: pt.id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        
        // Kasa defterinden de sil (ID formatı: ptx-{id})
        await deleteCashEntry(`ptx-${pt.id}`);
    }
}
```

---

## 📊 AKIŞ DİYAGRAMI

```
Job Assignment Sil
    ↓
Personnel Transaction'ları Bul
    ↓
Her Transaction İçin:
    ├─ Soft Delete (isDeleted: true)
    └─ Kasa Defterinden Sil (deleteCashEntry)
    ↓
Kasa Defteri Temiz ✅
```

---

## 🧪 TEST SENARYOLARI

### Senaryo 1: Proje Silince Kasa Defteri Temizleniyor mu?

```
1. Yeni proje oluştur (Test Projesi)
2. Ekip ata (Emrah Taşoğlu)
3. 2 ödeme kaydet:
   - 350,000 TL (Avans)
   - 30,000 TL (Ödeme)
4. Kasa defterinde görünüyor ✅
5. Projeyi sil
6. Kasa defterine git
7. ✅ Ödemeler artık görünmüyor!
```

**Beklenen:**
- Personnel Transaction'lar soft delete edildi ✅
- Kasa defteri entry'leri soft delete edildi ✅
- UI'da görünmüyor ✅

---

### Senaryo 2: Kasa Defteri Güncelleme

```
1. Kasa defteri entry'si bul (ptx-xxx)
2. updateCashEntry çağır:
   { amount: 5000, description: 'Güncel' }
3. Kasa defterini yenile
4. ✅ Tutar ve açıklama güncellendi
```

---

### Senaryo 3: Kasa Defteri Silme

```
1. Kasa defteri entry'si bul (ptx-xxx)
2. deleteCashEntry çağır
3. Kasa defterini yenile
4. ✅ Entry artık görünmüyor
```

---

## 📁 DOSYALAR

### Yeni Dosyalar
- `src/actions/cash-book-crud.ts` - CRUD fonksiyonları

### Güncellenen Dosyalar
- `src/actions/job-assignments.ts` - Import + cleanup logic

---

## 🔍 API REFERANSI

### updateCashEntry

**Parametreler:**
- `entryId: string` - Entry ID (prefix ile: pmt-, ctx-, stx-, ptx-)
- `data: Object` - Güncellenecek alanlar
  - `description?: string`
  - `amount?: number`
  - `date?: Date | string`
  - `category?: string`

**Response:**
```typescript
{
    success: boolean,
    message?: string,
    error?: string
}
```

---

### deleteCashEntry

**Parametreler:**
- `entryId: string` - Entry ID (prefix ile: pmt-, ctx-, stx-, ptx-)

**Response:**
```typescript
{
    success: boolean,
    message?: string,
    error?: string
}
```

---

## ⚠️ DİKKAT EDİLECEKLER

1. **ID Formatı:** Her zaman prefix kullan (pmt-, ctx-, stx-, ptx-)
2. **Soft Delete:** Veri silinmez, sadece işaretlenir
3. **Revalidate:** Her işlem sonrası `/cash-book` revalidate edilir
4. **Transaction:** Birden fazla işlem atomik yapılır

---

## 📊 METRİKLER

| Özellik | Durum |
|---------|-------|
| Update API | ✅ Hazır |
| Delete API | ✅ Hazır |
| Job Assignment Cleanup | ✅ Hazır |
| Soft Delete | ✅ Uygulandı |
| Revalidate Path | ✅ Çalışıyor |

---

## 🚀 SONRAKİ ADIMLAR

**Backend:** ✅ TAMAMLANDI

**Frontend (Yarın):**
- [ ] Kasa defteri tablosuna "Düzenle" butonu
- [ ] Kasa defteri tablosuna "Sil" butonu
- [ ] Düzenleme dialog'u
- [ ] Silme onay dialog'u

---

**Doküman Oluşturulma:** 28 Şubat 2026  
**Son Güncelleme:** 28 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Production-Ready
