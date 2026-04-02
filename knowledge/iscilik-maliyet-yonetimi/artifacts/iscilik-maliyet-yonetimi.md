# İşçilik Maliyet Yönetimi (Labor Cost Management)

## Genel Bakış

MechQuote'un işçilik maliyet sistemi, farklı roller için saatlik/birim maliyet tanımlamaları yapar ve reçete hesaplamalarında bu maliyetleri otomatik olarak kullanır. Bu sistem, teklif hazırlama sırasında gerçek işçilik maliyetlerini doğru bir şekilde yansıtmayı sağlar.

**Dosya:** `src/actions/labor-costs.ts` (80+ satır)

---

## Özellikler

- ✅ **Rol Bazlı Maliyet:** Her rol için farklı maliyet tanımlama
- ✅ **Birim Bazlı Hesaplama:** Saatlik, günlük veya proje bazlı maliyet
- ✅ **Reçete Entegrasyonu:** Reçete hesaplamalarında otomatik kullanım
- ✅ **CRUD İşlemleri:** Ekleme, güncelleme, silme
- ✅ **Validasyon:** Zod schema ile tip güvenliği
- ✅ **Kullanım Kontrolü:** Silme işleminde reçete bağımlılığı kontrolü

---

## Teknik Mimari

```
┌─────────────────────────────────────────────────────────────┐
│  labor-costs.ts                                              │
├─────────────────────────────────────────────────────────────┤
│  getLaborCosts()                                             │
│  ├── Tüm işçilik maliyetlerini getir                        │
│  ├── Role göre sırala (A-Z)                                 │
│  └── LaborCost[] döndür                                     │
├─────────────────────────────────────────────────────────────┤
│  saveLaborCost(data)                                         │
│  ├── Zod schema ile validasyon                              │
│  ├── ID varsa UPDATE, yoksa INSERT                          │
│  ├── /recipes sayfasını revalidate et                       │
│  └── Saved LaborCost döndür                                 │
├─────────────────────────────────────────────────────────────┤
│  deleteLaborCost(id)                                         │
│  ├── ID kontrolü                                            │
│  ├── Foreign key kontrolü (P2003 hatası)                    │
│  ├── Silme işlemi                                           │
│  └── /recipes sayfasını revalidate et                       │
└─────────────────────────────────────────────────────────────┘
```

---

## API Referansı

### `getLaborCosts`

Tüm işçilik maliyetlerini getirir.

```typescript
async function getLaborCosts(): Promise<{
  success: boolean;
  data?: LaborCost[];  // Role göre sıralı
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { getLaborCosts } from '@/actions/labor-costs';

const costs = await getLaborCosts();

if (costs.success) {
  console.log(costs.data);
  // [
  //   { id: '1', role: 'Elektrikçi', cost: 150, unit: 'Saat' },
  //   { id: '2', role: 'Boru Ustası', cost: 175, unit: 'Saat' },
  //   { id: '3', role: 'Kaynakçı', cost: 200, unit: 'Saat' }
  // ]
}
```

---

### `saveLaborCost`

İşçilik maliyeti oluşturur veya günceller.

```typescript
async function saveLaborCost(data: {
  id?: string;
  role: string;        // En az 2 karakter
  cost: number;        // 0 veya pozitif
  unit: string;        // Birim (örn: "Saat", "Gün", "Proje")
}): Promise<{
  success: boolean;
  data?: LaborCost;
  error?: string;
  details?: any;  // Validasyon hataları
}>
```

**Kullanım Örneği:**

```typescript
import { saveLaborCost } from '@/actions/labor-costs';

// Yeni maliyet ekle
const result = await saveLaborCost({
  role: 'HVAC Teknisyeni',
  cost: 180,
  unit: 'Saat'
});

// Mevcut maliyeti güncelle
const updateResult = await saveLaborCost({
  id: 'existing-id-123',
  role: 'HVAC Teknisyeni',
  cost: 200,  // Artırıldı
  unit: 'Saat'
});
```

---

### `deleteLaborCost`

İşçilik maliyetini siler.

```typescript
async function deleteLaborCost(id: string): Promise<{
  success: boolean;
  error?: string;
}>
```

**Kullanım Örneği:**

```typescript
import { deleteLaborCost } from '@/actions/labor-costs';

const result = await deleteLaborCost('labor-cost-id');

if (result.success) {
  toast.success('İşçilik maliyeti silindi');
} else {
  toast.error(result.error);
  // "Bu işçilik maliyeti bir veya daha fazla reçetede kullanıldığı için silinemez."
}
```

---

## Veritabanı Şeması

### LaborCost Modeli

```prisma
model LaborCost {
  id        String   @id @default(cuid())
  role      String   @unique  // Rol adı (örn: "Elektrikçi")
  cost      Float           // Maliyet tutarı
  unit      String          // Birim (örn: "Saat", "Gün", "Proje")
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Reçete işçilik kalemleri ile ilişki
  recipeLaborCosts RecipeLaborCost[]
  
  @@index([role])
}
```

### Recipe Labor Cost İlişkisi

```prisma
model RecipeLaborCost {
  id           String   @id @default(cuid())
  recipeId     String
  laborCostId  String
  laborCost    LaborCost @relation(fields: [laborCostId], references: [id])
  
  hours       Float    // Kaç saat/gün
  totalCost   Float    // hours × laborCost.cost
  
  @@index([recipeId])
  @@index([laborCostId])
}
```

---

## Zod Schema

```typescript
const laborCostSchema = z.object({
  id: z.string().optional(),
  role: z.string()
    .min(2, "Rol en az 2 karakter olmalıdır."),
  cost: z.coerce.number()
    .min(0, "Maliyet negatif olamaz."),
  unit: z.string()
    .min(1, "Birim zorunludur."),
});
```

**Validasyon Kuralları:**
- `role`: Minimum 2 karakter
- `cost`: 0 veya pozitif sayı (z.coerce ile string→number dönüşümü)
- `unit`: Boş olamaz

---

## Kullanım Senaryoları

### Senaryo 1: İşçilik Maliyet Tablosu

```typescript
// components/labor-costs/labor-cost-table.tsx
'use client';

import { useState, useEffect } from 'react';
import { getLaborCosts, deleteLaborCost } from '@/actions/labor-costs';
import { LaborCostDialog } from './labor-cost-dialog';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

export function LaborCostTable() {
  const [costs, setCosts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState(null);
  
  const fetchCosts = async () => {
    const result = await getLaborCosts();
    if (result.success) {
      setCosts(result.data);
    }
  };
  
  useEffect(() => {
    fetchCosts();
  }, []);
  
  const handleDelete = async (id: string) => {
    const result = await deleteLaborCost(id);
    if (result.success) {
      toast.success('Silindi');
      fetchCosts();
    } else {
      toast.error(result.error);
    }
  };
  
  const handleEdit = (cost: LaborCost) => {
    setEditingCost(cost);
    setDialogOpen(true);
  };
  
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">İşçilik Maliyetleri</h2>
        <Button onClick={() => {
          setEditingCost(null);
          setDialogOpen(true);
        }}>
          Yeni Maliyet Ekle
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rol</TableHead>
            <TableHead>Birim</TableHead>
            <TableHead>Maliyet</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((cost) => (
            <TableRow key={cost.id}>
              <TableCell className="font-medium">{cost.role}</TableCell>
              <TableCell>{cost.unit}</TableCell>
              <TableCell>{cost.cost.toLocaleString('tr-TR')} TL</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => handleEdit(cost)}>
                  Düzenle
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDelete(cost.id)}
                >
                  Sil
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <LaborCostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCost={editingCost}
        onSuccess={() => {
          fetchCosts();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}
```

---

### Senaryo 2: İşçilik Maliyet Dialog

```typescript
// components/labor-costs/labor-cost-dialog.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { saveLaborCost } from '@/actions/labor-costs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const laborCostSchema = z.object({
  role: z.string().min(2, "Rol en az 2 karakter olmalıdır."),
  cost: z.coerce.number().min(0, "Maliyet negatif olamaz."),
  unit: z.string().min(1, "Birim zorunludur."),
});

type FormData = z.infer<typeof laborCostSchema>;

interface LaborCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingCost?: LaborCost | null;
  onSuccess: () => void;
}

export function LaborCostDialog({
  open,
  onOpenChange,
  editingCost,
  onSuccess,
}: LaborCostDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(laborCostSchema),
    defaultValues: {
      role: editingCost?.role || '',
      cost: editingCost?.cost || 0,
      unit: editingCost?.unit || 'Saat',
    },
  });
  
  const onSubmit = async (data: FormData) => {
    const result = await saveLaborCost({
      ...data,
      id: editingCost?.id,
    });
    
    if (result.success) {
      toast.success(editingCost ? 'Güncellendi' : 'Oluşturuldu');
      onSuccess();
    } else {
      toast.error(result.error || 'Bir hata oluştu');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingCost ? 'İşçilik Maliyeti Düzenle' : 'Yeni İşçilik Maliyeti'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <FormControl>
                    <Input placeholder="örn: Elektrikçi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Birim</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Birim seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Saat">Saat</SelectItem>
                      <SelectItem value="Gün">Gün</SelectItem>
                      <SelectItem value="Proje">Proje</SelectItem>
                      <SelectItem value="m²">m²</SelectItem>
                      <SelectItem value="m">Metre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maliyet (TL)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
              <Button type="submit">
                {editingCost ? 'Güncelle' : 'Kaydet'}
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

### Senaryo 3: Reçete Hesaplama Entegrasyonu

```typescript
// components/recipes/recipe-calculator.tsx
'use client';

import { useState, useEffect } from 'react';
import { getLaborCosts } from '@/actions/labor-costs';

export function RecipeCalculator({ recipe }) {
  const [laborCosts, setLaborCosts] = useState([]);
  const [selectedLabor, setSelectedLabor] = useState([]);
  
  useEffect(() => {
    getLaborCosts().then(result => {
      if (result.success) {
        setLaborCosts(result.data);
      }
    });
  }, []);
  
  const calculateLaborCost = (laborId: string, hours: number) => {
    const laborCost = laborCosts.find(lc => lc.id === laborId);
    if (!laborCost) return 0;
    
    return laborCost.cost * hours;
  };
  
  const totalLaborCost = selectedLabor.reduce((sum, item) => {
    return sum + calculateLaborCost(item.laborId, item.hours);
  }, 0);
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">İşçilik Maliyeti</h3>
      
      {selectedLabor.map((item, index) => (
        <div key={index} className="flex gap-4 mb-2">
          <Select
            value={item.laborId}
            onValueChange={(value) => {
              const newSelected = [...selectedLabor];
              newSelected[index].laborId = value;
              setSelectedLabor(newSelected);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Rol seçin" />
            </SelectTrigger>
            <SelectContent>
              {laborCosts.map((lc) => (
                <SelectItem key={lc.id} value={lc.id}>
                  {lc.role} ({lc.cost} TL/{lc.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            type="number"
            placeholder="Saat"
            value={item.hours}
            onChange={(e) => {
              const newSelected = [...selectedLabor];
              newSelected[index].hours = parseFloat(e.target.value) || 0;
              setSelectedLabor(newSelected);
            }}
            className="w-24"
          />
          
          <span className="font-medium">
            = {calculateLaborCost(item.laborId, item.hours).toLocaleString('tr-TR')} TL
          </span>
        </div>
      ))}
      
      <div className="mt-4 pt-4 border-t">
        <div className="flex justify-between font-bold">
          <span>Toplam İşçilik:</span>
          <span>{totalLaborCost.toLocaleString('tr-TR')} TL</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Sorun Giderme

### Hata: "Bu işçilik maliyeti silinemez"

**Sebep:** İşçilik maliyeti bir veya daha fazla reçetede kullanılıyor (foreign key constraint).

**Çözüm:**
```typescript
// Kullanıcıya alternatif sun:
// 1. Aktif yapma (cost: 0 yap)
// 2. Rol adını değiştir (role: "Elektrikçi (Eski)")

const handleSoftDelete = async (id: string) => {
  await saveLaborCost({
    id,
    role: 'Elektrikçi (Eski)',
    cost: 0,
    unit: 'Saat'
  });
  toast.success('İşçilik maliyeti pasifleştirildi');
};
```

---

### Hata: "Maliyet negatif olamaz"

**Sebep:** Kullanıcı negatif değer girdi.

**Çözüm:**
```typescript
// Zod schema zaten validasyon yapıyor
// UI'da Input type="number" min="0" ekle
<Input 
  type="number" 
  min="0" 
  step="0.01" 
  {...field} 
/>
```

---

### Hata: "Rol zaten mevcut"

**Sebep:** `role` alanı `@unique` constraint'e sahip.

**Çözüm:**
```typescript
// Save işleminden önce kontrol et
const existingRole = await prisma.laborCost.findUnique({
  where: { role: data.role }
});

if (existingRole && existingRole.id !== data.id) {
  return {
    success: false,
    error: `"${data.role}" rolü zaten mevcut. Lütfen farklı bir rol adı girin.`
  };
}
```

---

## UI Örnekleri

### İşçilik Maliyet Kartı

```typescript
// components/labor-costs/labor-cost-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LaborCostCard({ laborCost }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {laborCost.role}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {laborCost.cost.toLocaleString('tr-TR')} TL
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          / {laborCost.unit}
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## İlgili Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `src/actions/labor-costs.ts` | Ana server actions |
| `src/app/recipes/page.tsx` | Reçete listesi (entegrasyon) |
| `prisma/schema.prisma` | LaborCost modeli |
| `components/labor-costs/` | UI component'leri |

---

## Gelecek Geliştirmeler

- [ ] **Bölgesel Maliyet:** Şehirlere göre farklı işçilik maliyetleri
- [ ] **Zaman Bazlı Maliyet:** Mesai saatleri, gece/zorlu çalışma ek ücretleri
- [ ] **Sendika Ücretleri:** Toplu iş sözleşmesi bazlı otomatik güncelleme
- [ ] **SGK Maliyetleri:** İşveren SGK primlerini dahil etme
- [ ] **Yol/Yemek:** Yan hakları maliyete dahil etme
- [ ] **Performans Bazlı:** Usta/çırak seviyelerine göre farklı maliyetler

---

## Notlar

- **Revalidasyon:** Değişiklik sonrası `/recipes` sayfası otomatik yenilenir
- **Validasyon:** Zod schema ile tip güvenliği sağlanır
- **Foreign Key:** Silme işleminde reçete bağımlılığı kontrol edilir
- **Birim Tipleri:** Saat, Gün, Proje, m², Metre gibi farklı birimler desteklenir

---

**Son Güncelleme:** 25 Şubat 2026  
**Yazar:** MechQuote AI Assistant  
**Durum:** ✅ Tamamlandı ve Dokümante Edildi
