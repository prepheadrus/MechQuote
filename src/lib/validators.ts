/**
 * Input Validation Schemas with Zod
 * 
 * Kullanım:
 * import { CreateCustomerSchema } from '@/lib/validators';
 * 
 * const result = CreateCustomerSchema.safeParse(data);
 * if (!result.success) {
 *   return { success: false, error: result.error.errors[0].message };
 * }
 */

import { z } from 'zod';

// ==================== COMMON VALIDATORS ====================

export const TaxIdSchema = z.string()
  .min(10, 'Vergi Kimlik No en az 10 haneli olmalıdır')
  .max(11, 'Vergi Kimlik No en fazla 11 haneli olmalıdır')
  .regex(/^\d+$/, 'Vergi Kimlik No sadece rakam içermelidir');

export const PhoneSchema = z.string()
  .optional()
  .refine(
    (val) => !val || /^(\+90|0)?5\d{9}$/.test(val),
    'Geçersiz telefon numarası (Örn: 05551234567)'
  );

export const EmailSchema = z.string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    'Geçersiz e-posta adresi'
  );

export const AddressSchema = z.any()
  .transform((val) => {
    // null, undefined, veya boş ise null döndür
    if (!val || val === '' || val === '{}' || val === 'null') return null;
    // Object ise JSON string'e çevir
    if (typeof val === 'object') return JSON.stringify(val);
    // String ise olduğu gibi bırak
    return val;
  })
  .pipe(
    z.string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          // Boş veya null ise geçerli
          if (!val || val === '') return true;
          // JSON string ise parse et ve kontrol et
          try {
            const parsed = JSON.parse(val);
            // Eğer bir object ise, en az bir alanı olmalı
            if (typeof parsed === 'object' && parsed !== null) {
              const hasAnyField = Object.values(parsed as any).some(v => v && String(v).trim() !== '');
              return hasAnyField;
            }
            // String ise minimum 5 karakter
            return val.length >= 5;
          } catch {
            // Parse edilemezse string olarak kontrol et
            return val.length >= 5;
          }
        },
        'Geçersiz adres formatı'
      )
  );

// ==================== CUSTOMER ====================

export const TagsSchema = z.any()
  .transform((val) => {
    // null, undefined, veya boş array ise null döndür
    if (!val || (Array.isArray(val) && val.length === 0)) return null;
    // Array ise JSON string'e çevir
    if (Array.isArray(val)) return JSON.stringify(val);
    // String ise olduğu gibi bırak
    return val;
  })
  .pipe(
    z.string()
      .optional()
      .nullable()
      .refine(
        (val) => {
          if (!val || val === '' || val === '[]') return true;
          try {
            const parsed = JSON.parse(val);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            // JSON değilse string olarak kabul et (comma separated)
            return true;
          }
        },
        'Geçersiz etiket formatı'
      )
  );

export const CreateCustomerSchema = z.object({
  name: z.string()
    .min(2, 'Firma adı en az 2 karakter olmalıdır')
    .max(200, 'Firma adı en fazla 200 karakter olmalıdır'),
  taxId: TaxIdSchema.optional(),
  taxOffice: z.string()
    .max(100)
    .optional()
    .nullable(),
  address: AddressSchema.optional().nullable(),
  phone: PhoneSchema,
  email: EmailSchema,
  tags: TagsSchema.optional().nullable(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

// ==================== INVOICE ====================

export const InvoiceItemSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  quantity: z.number().positive('Miktar pozitif olmalıdır'),
  unitPrice: z.number().positive('Birim fiyat pozitif olmalıdır'),
  unit: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
});

export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
  invoiceNumber: z.string()
    .max(50)
    .optional()
    .nullable(),
  invoiceDate: z.union([z.string(), z.date()]).optional().nullable(),
  senderName: z.string().min(2, 'Gönderen adı en az 2 karakter olmalıdır'),
  taxId: TaxIdSchema.optional(),
  address: AddressSchema.optional(),
  phone: PhoneSchema,
  email: EmailSchema,
  items: z.array(InvoiceItemSchema).min(1, 'En az bir ürün satırı eklenmelidir'),
  totalAmount: z.number().positive('Toplam tutar pozitif olmalıdır'),
  pdfFileBlob: z.string().optional().nullable(),
});

export const UpdateInvoiceSchema = CreateInvoiceSchema.partial();

// ==================== PRODUCT ====================

export const CreateProductSchema = z.object({
  name: z.string()
    .min(2, 'Ürün adı en az 2 karakter olmalıdır')
    .max(200, 'Ürün adı en fazla 200 karakter olmalıdır'),
  code: z.string()
    .max(50)
    .optional()
    .nullable(),
  unitPrice: z.number().positive('Birim fiyat pozitif olmalıdır'),
  unit: z.string().optional().nullable(),
  taxRate: z.number().min(0).max(100).optional(),
  priceIncludesVat: z.boolean().optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

// ==================== PROPOSAL ====================

export const ProposalItemSchema = z.object({
  name: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır'),
  quantity: z.number().positive('Miktar pozitif olmalıdır'),
  unitPrice: z.number().positive('Birim fiyat pozitif olmalıdır'),
  unit: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  discountRate: z.number().min(0).max(100).optional(),
});

export const CreateProposalSchema = z.object({
  customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
  customerName: z.string().min(2, 'Müşteri adı en az 2 karakter olmalıdır'),
  items: z.array(ProposalItemSchema).min(1, 'En az bir ürün satırı eklenmelidir'),
  totalAmount: z.number().positive('Toplam tutar pozitif olmalıdır'),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

export const UpdateProposalSchema = CreateProposalSchema.partial();

// ==================== PROJECT ====================

export const CreateProjectSchema = z.object({
  customerId: z.string().min(1, 'Müşteri seçimi zorunludur'),
  name: z.string()
    .min(2, 'Proje adı en az 2 karakter olmalıdır')
    .max(200, 'Proje adı en fazla 200 karakter olmalıdır'),
  contractAmount: z.number().positive('Sözleşme tutarı pozitif olmalıdır'),
  startDate: z.string().optional(),
  estimatedEndDate: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate data with schema
 * @param schema - Zod schema
 * @param data - Data to validate
 * @returns { success: boolean, data?: T, error?: string }
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errorMessage = result.error.errors[0]?.message || 'Doğrulama hatası';
    return { success: false, error: errorMessage };
  }
  
  return { success: true, data: result.data };
}

// Export type inference helpers
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type CreateProposalInput = z.infer<typeof CreateProposalSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ==================== FORM VALIDATION SCHEMAS ====================

/**
 * Transaction Form Schema
 * Used in: TransactionDialog
 */
export const TransactionFormSchema = z.object({
    amount: z.coerce.number().min(0.01, 'Tutar 0\'dan büyük olmalıdır.'),
    type: z.enum(['Payment', 'Debt', 'Credit', 'Opening']),
    description: z.string().optional(),
    date: z.string(),
});

export type TransactionFormValues = z.infer<typeof TransactionFormSchema>;

/**
 * New Quote Form Schema
 * Used in: QuotesClientPage
 */
export const NewQuoteFormSchema = z.object({
    customerId: z.string().min(1, 'Cari hesap seçimi zorunludur.'),
    projectName: z.string().min(2, 'Proje adı en az 2 karakter olmalıdır.'),
    projectId: z.string().optional(),
    templateId: z.string().optional(),
});

export type NewQuoteFormValues = z.infer<typeof NewQuoteFormSchema>;

/**
 * Personnel Form Schema
 * Used in: PersonnelClientPage
 */
export const PersonnelFormSchema = z.object({
    name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.'),
    role: z.string().optional(),
    phone: PhoneSchema,
    email: EmailSchema,
    salary: z.coerce.number().min(0).optional(),
    status: z.string().optional(),
});

export type PersonnelFormValues = z.infer<typeof PersonnelFormSchema>;

/**
 * Recipe Item Schema
 * Used in: RecipesClientPage
 */
export const RecipeItemSchema = z.object({
    productId: z.string().min(1, 'Ürün seçimi zorunludur.'),
    quantity: z.coerce.number().min(0.01, 'Miktar 0 olamaz.'),
    unit: z.string(),
});

export type RecipeItemValues = z.infer<typeof RecipeItemSchema>;

/**
 * Recipe Form Schema
 * Used in: RecipesClientPage
 */
export const RecipeFormSchema = z.object({
    name: z.string().min(2, 'Reçete adı en az 2 karakter olmalıdır.'),
    items: z.array(RecipeItemSchema).min(1, 'En az bir ürün eklenmelidir.'),
});

export type RecipeFormValues = z.infer<typeof RecipeFormSchema>;

/**
 * Labor Cost Form Schema
 * Used in: RecipesClientPage
 */
export const LaborCostFormSchema = z.object({
    laborType: z.string().min(1, 'İşçilik tipi zorunludur.'),
    cost: z.coerce.number().min(0, 'Maliyet 0 olamaz.'),
    unit: z.string().optional(),
});

export type LaborCostFormValues = z.infer<typeof LaborCostFormSchema>;

/**
 * Bank Account Schema
 * Used in: Settings pages
 */
export const BankAccountSchema = z.object({
    bankName: z.string().min(1, 'Banka adı zorunludur.'),
    branchName: z.string().optional(),
    accountNumber: z.string().optional(),
    iban: z.string().min(1, 'IBAN zorunludur.'),
});

export type BankAccountValues = z.infer<typeof BankAccountSchema>;

/**
 * Company Profile Schema
 * Used in: Settings pages
 */
export const CompanyProfileSchema = z.object({
    companyName: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır.'),
    companyTitle: z.string().optional(),
    companySlogan: z.string().optional(),
    address: z.string().optional(),
    phone: PhoneSchema,
    email: EmailSchema,
    website: z.string().optional(),
    taxOffice: z.string().optional(),
    taxNumber: z.string().optional(),
    bankAccounts: z.array(BankAccountSchema).optional(),
});

export type CompanyProfileValues = z.infer<typeof CompanyProfileSchema>;

/**
 * Settings Schema
 * Used in: SettingsClientPage
 */
export const SettingsFormSchema = z.object({
    companyName: z.string().min(2, 'Firma adı en az 2 karakter olmalıdır.'),
    companyTitle: z.string().optional(),
    companySlogan: z.string().optional(),
    address: z.string().optional(),
    phone: PhoneSchema,
    email: EmailSchema,
    website: z.string().optional(),
    taxOffice: z.string().optional(),
    taxNumber: z.string().optional(),
    bankAccounts: z.array(BankAccountSchema).optional(),
});

export type SettingsFormValues = z.infer<typeof SettingsFormSchema>;
