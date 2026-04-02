# Ödeme İşlemleri (Payment Actions)

## Genel Bakış

MechQuote'un ödeme işlem sistemi, fatura ödemelerini kaydeder ve otomatik olarak cari hesap transaction'ları oluşturur. Müşteri bakiyelerini gerçek zamanlı güncelleyerek doğru borç/alacak takibi sağlar.

**Dosya:** `src/actions/payment-actions.ts` (107 satır)

---

## Özellikler

- ✅ **Fatura Ödemesi:** Tek fatura için ödeme kaydı
- ✅ **Otomatik Cari Transaction:** Ödeme ile birlikte müşteri hesabına işleme
- ✅ **Bakiye Güncelleme:** Müşteri bakiyesini otomatik düşme
- ✅ **Ödeme Yöntemi:** Nakit, banka havalesi, çek vb. destek
- ✅ **Proje Bağlantısı:** Ödemeleri projelere bağlama (opsiyonel)
- ✅ **Not Alanı:** Ödeme detayları için açıklama

---

## API Referansı

### `createPayment`

```typescript
async function createPayment(data: {
  invoiceId: string;           // Fatura ID
  amount: number;              // Ödeme tutarı
  date: Date | string;         // Ödeme tarihi
  description?: string;        // Opsiyonel açıklama
  method?: string;             // Ödeme yöntemi (Bank Transfer, Cash, etc.)
  projectId?: string;          // Opsiyonel proje ID (revalidation için)
}): Promise<{
  success: boolean;
  error?: string;
  data?: Payment;
}>
```

**Kullanım Örneği:**

```typescript
import { createPayment } from '@/actions/payment-actions';

// Tek fatura ödemesi
const result = await createPayment({
  invoiceId: 'invoice-123',
  amount: 15000,
  date: new Date(),
  description: 'Nakit ödeme',
  method: 'Cash'
});

if (result.success) {
  toast.success('Ödeme başarıyla kaydedildi');
  // Müşteri bakiyesi otomatik güncellendi
}
```

---

## İş Akışı

```
┌─────────────────────────────────────────────────────────────┐
│  createPayment(data)                                         │
├─────────────────────────────────────────────────────────────┤
│  1. Faturayı getir (müşteri bilgisi için)                   │
│     └── Invoice + Customer                                  │
├─────────────────────────────────────────────────────────────┤
│  2. Payment kaydı oluştur                                   │
│     └── Payment.create()                                    │
│         - invoiceId                                         │
│         - amount                                            │
│         - date                                              │
│         - method                                            │
│         - note (description)                                │
├─────────────────────────────────────────────────────────────┤
│  3. CustomerTransaction oluştur (otomatik bakiye güncelleme)│
│     └── CustomerTransaction.create()                        │
│         - customerId (faturadan)                            │
│         - amount (pozitif - bakiyeyi düşürür)               │
│         - type: 'Payment'                                   │
│         - category: 'Fatura Ödemesi'                        │
│         - description: "Fatura Ödemesi: {invoiceNumber}"    │
│         - referenceId: payment.id                           │
│         - referenceType: 'Payment'                          │
├─────────────────────────────────────────────────────────────┤
│  4. Sayfaları revalidate et                                 │
│     - /invoices (fatura listesi)                            │
│     - /customers (müşteri bakiyeleri)                       │
│     - /cash-book (kasa defteri)                             │
│     - /projects/{id} (proje detay - opsiyonel)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Muhasebe Mantığı

### Ödeme ve Bakiye İlişkisi

```
Müşteri Bakiyesi Mantığı:
─────────────────────────────────────────────────────────

Pozitif Bakiye (+): Müşteri şirkete borçlu (Alacak)
Negatif Bakiye (-): Şirket müşteriye borçlu (Borç)

Ödeme Yapıldığında:
  → Müşteri borcu azalır
  → Bakiye DÜŞER (payment amount kadar)
  
Örnek:
─────────────────────────────────────────────────────────
Başlangıç:
  Müşteri bakiyesi: +10,000 TL (müşteri borçlu)

Ödeme:
  Tutar: 3,000 TL
  
Sonuç:
  Yeni bakiye: +7,000 TL
  
Muhasebe Kaydı:
  BORÇ:  100 Kasa/Banka          3,000 TL
  ALACAK: 120 Alıcılar (Müşteri) 3,000 TL
─────────────────────────────────────────────────────────

CustomerTransaction Kaydı:
{
  customerId: 'abc123',
  amount: 3000,           // Pozitif
  type: 'Payment',        // Ödeme türü
  category: 'Fatura Ödemesi',
  description: 'Fatura Ödemesi: 2024-001',
  date: new Date(),
  referenceId: 'payment-xyz',
  referenceType: 'Payment'
}

Not: Payment türü transaction'lar müşteri bakiyesini DÜŞÜRÜR
     (çünkü müşteri borcunu ödemiş)
─────────────────────────────────────────────────────────
```

---

## Kullanım Senaryoları

### Senaryo 1: Fatura Detay Ödeme Formu

```typescript
// app/invoices/[id]/payment-form.tsx
'use client';

import { useState } from 'react';
import { createPayment } from '@/actions/payment-actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Tutar pozitif olmalıdır'),
  date: z.string(),
  description: z.string().optional(),
  method: z.enum(['Cash', 'Bank Transfer', 'Check', 'Credit Card']),
});

type FormData = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  customerId: string;
}

export function PaymentForm({
  invoiceId,
  invoiceNumber,
  totalAmount,
}: PaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: totalAmount,
      date: new Date().toISOString().split('T')[0],
      method: 'Bank Transfer',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    
    const result = await createPayment({
      invoiceId,
      amount: data.amount,
      date: data.date,
      description: data.description,
      method: data.method,
    });
    
    if (result.success) {
      toast.success(`${invoiceNumber} için ödeme kaydedildi`);
      setOpen(false);
      form.reset();
    } else {
      toast.error(result.error || 'Ödeme kaydedilemedi');
    }
    
    setLoading(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Ödeme Kaydet</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {invoiceNumber} - Ödeme Kaydet
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tutar</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarih</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ödeme Yöntemi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçiniz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Nakit</SelectItem>
                      <SelectItem value="Bank Transfer">Banka Havalesi</SelectItem>
                      <SelectItem value="Check">Çek</SelectItem>
                      <SelectItem value="Credit Card">Kredi Kartı</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Açıklama (Opsiyonel)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="örn: Nakit ödeme" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Senaryo 2: Toplu Ödeme Kaydı

```typescript
// app/payments/bulk-payment-form.tsx
'use client';

import { useState } from 'react';
import { createPayment } from '@/actions/payment-actions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface BulkPaymentFormProps {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
  }>;
}

export function BulkPaymentForm({ invoices }: BulkPaymentFormProps) {
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleBulkPayment = async () => {
    setLoading(true);
    
    const results = [];
    for (const invoiceId of selectedInvoices) {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (!invoice) continue;
      
      const remainingAmount = invoice.totalAmount - invoice.paidAmount;
      
      const result = await createPayment({
        invoiceId,
        amount: remainingAmount,
        date: new Date(),
        method: 'Bank Transfer',
        description: `Toplu ödeme - ${invoice.invoiceNumber}`,
      });
      
      results.push({ invoiceId, ...result });
    }
    
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.length - successCount;
    
    if (successCount > 0) {
      toast.success(`${successCount} ödeme kaydedildi`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} ödeme başarısız`);
    }
    
    setSelectedInvoices([]);
    setLoading(false);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          {selectedInvoices.length} fatura seçildi
        </p>
        <Button
          onClick={handleBulkPayment}
          disabled={selectedInvoices.length === 0 || loading}
        >
          {loading ? 'İşleniyor...' : `Seçili Ödemeleri Kaydet (${selectedInvoices.length})`}
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedInvoices.length === invoices.length}
                onCheckedChange={(checked) => {
                  setSelectedInvoices(checked ? invoices.map(i => i.id) : []);
                }}
              />
            </TableHead>
            <TableHead>Fatura No</TableHead>
            <TableHead>Müşteri</TableHead>
            <TableHead>Toplam</TableHead>
            <TableHead>Ödenen</TableHead>
            <TableHead>Kalan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const remaining = invoice.totalAmount - invoice.paidAmount;
            const isSelected = selectedInvoices.includes(invoice.id);
            
            return (
              <TableRow key={invoice.id}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      setSelectedInvoices(
                        checked
                          ? [...selectedInvoices, invoice.id]
                          : selectedInvoices.filter(id => id !== invoice.id)
                      );
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customerName}</TableCell>
                <TableCell>{invoice.totalAmount.toLocaleString('tr-TR')} TL</TableCell>
                <TableCell>{invoice.paidAmount.toLocaleString('tr-TR')} TL</TableCell>
                <TableCell className={remaining > 0 ? 'text-red-600' : 'text-green-600'}>
                  {remaining > 0 ? remaining.toLocaleString('tr-TR') : '0'} TL
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

### Senaryo 3: Ödeme Geçmişi ve Durumu

```typescript
// app/invoices/[id]/payment-history.tsx
import { prisma } from '@/lib/prisma';

export async function PaymentHistory({ invoiceId }: { invoiceId: string }) {
  const payments = await prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { date: 'desc' },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          totalAmount: true
        }
      }
    }
  });
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const invoice = payments[0]?.invoice;
  const remaining = invoice ? invoice.totalAmount - totalPaid : 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Ödeme Geçmişi</h3>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Kalan</p>
          <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {remaining.toLocaleString('tr-TR')} TL
          </p>
        </div>
      </div>
      
      {payments.length === 0 ? (
        <p className="text-muted-foreground text-sm">Henüz ödeme kaydı yok</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>Yöntem</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  {new Date(payment.date).toLocaleDateString('tr-TR')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {payment.method === 'Cash' && 'Nakit'}
                    {payment.method === 'Bank Transfer' && 'Banka Havalesi'}
                    {payment.method === 'Check' && 'Çek'}
                    {payment.method === 'Credit Card' && 'Kredi Kartı'}
                  </Badge>
                </TableCell>
                <TableCell>{payment.note || '-'}</TableCell>
                <TableCell className="text-right font-medium">
                  {payment.amount.toLocaleString('tr-TR')} TL
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      
      {/* Özet */}
      <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Toplam</p>
          <p className="text-lg font-bold">{invoice?.totalAmount.toLocaleString('tr-TR')} TL</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Ödenen</p>
          <p className="text-lg font-bold text-green-600">{totalPaid.toLocaleString('tr-TR')} TL</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Kalan</p>
          <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {remaining.toLocaleString('tr-TR')} TL
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

## Veritabanı Şeması

### Payment Modeli

```prisma
model Payment {
  id        String   @id @default(cuid())
  invoiceId String
  invoice   Invoice  @relation(fields: [invoiceId], references: [id])
  
  amount    Float
  date      DateTime
  method    String   // 'Cash', 'Bank Transfer', 'Check', 'Credit Card'
  note      String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([invoiceId])
  @@index([date])
}
```

### CustomerTransaction Modeli (Otomatik Oluşturulan)

```prisma
model CustomerTransaction {
  id           String   @id @default(cuid())
  customerId   String
  customer     Customer @relation(fields: [customerId], references: [id])
  
  amount       Float    // Pozitif (bakiyeyi düşürür)
  type         String   // 'Payment'
  category     String   // 'Fatura Ödemesi'
  description  String?
  date         DateTime
  
  referenceId  String?  // Payment ID
  referenceType String? // 'Payment'
  
  @@index([customerId, date])
  @@index([referenceId, referenceType])
}
```

---

## Sorun Giderme

### Hata: "Fatura bulunamadı"

**Sebep:** Geçersiz `invoiceId`.

**Çözüm:**
```typescript
// Validasyon
const invoice = await prisma.invoice.findUnique({
  where: { id: data.invoiceId },
  include: { customer: true }
});

if (!invoice) {
  throw new Error('Fatura bulunamadı');
}
```

---

### Hata: "Ödeme kaydedilemedi"

**Sebep:** Veritabanı hatası veya unique constraint ihlali.

**Çözüm:**
```typescript
try {
  const payment = await prisma.payment.create({
    data: { ... }
  });
} catch (error: any) {
  console.error('Payment error:', error);
  return {
    success: false,
    error: error.message || 'Ödeme kaydedilemedi'
  };
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/payment-actions.ts` | Ana ödeme fonksiyonları |
| `src/app/invoices/[id]/page.tsx` | Fatura detay (entegrasyon) |
| `src/app/cash-book/page.tsx` | Kasa defteri (transaction görünümü) |
| `prisma/schema.prisma` | Payment, CustomerTransaction modelleri |

---

## Gelecek Geliştirmeler

- [ ] **Kısmi Ödeme:** Birden fazla kısmi ödeme desteği
- [ ] **Dövizli Ödeme:** USD/EUR cinsinden ödeme kaydı
- [ ] **Çapraz Ödeme:** Bir ödeme ile birden fazla fatura kapatma
- [ ] **Otomatik Hatırlatma:** Vadesi yaklaşan faturalar için email/SMS
- [ ] **Banka Entegrasyonu:** Banka API'leri ile otomatik ödeme eşleştirme

---

**Son Güncelleme:** 25 Şubat 2026  
**Durum:** ✅ Dokümante Edildi
