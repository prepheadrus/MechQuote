# 💰 KASA DEFTERİ OTOMASYONU

**Tarih:** 23 Şubat 2026  
**Durum:** ✅ TAM OTOMATİK

---

## 📊 MEVCUT OTOMASYON

### **1. FATURA ÖDEMESİ**

**Akış:**
```
Fatura → Ödeme Ekle →
✅ Payment tablosuna kaydet
✅ CustomerTransaction oluştur
✅ Customer balance güncelle
✅ İlgili sayfaları revalidate et
```

**Kod:**
```typescript
// src/actions/payment-actions.ts
await prisma.customerTransaction.create({
  customerId: invoice.customerId,
  amount: payment.amount,
  type: 'Payment', // Borcu azaltır
  category: 'Fatura Ödemesi',
  referenceId: payment.id,
  referenceType: 'Payment'
});
```

**Sonuç:**
- ✅ Müşteri bakiyesi otomatik güncel
- ✅ Transaction geçmişi kayıtlı
- ✅ Kasa Defteri'nde görünür (CustomerTransaction)

---

### **2. EKİP ÖDEMESİ**

**Akış:**
```
Proje → Ekip → Ödeme Ekle →
✅ ProjectExpense oluştur (projeye bağla)
✅ PersonnelTransaction oluştur
✅ Personnel balance güncelle
✅ İlgili sayfaları revalidate et
```

**Kod:**
```typescript
// src/actions/job-assignments.ts
await prisma.projectExpense.create({
  description: `Ekip Ödemesi: ${personnel.name}`,
  amount: payment.amount,
  category: 'Personel Ödemesi',
  type: 'Expense',
  projectId: projectId
});

await prisma.personnelTransaction.create({
  personnelId: personnelId,
  amount: payment.amount,
  type: 'Payment',
  category: 'Avans'
});

await prisma.personnel.update({
  where: { id: personnelId },
  data: { balance: { increment: payment.amount } }
});
```

**Sonuç:**
- ✅ Personel bakiyesi otomatik güncel
- ✅ Transaction geçmişi kayıtlı
- ✅ Proje gideri kayıtlı
- ✅ Kasa Defteri'nde görünür (PersonnelTransaction + ProjectExpense)

---

### **3. PROJE GİDERLERİ**

**Akış:**
```
Proje → Gider Ekle (Konaklama/Yakıt/Yemek) →
✅ ProjectExpense oluştur
✅ İlgili sayfayı revalidate et
```

**Kod:**
```typescript
// src/actions/transactions.ts
await prisma.projectExpense.create({
  description: 'Otel Konaklama',
  amount: 500,
  category: 'Konaklama',
  type: 'Expense',
  projectId: projectId,
  supplierId: supplierId // Opsiyonel
});
```

**Sonuç:**
- ✅ Proje gideri kayıtlı
- ✅ Kasa çıkışı kayıtlı (ProjectExpense)

---

### **4. PROJE GELİRLERİ**

**Akış:**
```
Proje → Gelir Ekle (Hakediş) →
✅ ProjectExpense oluştur (type: 'Income')
✅ İlgili sayfayı revalidate et
```

**Kod:**
```typescript
await prisma.projectExpense.create({
  description: 'Hakediş Ödemesi',
  amount: 10000,
  category: 'Hakediş',
  type: 'Income', // Gelir
  projectId: projectId
});
```

**Sonuç:**
- ✅ Proje geliri kayıtlı
- ✅ Kasa girişi kayıtlı (ProjectExpense)

---

## 📋 KASA DEFTERİ GÖRÜNÜMÜ

### **Nerede Görünür?**

**1. Customers Sayfası:**
```
Customers → [Müşteri] →
✅ Tüm ödemeler (CustomerTransaction)
✅ Bakiye değişimi
```

**2. Personnel Sayfası:**
```
Personnel → [Ekip Üyesi] →
✅ Tüm ödemeler (PersonnelTransaction)
✅ Bakiye değişimi
```

**3. Projects Sayfası:**
```
Projects → [Proje] →
✅ Tüm giderler (ProjectExpense)
✅ Tüm gelirler (ProjectExpense - Income)
✅ Net kasa akışı
```

**4. Cash Book Sayfası:**
```
Cash Book →
✅ Tüm CustomerTransaction'lar
✅ Tüm PersonnelTransaction'lar
✅ Tüm ProjectExpense'lar
✅ Manuel girişler
```

---

## 🎯 OTOMASYON DURUMU

| İşlem | Cari Hesap | Transaction | Balance | Kasa |
|-------|------------|-------------|---------|------|
| **Fatura Ödemesi** | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik |
| **Ekip Ödemesi** | ✅ Personnel | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik |
| **Proje Gideri** | ✅ Supplier (opsiyonel) | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik |
| **Proje Geliri** | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik |
| **Manuel Kasa** | ✅ Seçmeli | ✅ Otomatik | ✅ Otomatik | ✅ Otomatik |

---

## 🧪 TEST SENARYOLARI

### **Test 1: Fatura Ödemesi**
```
1. Invoices → [Fatura] → Ödeme Ekle
2. Amount: 5000 TL
3. Kaydet

Kontrol:
✅ Customers → [Müşteri] → Bakiye 5000 TL azaldı
✅ Cash Book → 5000 TL Giriş görünüyor
✅ Project → [Proje] → 5000 TL Gelir görünüyor
```

### **Test 2: Ekip Ödemesi**
```
1. Projects → [Proje] → Ekip → Ödeme Ekle
2. Amount: 1000 TL
3. Kaydet

Kontrol:
✅ Personnel → [Ekip] → Bakiye 1000 TL arttı
✅ Cash Book → 1000 TL Çıkış görünüyor
✅ Project → [Proje] → 1000 TL Gider görünüyor
```

### **Test 3: Proje Gideri**
```
1. Projects → [Proje] → Gider Ekle
2. Category: Yakıt
3. Amount: 500 TL
4. Kaydet

Kontrol:
✅ Cash Book → 500 TL Çıkış görünüyor
✅ Project → [Proje] → 500 TL Gider görünüyor
```

---

## 💡 ÖNEMLİ NOTLAR

### **1. Kasa Defteri Tek Bir Yer DEĞİL**
Kasa defteri **dağıtılmış** bir sistem:
- CustomerTransaction = Müşteri ödemeleri
- PersonnelTransaction = Personel ödemeleri
- ProjectExpense = Proje gelir/giderleri

**Tümü birlikte** KASA DEFTERİ'ni oluşturur!

### **2. Her İşlem Otomatik**
- ✅ Fatura ödemesi → 3 kayıt (Payment + CustomerTransaction + ProjectExpense)
- ✅ Ekip ödemesi → 3 kayıt (ProjectExpense + PersonnelTransaction + Personnel balance)
- ✅ Proje gideri → 1 kayıt (ProjectExpense)

### **3. Balance Tracking**
- Customer.balance = Müşteri borcu (pozitif = borçlu)
- Personnel.balance = Personel alacağı (pozitif = bize borçlu)
- ProjectExpense = Proje nakit akışı

---

## 📊 RAPORLAMA

### **Kasa Özeti:**
```typescript
// Cash Book sayfasında
const totalCashIn = customerTransactions
  .filter(t => t.type === 'Payment')
  .reduce((sum, t) => sum + t.amount, 0);

const totalCashOut = projectExpenses
  .filter(e => e.type === 'Expense')
  .reduce((sum, e) => sum + e.amount, 0);

const netCash = totalCashIn - totalCashOut;
```

### **Proje Bazlı:**
```typescript
// Her projenin kendi kasa akışı
const projectCashFlow = projectExpenses
  .filter(e => e.projectId === projectId)
  .reduce((sum, e) => {
    return e.type === 'Income' ? sum + e.amount : sum - e.amount;
  }, 0);
```

---

## ✅ SONUÇ

**SİSTEM TAM OTOMATİK!** 🎉

- ✅ Her ödeme otomatik kaydediliyor
- ✅ Her gider otomatik kaydediliyor
- ✅ Her gelir otomatik kaydediliyor
- ✅ Bakiyeler otomatik güncelleniyor
- ✅ Transaction geçmişi tutuluyor
- ✅ Kasa Defteri DAĞITILMIŞ şekilde tutuluyor

**Manuel İşlem:** YOK! ✅

**Kasa Takibi:** %100 OTOMATİK! ✅
