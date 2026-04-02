'use server';

/**
 * AI Invoice Processing Server Action
 * Client'tan gelen fatura görsellerini AI ile işler
 *
 * Güvenlik:
 * - Tüm API çağrıları server-side yapılır
 * - Client API key'i hiç görmez
 * - Error handling ile güvenli
 */

import { AIProcessResponse } from '@/app/api/ai/process/route';
import { logger } from '@/lib/logger';

export interface ProcessInvoiceParams {
  imageBase64: string;
  provider?: 'gemini' | 'qwen' | 'glm' | 'kimi';
}

/**
 * Fatura görselini AI ile işler
 * @param params - İşleme parametreleri
 * @returns AI'dan çıkarılmış fatura verisi
 */
export async function processInvoiceWithAI(params: ProcessInvoiceParams): Promise<AIProcessResponse> {
  try {
    const { imageBase64, provider = 'gemini' } = params;

    // Validasyon
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return {
        success: false,
        error: 'Geçersiz görüntü verisi'
      };
    }

    // API route'u çağır
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/ai/process`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageBase64, provider }),
    });

    const result: AIProcessResponse = await response.json();

    if (!response.ok) {
      logger.error('[AI Process Action] Hata:', result.error);
      return {
        success: false,
        error: result.error || 'Bilinmeyen hata'
      };
    }

    return result;

  } catch (error: any) {
    logger.error('[AI Process Action] Beklenmeyen hata:', error.message);
    return {
      success: false,
      error: 'Sunucu hatası: ' + error.message
    };
  }
}

/**
 * Basit sağlık kontrolü - API key var mı?
 */
export async function checkAIHealth(): Promise<{ ok: boolean; hasApiKey: boolean }> {
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  return {
    ok: hasApiKey,
    hasApiKey
  };
}
