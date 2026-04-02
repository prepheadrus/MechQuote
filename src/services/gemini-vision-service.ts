// Gemini Vision Invoice Parser Service
// Uses Google Gemini Vision API to extract invoice data from images

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiInvoiceData {
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        unit?: string;
        taxRate?: number;
    }[];
    invoiceNumber?: string;
    invoiceDate?: string;
    senderName?: string;
    totalAmount?: number;
    taxAmount?: number;
    subTotal?: number;
}

const getGeminiApiKey = (): string => {
    // Try environment variable first, then localStorage
    const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        localStorage.getItem('GEMINI_API_KEY') ||
        localStorage.getItem('geminiApiKey');

    if (!key) {
        throw new Error('Gemini API key not found. Please set NEXT_PUBLIC_GEMINI_API_KEY or add it in settings.');
    }
    return key;
};

export const extractInvoiceWithGemini = async (imageBase64: string): Promise<GeminiInvoiceData> => {
    try {
        const apiKey = getGeminiApiKey();
        const genAI = new GoogleGenerativeAI(apiKey);

        // Try different models in order of preference
        let model;
        try {
            // First try: Gemini Pro Vision (standard vision model)
            model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });
        } catch {
            // Fallback: Gemini 1.5 Pro
            model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
        }

        const prompt = `
Bu Türkiye e-Arşiv fatura görüntüsünü analiz et ve aşağıdaki JSON formatında bilgileri çıkar.

ÖNEMLİ KURALLAR:
1. Sadece TABLO içindeki ürün/hizmet satırlarını çıkar
2. Firma bilgileri, adres, notlar, toplam satırları HARİÇ
3. Her ürün için: tam isim, miktar, birim fiyat, toplam fiyat
4. Sayıları Türk formatından (1.234,56) ondalık formata (1234.56) çevir
5. Boş veya geçersiz satırları ATLAMA
6. Miktar * Birim Fiyat = Toplam Fiyat kontrolü yap

JSON FORMAT (SADECE BU FORMATTA DÖNDÜR):
{
    "items": [
        {
            "name": "ürün tam adı (çok satırlıysa birleştir)",
            "quantity": sayı,
            "unitPrice": sayı (ondalık),
            "totalPrice": sayı (ondalık),
            "unit": "Adet/Kg/Kuruluş/vb",
            "taxRate": 20
        }
    ],
    "invoiceNumber": "fatura numarası (16 karakter)",
    "invoiceDate": "YYYY-MM-DD",
    "senderName": "gönderen firma tam adı",
    "totalAmount": toplam ödenecek tutar,
    "taxAmount": toplam kdv tutarı,
    "subTotal": kdv hariç ara toplam
}

SADECE JSON DÖNDÜR, başka açıklama veya markdown YAPMA.
`;

        console.log('📸 Sending image to Gemini Vision API...');
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64
                }
            }
        ]);

        const text = result.response.text();
        console.log('📄 Gemini Vision response received:', text.substring(0, 200) + '...');

        // Extract JSON from markdown code blocks if present
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;

        try {
            const parsed = JSON.parse(jsonText.trim());

            // Validate response
            if (!parsed.items || !Array.isArray(parsed.items)) {
                console.error('❌ Invalid response: items array missing');
                throw new Error('Invalid response: items array missing');
            }

            console.log(`✅ Parsed ${parsed.items.length} items from Vision API`);

            // Filter out invalid items
            const validItems = parsed.items.filter((item: any) =>
                item.name &&
                item.name.length > 2 &&
                typeof item.quantity === 'number' &&
                typeof item.unitPrice === 'number' &&
                typeof item.totalPrice === 'number' &&
                item.quantity > 0 &&
                item.totalPrice > 0
            );

            console.log(`✅ ${validItems.length} valid items after filtering`);
            parsed.items = validItems;

            return parsed;
        } catch (parseError) {
            console.error('❌ Failed to parse Gemini response:', text);
            console.error('Parse error:', parseError);
            throw new Error('Gemini Vision API returned invalid JSON');
        }
    } catch (error: any) {
        console.error('❌ Gemini Vision API error:', error.message);
        throw error;
    }
};
