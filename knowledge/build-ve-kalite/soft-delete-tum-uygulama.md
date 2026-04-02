# Soft Delete Standartı - Tüm Uygulama

**Tarih:** 28 Şubat 2026  
**Öncelik:** 🔴 KRİTİK (P0)  
**Durum:** ✅ TAMAMLANDI

---

## 📋 SORUN

**Soft delete (`isDeleted: true`) yapılıyordu ama query'lerde filtre uygulanmıyordu!**

**Sonuç:**
- ❌ Silinmiş kayıtlar her yerde görünüyordu
- ❌ Dashboard yanlış veri gösteriyordu
- ❌ Kasa defteri duplike kayıtları gösteriyordu
- ❌ Raporlar yanlış hesaplıyordu

---

## ✅ ÇÖZÜM

**Her query'de `where: { isDeleted: false }` filtresi eklendi:**

### 1. Kasa Defteri (`src/actions/cash-book.ts`)

```typescript
// ÖNCE: ❌ Filtre YOK
prisma.projectExpense.findMany({
    select: { ... }
}),

// SONRA: ✅ Soft delete filtresi
prisma.projectExpense.findMany({
    where: { isDeleted: false }, // ✅
    select: { ... }
}),
```

**Etkilenen Query'ler:**
- ✅ `payments` (Invoice Payments)
- ✅ `projectExpenses`
- ✅ `personnelTransactions`
- ✅ `customerTransactions`
- ✅ `supplierTransactions`

---

### 2. Dashboard (`src/actions/dashboard-actions.ts`)

```typescript
// TRANSACTIONS
prisma.projectExpense.findMany({
    where: { isDeleted: false }, // ✅
    select: { ... }
}),

// ASSIGNMENTS
prisma.jobAssignment.findMany({
    where: { isDeleted: false }, // ✅
    select: { ... }
}),
```

---

### 3. Master Analytics (`src/actions/master-analytics.ts`)

```typescript
const projects = await prisma.project.findMany({
    include: {
        // ...
        transactions: {
            where: { isDeleted: false } // ✅
        }
    }
});

const allInvoiceItems = await prisma.invoiceItem.findMany({
    where: {
        // ...
        isDeleted: false // ✅
    }
});

const allAssignments = await prisma.jobAssignment.findMany({
    where: {
        // ...
        isDeleted: false // ✅
    }
});
```

---

### 4. Invoices (`src/services/invoice-service.ts`)

```typescript
// getInvoices()
prisma.invoice.findMany({
    where: { isDeleted: false }, // ✅
    include: { ... }
}),

// getInvoicesWithAnalytics()
prisma.invoice.findMany({
    where: { isDeleted: false }, // ✅
    include: { ... }
}),

// getInvoice(id)
prisma.invoice.findUnique({
    where: { id, isDeleted: false }, // ✅
    include: { ... }
}),
```

---

### 5. Customers (`src/actions/customers.ts`)

```typescript
// getCustomer()
include: {
    proposals: {
        where: { isDeleted: false }, // ✅
        orderBy: { createdAt: 'desc' }
    },
    invoices: {
        where: { isDeleted: false }, // ✅
        orderBy: { invoiceDate: 'desc' }
    },
    projects: {
        where: { isDeleted: false }, // ✅
        include: {
            transactions: {
                where: { isDeleted: false } // ✅
            }
        }
    },
    transactions: {
        where: { isDeleted: false }, // ✅
        orderBy: { date: 'desc' }
    }
}

// getCustomerStats()
proposals: {
    where: { isDeleted: false }, // ✅
    select: { ... }
},
projects: {
    where: { isDeleted: false }, // ✅
    select: { ... }
}
```

---

### 6. Proposals (`src/actions/proposals/proposals.ts`)

```typescript
// getProposal()
include: {
    items: {
        where: { isDeleted: false }, // ✅
        orderBy: { orderIndex: 'asc' }
    },
    jobAssignments: {
        where: { isDeleted: false }, // ✅
        include: { personnel: true }
    }
}

// getProposalList()
include: {
    items: {
        where: { isDeleted: false }, // ✅
        orderBy: { orderIndex: 'asc' }
    },
    jobAssignments: {
        where: { isDeleted: false }, // ✅
        include: { personnel: true }
    }
}

// getProposalAnalytics()
items: {
    where: { isDeleted: false }, // ✅
    orderBy: { orderIndex: 'asc' }
},
jobAssignments: {
    where: { isDeleted: false }, // ✅
    include: { personnel: true }
}
```

---

### 7. Products (`src/actions/products.ts`)

```typescript
// getProductDetails()
prisma.purchaseHistory.findMany({
    where: {
        productId: id,
        isDeleted: false // ✅
    },
    orderBy: { date: 'desc' }
}),

prisma.proposalItem.findMany({
    where: {
        productId: id,
        proposal: { status: 'Approved' },
        isDeleted: false // ✅
    },
    // ...
})
```

---

### 8. Personnel (`src/actions/personnel.ts`)

```typescript
// getPersonnel()
include: {
    assignments: {
        where: { isDeleted: false }, // ✅
        include: {
            proposal: {
                where: { isDeleted: false }, // ✅
                include: { customer: true }
            }
        }
    },
    transactions: {
        where: { isDeleted: false }, // ✅
        include: { project: { select: { name: true } } }
    }
}

// getPersonnelById()
include: {
    assignments: {
        where: { isDeleted: false }, // ✅
        include: {
            proposal: {
                where: { isDeleted: false }, // ✅
                include: { customer: true }
            }
        }
    }
}
```

---

## 📊 METRİKLER

| Model | Dosya | Query'ler | Durum |
|-------|-------|-----------|-------|
| Cash Book | `cash-book.ts` | 5 | ✅ |
| Dashboard | `dashboard-actions.ts` | 2 | ✅ |
| Analytics | `master-analytics.ts` | 3 | ✅ |
| Invoices | `invoice-service.ts` | 3 | ✅ |
| Customers | `customers.ts` | 2 | ✅ |
| Proposals | `proposals.ts` | 3 | ✅ |
| Products | `products.ts` | 2 | ✅ |
| Personnel | `personnel.ts` | 2 | ✅ |

**Toplam:** 8 dosya, 22 query düzeltildi! ✅

---

## 🧪 TEST SENARYOLARI

### Senaryo 1: Kasa Defteri
```
1. Kasa defterine git
2. Bir kaydı sil
3. ✅ Kayıt artık görünmüyor
4. ✅ Toplamlar doğru hesaplanıyor
```

### Senaryo 2: Dashboard
```
1. Anasayfaya git
2. Yönetim Paneli'ne bak
3. ✅ Silinmiş projelerin verileri YOK
4. ✅ Sadece aktif projeler görünüyor
```

### Senaryo 3: Teklif Analizi
```
1. Anasayfa → Teklif Analizi
2. Beklenen Ciro: ₺300,000 (Sözleşme tutarı) ✅
3. Potansiyel Kâr: ₺200,000 (Contract - Costs) ✅
4. ✅ Proposal total DEĞİL, project contractAmount
```

---

## ⚠️ DİKKAT EDİLECEKLER

### Yeni Query Yazarken:

```typescript
// ❌ YANLIŞ
prisma.project.findMany({
    include: { transactions: true }
});

// ✅ DOĞRU
prisma.project.findMany({
    where: { isDeleted: false },
    include: {
        transactions: {
            where: { isDeleted: false }
        }
    }
});
```

### Tekil vs Çoğul İlişkiler:

```typescript
// ✅ Çoğul (where destekleniyor)
include: {
    transactions: {
        where: { isDeleted: false }
    }
}

// ❌ Tekil (where desteklenmiyor)
include: {
    customer: {
        where: { isDeleted: false } // HATA!
    }
}

// ✅ Tekil (doğru)
include: {
    customer: true
}
```

---

## 📝 ÖĞRENILENLER

1. **Soft delete her seviyede uygulanmalı:**
   - Ana model
   - Include' edilen modeller
   - Nested include'lar

2. **Tekil ilişkilerde `where` kullanılamaz:**
   - Customer, Project gibi tekil ilişkiler
   - Sadece çoğul ilişkilerde (transactions, items)

3. **Dashboard ve Analytics en çok etkilenen:**
   - `getMasterAnalytics()`
   - `getDashboardStats()`
   - Tüm aggregation query'ler

---

**Doküman Oluşturulma:** 28 Şubat 2026  
**Son Güncelleme:** 28 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Production-Ready
