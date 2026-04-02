# İsimlendirme Standartları (Naming Conventions)

## 📋 Genel Kurallar

### 1. Fonksiyon İsimleri

**CRUD İşlemleri:**
```typescript
// ✅ DOĞRU
getCustomer()      // Tekil isim
getCustomerList()  // Liste için "List" eki
getCustomerStats() // İstatistik için "Stats" eki
createCustomer()
updateCustomer()
deleteCustomer()

// ❌ YANLIŞ
getCustomers()              // Çoğul kullanma
getCustomersWithStats()     // "With" eki gereksiz
getCustomerData()           // "Data" eki gereksiz
removeCustomer()            // "delete" yerine "remove" kullanma
```

---

### 2. Değişken İsimleri

**Tam İsim Kullan:**
```typescript
// ✅ DOĞRU
const customer = ...
const invoice = ...
const proposal = ...

// ❌ YANLIŞ
const cust = ...      // Kısaltma
const inv = ...       // Kısaltma
const prop = ...      // Kısaltma (reserved word çakışması)
```

---

### 3. Entity İsimleri

**Tekil (Singular) Kullan:**
```typescript
// ✅ DOĞRU
Customer
Invoice
Proposal
Project

// ❌ YANLIŞ
Customers
Invoices
Proposals
```

---

### 4. Boolean Değişkenleri

**is/has/can/should Önekleri:**
```typescript
// ✅ DOĞRU
const isActive = true;
const hasPermission = false;
const canEdit = true;
const shouldUpdate = false;

// ❌ YANLIŞ
const active = true;       // is öneki eksik
const permission = false;  // has öneki eksik
```

---

### 5. Sabitler (Constants)

**UPPER_CASE:**
```typescript
// ✅ DOĞRU
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 10;
const API_BASE_URL = 'https://api.example.com';

// ❌ YANLIŞ
const maxRetryCount = 3;  // camelCase değil, UPPER_CASE
```

---

### 6. Interface/Type

**PascalCase:**
```typescript
// ✅ DOĞRU
interface Customer { }
type InvoiceItem = { }

// ❌ YANLIŞ
interface customer { }  // camelCase değil, PascalCase
```

---

## 📊 Özet Tablosu

| Tür | Format | Örnek |
|-----|--------|-------|
| **Fonksiyon** | camelCase | `getCustomerList()` |
| **Değişken** | camelCase | `customerName` |
| **Entity** | PascalCase | `Customer` |
| **Interface** | PascalCase | `CustomerDto` |
| **Boolean** | is/has + camelCase | `isActive` |
| **Constant** | UPPER_CASE | `MAX_SIZE` |
| **Dosya** | kebab-case | `customer-service.ts` |

---

**Oluşturulma:** 21 Şubat 2026 Cumartesi - 00:15  
**Görev:** #15 - İsimlendirme Tutarlılığı
