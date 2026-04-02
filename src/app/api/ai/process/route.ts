/**
 * AI Invoice Processing API Route
 * Server-side Gemini Vision API çağrıları için güvenli endpoint
 * 
 * Güvenlik:
 * - API key sadece server-side'da kullanılır
 * - Client-side'dan API key erişimi yoktur
 * - Rate limiting ile korunmuştur
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIProcessRequest {
  imageBase64: string;
  provider?: 'gemini' | 'qwen' | 'glm' | 'kimi';
}

export interface AIProcessResponse {
  success: boolean;
  data?: any;
  error?: string;
  provider?: string;
}

// Rate limiting basit implementasyonu (production'da upstash/ratelimit kullan)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(ip);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }); // 1 dakika, 10 istek
    return true;
  }
  
  if (limit.count >= 10) {
    return false;
  }
  
  limit.count++;
  return true;
};

export async function POST(request: NextRequest) {
  // IP adresini al (Next.js 15 compatible)
  const ip = (request as any).ip ??
             request.headers.get('x-forwarded-for')?.split(',')[0] ??
             'unknown';

  // Rate limiting kontrolü
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: 'Rate limit aşıldı. Lütfen bekleyin.' },
      { status: 429 }
    );
  }

  try {
    const body: AIProcessRequest = await request.json();
    const { imageBase64, provider = 'gemini' } = body;

    // Validasyon
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Geçersiz görüntü verisi' },
        { status: 400 }
      );
    }

    // Server-side API key kullanımı
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('[AI Process] API key eksik!');
      return NextResponse.json(
        { success: false, error: 'Sunucu yapılandırma hatası: API key eksik' },
        { status: 500 }
      );
    }

    console.log(`[AI Process] 📸 Processing with ${provider}...`);

    // Gemini Vision API çağrısı
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-001' });

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
    console.log(`[AI Process] 📄 Response received (${text.length} chars)`);

    // JSON'u ayıkla
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                      text.match(/```\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);
    
    const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

    try {
      const parsed = JSON.parse(jsonText.trim());

      // Validasyon
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Geçersiz yanıt: items dizisi eksik');
      }

      // Geçersiz satırları filtrele
      const validItems = parsed.items.filter((item: any) =>
        item.name &&
        item.name.length > 2 &&
        typeof item.quantity === 'number' &&
        typeof item.unitPrice === 'number' &&
        typeof item.totalPrice === 'number' &&
        item.quantity > 0 &&
        item.totalPrice > 0
      );

      console.log(`[AI Process] ✅ ${validItems.length} geçerli satır`);
      parsed.items = validItems;

      return NextResponse.json({
        success: true,
        data: parsed,
        provider: 'gemini'
      });

    } catch (parseError: any) {
      console.error('[AI Process] JSON parse hatası:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI yanıtı işlenemedi: Geçersiz JSON formatı',
          rawResponse: text.substring(0, 500)
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[AI Process] Hata:', error.message);
    
    // Model bulunamadı hatası için fallback önerisi
    if (error.message?.includes('404') || error.message?.includes('model')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI modeli bulunamadı. Lütfen API anahtarını kontrol edin.',
          details: error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'AI işleme hatası: ' + error.message 
      },
      { status: 500 }
    );
  }
}
