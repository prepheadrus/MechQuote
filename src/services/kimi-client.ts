// Kimi (Moonshot AI) Client for Invoice Parsing
// Moonshot AI's Kimi model integration (OpenAI Compatible)

export interface KimiInvoiceData {
    invoiceNumber?: string;
    invoiceDate?: string;
    senderName?: string;
    senderTaxId?: string;
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

export const parseWithKimiClient = async (text: string, apiKey: string): Promise<KimiInvoiceData> => {
    const prompt = `Sen uzman bir fatura analiz yapay zekasısın.
    Aşağıdaki fatura metnini analiz et ve istenen verileri JSON formatında çıkar.
    
    FATURA METNİ:
    ${text}

    İSTENEN ÇIKTI FORMATI (JSON):
    {
        "invoiceNumber": "Fatura Numarası",
        "invoiceDate": "YYYY-MM-DD",
        "senderTaxId": "Vergi Kimlik No (VKN veya TCKN) - KESİNLİKLE DOLDUR",
        "senderName": "Satıcı Firma Adı",
        "senderAddress": "Satıcı Adresi",
        "receiverName": "Alıcı Firma Adı",
        "totalAmount": 0.00,
        "subTotal": 0.00,
        "totalDiscountAmount": 0.00,
        "totalTaxAmount": 0.00,
        "taxInclusiveTotal": 0.00,
        "items": [
            {
                "name": "Ürün/Hizmet Adı",
                "quantity": 0,
                "unit": "Birim",
                "unitPrice": 0.00,
                "unitListPrice": 0.00,
                "discountRate": 0,
                "discountAmount": 0.00,
                "taxRate": 0,
                "taxAmount": 0.00,
                "totalPrice": 0.00
            }
        ]
    }
    
    KURALLAR:
    1. "senderTaxId" (VKN/TCKN): Faturada "VKN", "Vergi No", "TC Kimlik No" etiketini bul. Yanındaki 10 veya 11 haneli numarayı KESİNLİKLE al. ASLA BOŞ BIRAKMA.
    2. "senderName": Satıcı firma adını tam olarak al.
    3. Sayıları nokta/virgül formatına dikkat ederek sayıya çevir.
    4. Sadece saf JSON döndür. Markdown bloğu kullanma.`;

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-8k',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that extracts data from invoices as JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.1
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Kimi API Error:', errorText);
            throw new Error(`Kimi API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Invalid Kimi API response structure');
        }

        let content = data.choices[0].message.content;

        // Cleanup markdown if present
        content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const parsed = JSON.parse(content);

        console.log('✅ Kimi (Moonshot) parsed successfully');
        return parsed;
    } catch (error: any) {
        console.error('❌ Kimi parsing failed:', error.message);
        throw error;
    }
};
