# Job Assignment Hakediş Düzenleme

**Tarih:** 28 Şubat 2026  
**Öncelik:** 🔴 KRİTİK (P0)  
**Durum:** ✅ TAMAMLANDI

---

## 📋 SORUN

**Hakediş düzenlenirken YENİ kayıt oluşturuluyordu, eski kayıt silinmiyordu!**

**Senaryo:**
1. Ergün Usta'ya hakediş girildi: ₺10,000
2. Hakediş düzeltildi: ₺15,000
3. **SORUN:** Her iki kayıt da cari hesaba eklendi
4. **Sonuç:** ₺10,000 + ₺15,000 = **₺25,000** (yanlış bakiye!)

---

## 🔍 KÖK SEBEP

**`updateJobAssignmentPayment()` fonksiyonunda:**

```typescript
// ❌ EKSİK: Updated payments kontrolü YOKTU!
const newPayments = newHistory.filter((n: any) => 
    n.id && !oldHistory.some((o: any) => o.id === n.id)
);

const removedPayments = oldHistory.filter((o: any) => 
    o.id && !newHistory.some((n: any) => n.id === o.id)
);

// ❌ updatedPayments YOKTU!
```

**Sonuç:**
- Yeni payment → CREATE ✅
- Silinen payment → DELETE ✅
- **Düzenlenen payment** → ❌ **Hiçbir şey YOK!** (ne update, ne delete)
- **Sonuç:** Yeni kayıt oluşturuldu, eski kayıt kaldı → DUPLIKASYON!

---

## ✅ ÇÖZÜM

### 1. Updated Payments Tespiti

```typescript
// ✅ YENİ: Düzenlenenleri bul (aynı ID, farklı tutar)
const updatedPayments = newHistory.filter((n: any) => {
    const oldPayment = oldHistory.find((o: any) => o.id === n.id);
    return oldPayment && oldPayment.amount !== n.amount;
});
```

**Mantık:**
- `newHistory`'de var
- `oldHistory`'de de var (aynı ID)
- AMA `amount` FARKLI
- → Bu bir düzenleme!

---

### 2. Personnel Transaction Update

```typescript
// ✅ YENİ: Düzenlenen payments için update logic
for (const payment of updatedPayments) {
    const existingTx = await prisma.personnelTransaction.findUnique({
        where: { id: payment.id }
    });
    
    if (existingTx) {
        const oldAmount = existingTx.amount;
        const newAmount = payment.amount;
        const balanceDiff = newAmount - oldAmount;
        
        // Transaction'ı güncelle
        await prisma.personnelTransaction.update({
            where: { id: payment.id },
            data: {
                amount: newAmount,
                description: `${personnel.name} - Ödemesi: ${payment.note || ''}`,
                date: new Date(payment.date)
            }
        });
        
        // Bakiyeyi düzelt (farkı ekle/çıkar)
        await prisma.personnel.update({
            where: { id: personnelId },
            data: { balance: { increment: balanceDiff } }
        });
        
        logger.info(`PersonnelTransaction ${payment.id} güncellendi: ₺${oldAmount} → ₺${newAmount} (Fark: ₺${balanceDiff})`);
    }
}
```

**Örnek:**
- Eski tutar: ₺10,000
- Yeni tutar: ₺15,000
- `balanceDiff`: ₺5,000
- **Bakiye güncellemesi:** `balance += 5000` ✅

---

### 3. Project Expense Update

```typescript
// ✅ YENİ: ProjectExpense update logic
for (const payment of updatedPayments) {
    const existingExpense = await prisma.projectExpense.findUnique({
        where: { id: payment.id }
    });
    
    if (existingExpense) {
        await prisma.projectExpense.update({
            where: { id: payment.id },
            data: {
                amount: payment.amount,
                description: `Ekip Ödemesi: ${personnel.name}${payment.note ? ` (${payment.note})` : ''}`,
                date: new Date(payment.date)
            }
        });
        
        logger.info(`ProjectExpense ${payment.id} güncellendi: ₺${existingExpense.amount} → ₺${payment.amount}`);
    }
}
```

---

### 4. Audit Log Güncellemesi

```typescript
// ✅ GÜNCELLENMİŞ: Detaylı audit log
await createAuditLog(
    'UPDATE_PAYMENTS',
    'JobAssignment',
    assignmentId,
    `Ödeme geçmişi güncellendi. Yeni ödemeler: ${newPayments.length}, Güncellenen: ${updatedPayments.length}, Silinen: ${removedPayments.length}`,
    null,
    'System'
);
```

**Örnek Log:**
```
Ödeme geçmişi güncellendi. Yeni ödemeler: 0, Güncellenen: 1, Silinen: 0
```

---

## 📊 AKIŞ DİYAGRAMI

```
Hakediş Düzenleme
    ↓
Payment History Karşılaştır
    ↓
┌─────────────────────────────────┐
│ 3 Kategori Tespit Et:           │
│ 1. newPayments (yeni eklenenler)│
│ 2. updatedPayments (değişenler) │
│ 3. removedPayments (silinenler) │
└─────────────────────────────────┘
    ↓
┌─────────────────────────────────┐
│ Her Kategori İçin:              │
│                                 │
│ 1. NEW:                         │
│    → CREATE Transaction         │
│    → CREATE ProjectExpense      │
│    → Balance += amount          │
│                                 │
│ 2. UPDATED:                     │
│    → UPDATE Transaction         │
│    → UPDATE ProjectExpense      │
│    → Balance += (new - old)     │
│                                 │
│ 3. REMOVED:                     │
│    → DELETE Transaction         │
│    → DELETE ProjectExpense      │
│    → Balance -= amount          │
└─────────────────────────────────┘
    ↓
Audit Log + Revalidate
    ↓
✅ TAMAMLANDI
```

---

## 🧪 TEST SENARYOLARI

### Senaryo 1: Hakediş Düzenleme
```
1. Proje detayına git (Beyaz Saray Apartmanı)
2. Ekip sekmesine git
3. Ergün Usta'yı bul
4. Hakediş gir: ₺10,000
5. Kaydet
6. Hakedişi tekrar aç
7. Düzenle: ₺15,000
8. Güncelle
9. ✅ Console log: "PersonnelTransaction xxx güncellendi: ₺10000 → ₺15000 (Fark: ₺5000)"
10. Ekipler sayfasına git
11. Ergün Usta'nın bakiyesi: ₺15,000 ✅ (₺25,000 DEĞİL!)
```

### Senaryo 2: Hakediş Silme
```
1. Hakediş gir: ₺10,000
2. Kaydet
3. Hakedişi aç
4. Tutarı sil (₺0 yap)
5. Güncelle
6. ✅ Console log: "PersonnelTransaction xxx silindi"
7. Bakiye: ₺0 ✅
```

### Senaryo 3: Yeni + Düzenleme Karışık
```
1. Hakediş 1: ₺10,000 (Kaydet)
2. Hakediş 2: ₺5,000 (Kaydet)
3. Hakediş 1'i düzenle: ₺15,000
4. ✅ Bakiye: ₺15,000 + ₺5,000 = ₺20,000 ✅
```

---

## 📝 DOSYALAR

### Güncellenen Dosyalar:
- `src/actions/job-assignments.ts` - `updateJobAssignmentPayment()` fonksiyonu

**Değişiklikler:**
- ✅ `updatedPayments` tespiti eklendi (satır 68-73)
- ✅ ProjectExpense update logic eklendi (satır 107-125)
- ✅ PersonnelTransaction update logic eklendi (satır 161-189)
- ✅ Audit log güncellendi (satır 207-214)

---

## ⚠️ DİKKAT EDİLECEKLER

### 1. Payment ID Oluşturma

```typescript
// ✅ DOĞRU: Unique ID kullan
const payment = {
    id: crypto.randomUUID(), // ✅ Unique
    amount: 10000,
    date: new Date(),
    note: 'Hakediş'
};

// ❌ YANLIŞ: Timestamp kullan (çakışabilir!)
const payment = {
    id: Date.now().toString(), // ❌ Çakışabilir!
    amount: 10000,
    date: new Date(),
    note: 'Hakediş'
};
```

### 2. Balance Düzeltme

```typescript
// ✅ DOĞRU: Farkı hesapla
const balanceDiff = newAmount - oldAmount;
await prisma.personnel.update({
    where: { id: personnelId },
    data: { balance: { increment: balanceDiff } }
});

// ❌ YANLIŞ: Yeni tutarı direkt ekle
await prisma.personnel.update({
    where: { id: personnelId },
    data: { balance: { increment: newAmount } } // ❌ ÇIFT SAYMA!
});
```

### 3. Transaction Update

```typescript
// ✅ DOĞRU: Update kullan
await prisma.personnelTransaction.update({
    where: { id: payment.id },
    data: { amount: newAmount }
});

// ❌ YANLIŞ: Create kullan (duplikasyon!)
await prisma.personnelTransaction.create({
    data: { id: payment.id, amount: newAmount } // ❌ HATA!
});
```

---

## 📊 METRİKLER

| Metrik | Önce | Sonra |
|--------|------|-------|
| Duplikasyon | ❌ Var | ✅ Yok |
| Update Logic | ❌ YOK | ✅ Var |
| Balance Düzeltme | ❌ YOK | ✅ Var (diff) |
| Audit Log | ⚠️ Genel | ✅ Detaylı |
| Log Messages | ❌ YOK | ✅ Var |

---

## 🚀 GELECEK İYİLEŞTİRMELER

- [ ] Hakediş geçmişi UI'da göster (timeline)
- [ ] Düzenleme reason'u ekle (neden değiştirildi?)
- [ ] Version history (her düzenleme bir version)
- [ ] Undo özelliği (son düzenlemeyi geri al)
- [ ] Bulk hakediş düzenleme (toplu)

---

## 📝 ÖĞRENILENLER

1. **Update vs Create:** Düzenleme yaparken UPDATE kullan, CREATE değil!
2. **Balance Diff:** Bakiyeyi düzeltirken farkı hesapla (new - old)
3. **ID Tracking:** Payment ID'leri unique olmalı (crypto.randomUUID)
4. **Audit Trail:** Her düzenlemeyi logla (ne, ne zaman, neden değişti)

---

**Doküman Oluşturulma:** 28 Şubat 2026  
**Son Güncelleme:** 28 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Production-Ready
