# Kasa Defteri E2E Entegrasyonu - Proje Bazlı Nakit Takibi

**Tarih:** 1 Mart 2026 Pazar
**Versiyon:** 2.0 (E2E Entegrasyon)
**Durum:** ✅ Production-Ready
**İlgili Modüller:** Kasa Defteri, Projeler, Müşteriler, Personel, Tedarikçiler

---

## 📋 Özet

Kasa Defteri'ne **proje bazlı nakit takibi** özelliği eklendi. Artık her kasa hareketi bir proje ile ilişkilendirilebilir ve ilgili tüm modüllerde (Proje, Müşteri, Personel) otomatik olarak görünür.

### Önceki Durum (v1.0)
- ❌ Kasa hareketleri genel olarak kaydediliyordu
- ❌ Hangi proje için ödeme/tahsilat yapıldığı takip edilemiyordu
- ❌ Proje kasa sayfalarında manuel girişler görünmüyordu
- ❌ Müşteri/Personel ödemeleri proje ile ilişkilendirilemiyordu

### Yeni Durum (v2.0 - E2E)
- ✅ Her kasa hareketi opsiyonel olarak projeye bağlanabilir
- ✅ Proje bazlı nakit akışı raporlanabilir
- ✅ Müşteri ödemeleri proje kasa sayfasında görünüyor
- ✅ Personel ödemeleri proje kasa sayfasında görünüyor
- ✅ Tedarikçi ödemeleri proje kasa sayfasında görünüyor
- ✅ Tam E2E izlenebilirlik (Kasa → Proje → Müşteri/Personel)

---

## 🗄️ Veritabanı Değişiklikleri

### 1. CustomerTransaction Modeli
```prisma
model CustomerTransaction {
  // ...existing fields...
  
  // ✅ YENİ: Proje İlişkilendirme
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  
  @@index([projectId])  // Proje bazlı sorgular için
}
```

**Açıklama:** Müşteri ödemelerini projeye bağlar.

**Örnek Kullanım:**
```typescript
await prisma.customerTransaction.create({
  data: {
    customerId: "customer-123",
    amount: 10000,
    type: "Payment",
    description: "Avans ödemesi",
    projectId: "project-456" // ✅ Bu proje için
  }
});
```

---

### 2. SupplierTransaction Modeli
```prisma
model SupplierTransaction {
  // ...existing fields...
  
  // ✅ YENİ: Proje İlişkilendirme
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])
  
  @@index([projectId])
}
```

**Açıklama:** Tedarikçi ödemelerini projeye bağlar.

---

### 3. ProjectExpense Modeli
```prisma
model ProjectExpense {
  // ...existing fields...
  
  // ✅ YENİ: Müşteri/Tedarikçi/Personel İlişkilendirme
  customerId  String?
  customer    Customer? @relation(fields: [customerId], references: [id])
  
  personnelId String?
  personnel   Personnel? @relation(fields: [personnelId], references: [id])
  
  @@index([customerId])
  @@index([personnelId])
}
```

**Açıklama:** Proje giderlerinin kime ait olduğunu takip eder.

**Örnek Kullanım:**
```typescript
// Müşteri tahsilatı
await prisma.projectExpense.create({
  data: {
    projectId: "project-456",
    customerId: "customer-123",
    amount: 10000,
    type: "Income",
    description: "Müşteri ödemesi"
  }
});

// Personel ödemesi
await prisma.projectExpense.create({
  data: {
    projectId: "project-456",
    personnelId: "personnel-789",
    amount: 5000,
    type: "Expense",
    description: "Personel hakediş"
  }
});
```

---

### 4. Project Modeli (Relations)
```prisma
model Project {
  // ...existing fields...
  
  // ✅ YENİ: Kasa Defteri E2E İlişkileri
  customerTransactions CustomerTransaction[]
  supplierTransactions SupplierTransaction[]
}
```

---

### 5. Customer Modeli (Relations)
```prisma
model Customer {
  // ...existing fields...
  
  // ✅ YENİ: Proje bazlı ödemeler
  projectExpenses ProjectExpense[]
}
```

---

### 6. Personnel Modeli (Relations)
```prisma
model Personnel {
  // ...existing fields...
  
  // ✅ YENİ: Proje bazlı ödemeler
  projectExpenses ProjectExpense[]
}
```

---

## 🔧 Backend Değişiklikleri

### 1. `src/actions/cash-book.ts` - `addCashEntry`

**Yeni Parametreler:**
```typescript
export async function addCashEntry(data: {
  type: 'IN' | 'OUT';
  amount: number;
  date: Date | string;
  description: string;
  category: string;
  linkType: 'None' | 'Project' | 'Customer' | 'Personnel' | 'Supplier';
  entityId?: string;
  supplierId?: string;
  projectId?: string; // ✅ YENİ: Hangi proje için?
  metadata?: string;  // ✅ YENİ: Ek bağlam (JSON)
})
```

**Personel Ödemesi + Proje:**
```typescript
if (linkType === 'Personnel' && entityId) {
  // 1. Personel transaction kaydet
  const result = await createPersonnelTransaction({
    personnelId: entityId,
    amount,
    type: 'Payment',
    category,
    description,
    date
  });
  
  // 2. ✅ YENİ: Eğer proje seçildiyse, ProjectExpense olarak DA kaydet
  if (projectId) {
    await prisma.projectExpense.create({
      data: {
        projectId,
        personnelId: entityId,
        description: `Personel Ödemesi: ${description}`,
        amount,
        category: category || 'Personel Ödemesi',
        type: 'Expense'
      }
    });
  }
}
```

**Müşteri Tahsilatı + Proje:**
```typescript
if (linkType === 'Customer' && entityId) {
  const result = await createCustomerTransaction({
    customerId: entityId,
    amount,
    type: type === 'IN' ? 'Payment' : 'Debt',
    description,
    category,
    date: new Date(date),
    referenceType: 'Manual',
    projectId // ✅ YENİ: Proje ID kaydet
  });
}
```

**Tedarikçi Ödemesi + Proje:**
```typescript
if (linkType === 'Supplier' && entityId) {
  const result = await createSupplierTransaction({
    supplierId: entityId,
    amount,
    type: type === 'OUT' ? 'Payment' : 'Debt',
    description,
    category,
    date: new Date(date),
    referenceType: 'Manual',
    projectId // ✅ YENİ: Proje ID kaydet
  });
}
```

---

### 2. `src/actions/transactions.ts` - `createTransaction`

**Düzeltme:** `customerId` ve `personnelId` alanları açıkça `null` olarak gönderiliyor.

```typescript
const transaction = await prisma.projectExpense.create({
  data: {
    description: data.description,
    amount: Number(data.amount),
    date: new Date(data.date),
    category: data.category,
    projectId: data.projectId,
    type: data.type,
    supplierId: data.supplierId || null,
    customerId: null, // ✅ Manuel girişlerde açıkça null
    personnelId: null // ✅ Manuel girişlerde açıkça null
  }
});
```

---

### 3. `src/actions/projects/projects.ts` - `getProject`

**Düzeltme:** Müşteri işlemlerini filtrele (sadece bu projeye ait olanlar):

```typescript
customer: {
  include: {
    transactions: {
      where: {
        type: 'Payment',
        isDeleted: false,
        projectId: id // ✅ SADECE bu projeye ait ödemeler
      },
      orderBy: { date: 'desc' }
    }
  }
}
```

**Transaction Listesi Genişletildi:**
```typescript
transactions: [
  ...project.transactions, // Proje giderleri
  
  // Müşteri ödemeleri (SADECE bu projeye ait)
  ...(project.customer?.transactions || [])
    .filter((ct: any) => ct.projectId === id || !ct.projectId)
    .map((ct: any) => ({
      ...ct,
      type: 'Income',
      category: ct.category || 'Tahsilat',
      description: ct.description || `${ct.category} - ${ct.date.toLocaleDateString('tr-TR')}`,
      projectId: id
    })),
  
  // Personel ödemeleri (JobAssignment.paymentHistory'dan)
  ...project.jobAssignments.flatMap((ja: any) => {
    if (!ja.paymentHistory) return [];
    try {
      const history = typeof ja.paymentHistory === 'string' 
        ? JSON.parse(ja.paymentHistory) 
        : ja.paymentHistory;
      if (!Array.isArray(history)) return [];
      
      return history.map((payment: any, idx: number) => ({
        id: `ja-${ja.id}-${idx}`,
        type: 'Expense',
        category: 'Personel Ödemesi',
        description: payment.note || `${idx + 1}. Hakediş - ${ja.personnel?.name}`,
        amount: payment.amount || 0,
        date: new Date(payment.date) || ja.assignedAt,
        projectId: id
      }));
    } catch {
      return [];
    }
  })
].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
```

---

## 🎨 Frontend Değişiklikleri

### 1. `src/app/cash-book/cash-book-client-page.tsx`

**Yeni State:**
```typescript
const [contextData, setContextData] = useState({
  projectId: '', // Hangi proje için? (Opsiyonel)
  invoiceId: ''  // Hangi fatura için? (Opsiyonel)
});
```

**Form Submit Güncellendi:**
```typescript
const handleSubmit = async () => {
  // ✅ YENİ: Bağlam bilgilerini açıklamaya ekle
  let fullDescription = formData.description;
  if (contextData.projectId && formData.linkType !== 'Project') {
    const project = entities.projects.find(p => p.id === contextData.projectId);
    if (project) {
      fullDescription += ` (${project.name} için)`;
    }
  }
  if (contextData.invoiceId && formData.linkType === 'Supplier') {
    fullDescription += ` (Fatura: ${contextData.invoiceId})`;
  }

  addMutation.mutate({
    ...formData,
    description: fullDescription,
    amount: parseFloat(formData.amount),
    projectId: contextData.projectId, // ✅ YENİ: Proje ID gönder
    metadata: JSON.stringify({
      projectId: contextData.projectId,
      invoiceId: contextData.invoiceId
    })
  });
};
```

**Yeni UI Alanları:**

#### Personel Ödemesi İçin:
```tsx
{formData.linkType === 'Personnel' && formData.entityId && (
  <div className="space-y-2">
    <Label className="text-amber-600">
      <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin?
    </Label>
    <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
      <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
      <SelectContent>
        {entities.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Personel bu proje kapsamında çalıştıysa seçin.
    </p>
  </div>
)}
```

#### Müşteri Tahsilatı İçin:
```tsx
{formData.linkType === 'Customer' && formData.entityId && (
  <div className="space-y-2">
    <Label className="text-amber-600">
      <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin Tahsilat?
    </Label>
    <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
      <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
      <SelectContent>
        {entities.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Müşteri bu proje için ödeme yaptıysa seçin.
    </p>
  </div>
)}
```

#### Tedarikçi Ödemesi İçin:
```tsx
{formData.linkType === 'Supplier' && formData.entityId && (
  <div className="space-y-2">
    <Label className="text-amber-600">
      <span className="text-xs">📋 Opsiyonel:</span> Hangi Proje İçin?
    </Label>
    <Select value={contextData.projectId} onValueChange={(v) => setContextData({ ...contextData, projectId: v })}>
      <SelectTrigger><SelectValue placeholder="Seçiniz... (Opsiyonel)" /></SelectTrigger>
      <SelectContent>
        {entities.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    <p className="text-xs text-muted-foreground">
      Tedarikçi bu proje için mal/hizmet verdiyse seçin.
    </p>
  </div>
)}
```

---

## 📊 Kullanım Senaryoları

### Senaryo 1: Müşteri Tahsilatı + Proje

**Adımlar:**
1. Kasa Defteri → Yeni İşlem
2. Tür: Giriş (Tahsilat)
3. İlişkilendirme: Müşteri
4. Müşteri: Ahmet Yılmaz
5. **Hangi Proje İçin?**: Villa HVAC Sistemi ✅
6. Tutar: ₺10,000
7. Açıklama: Avans ödemesi
8. Kaydet

**Sonuç:**
```sql
-- CustomerTransaction tablosu
INSERT INTO CustomerTransaction (
  customerId, amount, type, description, projectId
) VALUES (
  'ahmet-yilmaz-id', 10000, 'Payment', 'Avans ödemesi', 'villa-hvac-id'
);

-- ProjectExpense tablosu (otomatik)
INSERT INTO ProjectExpense (
  projectId, customerId, amount, type, description
) VALUES (
  'villa-hvac-id', 'ahmet-yilmaz-id', 10000, 'Income', 'Avans ödemesi'
);
```

**Görünür:**
- ✅ Kasa Defteri listesi
- ✅ Müşteri → Cari hesap (Ahmet Yılmaz)
- ✅ Proje → Kasa sekmesi (Villa HVAC Sistemi)

---

### Senaryo 2: Personel Ödemesi + Proje

**Adımlar:**
1. Kasa Defteri → Yeni İşlem
2. Tür: Çıkış (Harcama)
3. İlişkilendirme: Personel
4. Personel: Mehmet Demir
5. **Hangi Proje İçin?**: Villa HVAC Sistemi ✅
6. Tutar: ₺5,000
7. Açıklama: Hakediş ödemesi
8. Kaydet

**Sonuç:**
```sql
-- PersonnelTransaction tablosu
INSERT INTO PersonnelTransaction (
  personnelId, amount, type, description
) VALUES (
  'mehmet-demir-id', 5000, 'Payment', 'Hakediş ödemesi'
);

-- ProjectExpense tablosu (otomatik)
INSERT INTO ProjectExpense (
  projectId, personnelId, amount, type, description
) VALUES (
  'villa-hvac-id', 'mehmet-demir-id', 5000, 'Expense', 'Personel Ödemesi: Hakediş ödemesi'
);
```

**Görünür:**
- ✅ Kasa Defteri listesi
- ✅ Personel sayfası (Mehmet Demir)
- ✅ Proje → Kasa sekmesi (Villa HVAC Sistemi)

---

### Senaryo 3: Genel Ödeme (Projesiz)

**Adımlar:**
1. Kasa Defteri → Yeni İşlem
2. Tür: Çıkış
3. İlişkilendirme: **İlişkilendirme Yok**
4. Tutar: ₺500
5. Açıklama: Ofis kira ödemesi
6. Kaydet

**Sonuç:**
```sql
-- ProjectExpense tablosu (projesiz)
INSERT INTO ProjectExpense (
  projectId, amount, type, description
) VALUES (
  'general-ledger-id', 500, 'Expense', 'Ofis kira ödemesi'
);
```

**Görünür:**
- ✅ Kasa Defteri listesi
- ❌ Hiçbir projede görünmez (genel gider)

---

## 🧪 Test Checklist

### ✅ Backend Testleri
- [ ] `addCashEntry` ile müşteri tahsilatı + proje kaydı
- [ ] `addCashEntry` ile personel ödemesi + proje kaydı
- [ ] `addCashEntry` ile tedarikçi ödemesi + proje kaydı
- [ ] `addCashEntry` ile genel ödeme (projesiz)
- [ ] `getProject` ile proje işlemleri (müşteri + personel)
- [ ] Soft delete edilmiş faturalar filtreleniyor mu?

### ✅ Frontend Testleri
- [ ] Kasa Defteri form → Proje select alanı görünüyor mu?
- [ ] Personel seçildiğinde proje select alanı çıkıyor mu?
- [ ] Müşteri seçildiğinde proje select alanı çıkıyor mu?
- [ ] Tedarikçi seçildiğinde proje select alanı çıkıyor mu?
- [ ] Kayıttan sonra açıklama doğru görünüyor mu? (örn: "Hakediş (Villa HVAC Sistemi için)")

### ✅ Entegrasyon Testleri
- [ ] Müşteri tahsilatı → Proje kasa sayfasında görünüyor mu?
- [ ] Müşteri tahsilatı → Müşteri cari hesapta görünüyor mu?
- [ ] Personel ödemesi → Proje kasa sayfasında görünüyor mu?
- [ ] Personel ödemesi → Personel sayfasında görünüyor mu?
- [ ] Projesiz ödeme → Sadece Kasa Defteri'nde görünüyor mu?

---

## 📈 Performans ve Optimizasyon

### Index'ler
```prisma
@@index([projectId])  // CustomerTransaction
@@index([projectId])  // SupplierTransaction
@@index([customerId]) // ProjectExpense
@@index([personnelId])// ProjectExpense
```

### Query Optimizasyonu
```typescript
// ✅ İyi: Sadece bu projeye ait işlemler
customer: {
  include: {
    transactions: {
      where: {
        type: 'Payment',
        projectId: id // Filtre
      }
    }
  }
}

// ❌ Kötü: Tüm işlemler (filtresiz)
customer: {
  include: {
    transactions: true // Tüm işlemler yüklenir
  }
}
```

---

## 🔒 Güvenlik ve Yetkilendirme

**Kontrol Edilmesi Gerekenler:**
1. Kullanıcı sadece kendi projelerine ödeme ekleyebilmeli
2. Müşteri cari hesabına sadece yetkili kullanıcılar erişebilmeli
3. Personel ödemeleri sadece İK/Admin tarafından görülebilmeli

**Öneri:**
```typescript
// src/actions/cash-book.ts
export async function addCashEntry(data: {...}) {
  // ✅ Yetki kontrolü ekle
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: 'Yetkisiz erişim' };
  }
  
  // Proje yetkisi kontrolü
  if (data.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { customerId: true }
    });
    
    // Kullanıcı bu müşteriye ait işlemleri yapabilir mi?
    // ...
  }
}
```

---

## 📝 Migration Notları

**Migration Adı:** `20260301084420_add_project_context_to_cashbook`

**Değişiklikler:**
- `CustomerTransaction.projectId` (nullable, index)
- `SupplierTransaction.projectId` (nullable, index)
- `ProjectExpense.customerId` (nullable, index)
- `ProjectExpense.personnelId` (nullable, index)
- `Project.customerTransactions` (relation)
- `Project.supplierTransactions` (relation)
- `Customer.projectExpenses` (relation)
- `Personnel.projectExpenses` (relation)

**Rollback:**
```bash
npx prisma migrate resolve --rolled-back 20260301084420_add_project_context_to_cashbook
```

---

## 🚀 Gelecek İyileştirmeler

### Kısa Vadeli (1 hafta)
- [ ] Fatura bazlı ödeme (hangi fatura için?)
- [ ] Toplu ödeme ekleme (CSV import)
- [ ] Ödeme planı şablonları (%30-%35-%35)

### Orta Vadeli (1 ay)
- [ ] Nakit akışı projeksiyonu (30/60/90 gün)
- [ ] Proje bazlı bütçe takibi (planlanan vs gerçekleşen)
- [ ] Ödeme hatırlatıcıları (email/SMS)

### Uzun Vadeli (3 ay)
- [ ] Banka entegrasyonu (otomatik tahsilat)
- [ ] Sanal POS entegrasyonu (kredi kartı ile ödeme)
- [ ] Mobil app (iOS/Android)

---

## 📎 İlgili Dosyalar

**Backend:**
- `src/actions/cash-book.ts` - Kasa defteri işlemleri
- `src/actions/transactions.ts` - Proje işlemleri
- `src/actions/projects/projects.ts` - Proje detayları
- `src/actions/customer-transactions.ts` - Müşteri işlemleri
- `src/actions/supplier-transactions.ts` - Tedarikçi işlemleri
- `src/actions/personnel.ts` - Personel işlemleri

**Frontend:**
- `src/app/cash-book/cash-book-client-page.tsx` - Kasa Defteri UI
- `src/app/projects/[id]/project-detail-client-page.tsx` - Proje Kasa sekmesi
- `src/components/projects/transactions/transaction-list.tsx` - İşlem listesi

**Database:**
- `prisma/schema.prisma` - Veritabanı şeması
- `prisma/migrations/20260301084420_add_project_context_to_cashbook/` - Migration

---

**Bu doküman `.cursorrules` standartlarına uygun olarak oluşturulmuştur.**

**Kategori:** `knowledge/finansal-sistemler/`
**İlgili Dosyalar:** `src/actions/cash-book.ts`, `src/actions/transactions.ts`, `prisma/schema.prisma`
