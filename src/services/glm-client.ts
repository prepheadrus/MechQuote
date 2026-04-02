// GLM-4-Flash Client for Invoice Parsing
// Zhipu AI's GLM-4-Flash model integration

export interface GLMInvoiceData {
    invoiceNumber?: string;
    invoiceDate?: string;
    senderName?: string;
    totalAmount?: number;
    subTotal?: number;
    totalDiscountAmount?: number;
    totalTaxAmount?: number;
    taxInclusiveTotal?: number;
    items?: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        unitListPrice?: number;
        discountRate?: number;
        totalPrice: number;
        unit?: string;
        taxRate?: number;
        taxAmount?: number;
        discountAmount?: number;
    }>;
}

export const parseWithGLMClient = async (text: string, apiKey: string): Promise<GLMInvoiceData> => {
    const prompt = `Sen bir Türk e-Arşiv fatura analiz uzmanısın. Aşağıdaki fatura metnini analiz et ve JSON formatında çıkar.

ÖNEMLİ KURALLAR:
1. Sadece TABLO içindeki ürün/hizmet satırlarını çıkar
2. Firma bilgileri, adresler, notlar HARİÇ
3. Sayıları Türk formatından (1.234,56) ondalık formata (1234.56) çevir
4. Boş satırları ATLAMA

JSON FORMAT:
{
    "invoiceNumber": "fatura numarası",
    "invoiceDate": "YYYY-MM-DD",
    "senderName": "gönderen firma adı",
    "senderTaxId": "gönderen vergi kimlik no (VKN/TCKN) - KESİNLİKLE DOLDUR",
    "totalAmount": toplam tutar,
    "subTotal": ara toplam,
    "totalDiscountAmount": toplam iskonto,
    "totalTaxAmount": toplam kdv,
    "taxInclusiveTotal": kdv dahil toplam,
    "items": [
        {
            "name": "ürün adı",
            "quantity": miktar,
            "unitPrice": birim fiyat,
            "unitListPrice": liste fiyatı,
            "discountRate": iskonto oranı,
            "totalPrice": toplam fiyat,
            "unit": "birim",
            "taxRate": kdv oranı,
            "taxAmount": kdv tutarı,
            "discountAmount": iskonto tutarı
        }
    ]
}

ÖNEMLİ:
- "VKN", "Vergi No", "TCKN" etiketlerinin yanındaki numarayı 'senderTaxId' alanına yaz.
- Eğer bulamazsan boş string ("") bırak ama mutlaka ara.

FATURA METNİ:
${text}

SADECE JSON DÖNDÜR, başka açıklama YAPMA.`;

    try {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1,
                top_p: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('GLM API Error:', errorText);
            throw new Error(`GLM API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid GLM API response structure');
        }

        const content = data.choices[0].message.content;

        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : content;

        const parsed = JSON.parse(jsonText.trim());

        console.log('✅ GLM-4-Flash parsed successfully');
        return parsed;
    } catch (error: any) {
        console.error('❌ GLM-4-Flash parsing failed:', error.message);
        throw error;
    }
};
