import { z } from 'zod';

/**
 * Fatura Analizi için Zod Şeması
 * AI'nın döndüreceği verinin yapısını kesin olarak belirler.
 */
export const InvoiceSchema = z.object({
    invoiceNumber: z.string().describe("Fatura numarası / Belge No"),
    invoiceDate: z.string().describe("Fatura tarihi (YYYY-MM-DD)"),
    senderName: z.string().describe("Satıcı firma tam ünvanı"),
    senderTaxId: z.string().describe("Satıcı VKN/TCKN (10 veya 11 hane)"),
    senderAddress: z.string().optional().describe("Satıcı adresi"),
    senderPhone: z.string().optional().describe("Satıcı telefon"),
    receiverName: z.string().optional().describe("Alıcı firma adı"),
    taxOffice: z.string().optional().describe("Vergi dairesi"),
    currency: z.string().default("TRY").describe("Para birimi (TRY, USD, EUR)"),
    subTotal: z.number().describe("KDV Hariç Ara Toplam"),
    totalTaxAmount: z.number().describe("Toplam KDV tutarı"),
    taxInclusiveTotal: z.number().describe("Genel toplam tutar (KDV Dahil)"),
    items: z.array(z.object({
        name: z.string().describe("Ürün/Hizmet adı"),
        quantity: z.number().describe("Miktar"),
        unit: z.string().describe("Birim (Adet, mt vb.)"),
        unitPrice: z.number().describe("Birim fiyat (KDV Hariç)"),
        taxRate: z.number().describe("KDV oranı (ör: 20)"),
        taxAmount: z.number().describe("KDV tutarı"),
        totalPrice: z.number().describe("Satır toplamı (KDV Dahil)")
    })).describe("Fatura kalemleri")
});

export type InvoiceAiData = z.infer<typeof InvoiceSchema>;
