# Input Validasyonu (Zod)

## 📋 Genel Bakış

**Amaç:** Kullanıcı girdilerini doğrulamak, güvenlik ve veri bütünlüğü sağlamak.

**Çözüm:** Zod schema validation ile tip güvenli doğrulama.

---

## 📁 Dosyalar

### `src/lib/validators.ts`

**Görev:** Zod validation schemas

**Özellikler:**
- ✅ 7 farklı schema (Customer, Invoice, Product, Proposal, Project)
- ✅ Helper fonksiyonlar
- ✅ Tip güvenli doğrulama

---

## 🔧 Tanımlanan Schemas

### Customer

```typescript
export const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(200),
  taxId: TaxIdSchema.optional(),  // 10-11 haneli rakam
  taxOffice: z.string().max(100).optional().nullable(),
  address: AddressSchema.optional(),
  phone: PhoneSchema,  // TR formatı
  email: EmailSchema,  // Valid email
});
```

### Invoice

```typescript
export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
  invoiceNumber: z.string().max(50).optional().nullable(),
  senderName: z.string().min(2),
  items: z.array(InvoiceItemSchema).min(1, 'En az bir ürün satırı eklenmelidir'),
  totalAmount: z.number().positive('Toplam tutar pozitif olmalıdır'),
});
```

### Product

```typescript
export const CreateProductSchema = z.object({
  name: z.string().min(2).max(200),
  code: z.string().max(50).optional().nullable(),
  unitPrice: z.number().positive('Birim fiyat pozitif olmalıdır'),
  taxRate: z.number().min(0).max(100).optional(),
});
```

---

## 🔒 Validation Kuralları

| Alan | Kural | Mesaj |
|------|-------|-------|
| **Firma adı** | 2-200 karakter | "en az 2 karakter olmalıdır" |
| **Vergi Kimlik** | 10-11 haneli rakam | "sadece rakam içermelidir" |
| **Telefon** | TR formatı | "Geçersiz telefon numarası" |
| **E-posta** | Valid email | "Geçersiz e-posta adresi" |
| **Miktar** | Pozitif sayı | "pozitif olmalıdır" |
| **Fiyat** | Pozitif sayı | "pozitif olmalıdır" |
| **KDV** | 0-100 arası | - |

---

## 📋 Kullanım

### Server Action'da

```typescript
import { CreateCustomerSchema, validateWithSchema } from '@/lib/validators';

export async function createCustomer(data: any) {
  const validation = validateWithSchema(CreateCustomerSchema, data);
  
  if (!validation.success) {
    return { success: false, error: validation.error };
  }
  
  // Valid data: validation.data
  const customer = await prisma.customer.create({
    data: validation.data
  });
  
  return { success: true, data: customer };
}
```

### Hata Yanıtı

```typescript
{
  success: false,
  error: "Firma adı en az 2 karakter olmalıdır"
}
```

---

## 📊 Helper Fonksiyonlar

### `validateWithSchema(schema, data)`

Generic validation helper.

```typescript
function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string }
```

---

## 🧩 YENİ COMPONENT'LERDE VALIDATION

### Component Refactoring Sonrası (25 Şubat 2026)

35 yeni modüler component'te validation kullanımı standartlaştırıldı:

#### 1. Dialog Component'leri

**`customer-dialog.tsx`** (210 satır)
```typescript
import { CreateCustomerSchema } from '@/lib/validators';

function CustomerDialog({ open, onOpenChange, customer }) {
  const form = useForm({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      name: '',
      taxId: '',
      phone: '',
      email: '',
    }
  });

  const onSubmit = async (data) => {
    // Zod validation otomatik çalışır
    const result = await createCustomer(data);
    // ...
  };

  return (
    <Form {...form}>
      <FormField
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Firma Adı</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage /> {/* Zod error message */}
          </FormItem>
        )}
      />
      {/* ... other fields */}
    </Form>
  );
}
```

**`new-quote-dialog.tsx`** (165 satır)
```typescript
import { CreateProposalSchema } from '@/lib/validators';

// Quote oluştururken müşteri seçimi zorunlu
const form = useForm({
  resolver: zodResolver(CreateProposalSchema),
});
```

**`profit-margin-dialog.tsx`** (121 satır)
```typescript
// Kâr marjı validation: 0-100 arası
const marginSchema = z.object({
  margin: z.number().min(0).max(100),
});
```

**`discount-dialog.tsx`** (121 satır)
```typescript
// İskonto validation: 0-100 arası
const discountSchema = z.object({
  discount: z.number().min(0).max(100),
});
```

#### 2. Form Component'leri

**`importer-customer-select.tsx`** (180 satır)
```typescript
// Müşteri seçimi zorunlu
const importerSchema = z.object({
  customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
  items: z.array(z.object({})).min(1, 'En az bir ürün eklenmelidir'),
});
```

**`project-team.tsx`** (130 satır)
```typescript
// Personel atama validation
const assignmentSchema = z.object({
  personnelId: z.string().min(1),
  role: z.string().min(2),
  hourlyRate: z.number().positive(),
});
```

#### 3. Filtre Component'leri

**`quote-filters.tsx`** (140 satır)
```typescript
// Filtre validation (opsiyonel)
const filterSchema = z.object({
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
```

**`customers-filters.tsx`** (140 satır)
```typescript
// Arama validation
const searchSchema = z.object({
  query: z.string().max(200).optional(),
  city: z.string().optional(),
});
```

---

## 📊 VALIDATION ÖZETİ

| Component | Schema | Validation Kuralları |
|-----------|--------|---------------------|
| `customer-dialog` | CreateCustomerSchema | name (2-200), taxId (10-11), phone (TR), email |
| `new-quote-dialog` | CreateProposalSchema | customerId (required), items (min 1) |
| `profit-margin-dialog` | marginSchema | margin (0-100) |
| `discount-dialog` | discountSchema | discount (0-100) |
| `importer-customer-select` | importerSchema | customerId (required), items (min 1) |
| `project-team` | assignmentSchema | personnelId (required), hourlyRate (positive) |
| `quote-filters` | filterSchema | status (enum), dates (optional) |
| `customers-filters` | searchSchema | query (max 200), city (optional) |

---

## ✅ BEST PRACTICES

### 1. Form Validation (Zod + react-hook-form)

```typescript
// ✅ DOĞRU: Schema-based validation
const form = useForm({
  resolver: zodResolver(CreateCustomerSchema),
});

// ❌ YANLIŞ: Manuel validation
if (name.length < 2) {
  setError('Name too short');
}
```

### 2. Error Messages

```typescript
// ✅ DOĞRU: Kullanıcı dostu mesajlar
z.string().min(2, 'en az 2 karakter olmalıdır')

// ❌ YANLIŞ: Teknik mesajlar
z.string().min(2, 'min length 2')
```

### 3. Optional Fields

```typescript
// ✅ DOĞRU: Nullable fields
taxOffice: z.string().optional().nullable()

// ❌ YANLIŞ: Sadece optional
taxOffice: z.string().optional() // null olabilir ama schema kabul etmez
```

---

## 📅 Güncellemeler

| Tarih | Değişiklik |
|-------|------------|
| 25.02.2026 | 35 yeni component'te validation standartları eklendi |
| 20.02.2026 | İlk oluşturma - Görev #5 tamamlandı |

---

**Oluşturulma:** 20 Şubat 2026 Cuma - 22:45
**Güncelleme:** 25 Şubat 2026 Çarşamba - Component Refactoring (A Adımı)
**Görev:** #5 - Input Validasyonu (Zod) ✅
