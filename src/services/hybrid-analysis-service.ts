'use server';

import { calculateFileHash, getCachedAIResult, cacheAIResult } from './ai-cache-service';

/**
 * Hibrit Analiz Motoru
 * 1. Cache kontrol et (aynı fatura daha önce işlenmiş mi?)
 * 2. Local parser dene (ücretsiz, limitsiz)
 * 3. Güven skoru hesapla
 * 4. <%80 güven ise AI'a gönder
 */

interface HybridAnalysisResult {
  success: boolean;
  data?: any;
  method: 'cache' | 'local' | 'ai';
  confidence: number;
  provider?: string;
  error?: string;
}

interface LocalParseResult {
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  invoiceNumber?: string;
  totalAmount?: number;
  taxAmount?: number;
}

/**
 * Güven skoru hesapla (0-1 arası)
 * - Tüm alanlar dolu mu?
 * - Matematik tutarlı mı? (quantity * unitPrice = totalPrice)
 * - Geçerli vergi oranları var mı?
 */
function calculateConfidenceScore(data: LocalParseResult): number {
  let score = 0;
  let maxScore = 0;

  // Temel alanlar (40 puan)
  maxScore += 40;
  if (data.invoiceNumber) score += 10;
  if (data.totalAmount && data.totalAmount > 0) score += 15;
  if (data.items && data.items.length > 0) score += 15;

  // Matematik tutarlılığı (40 puan)
  maxScore += 40;
  if (data.items && data.items.length > 0) {
    let mathCorrect = 0;
    data.items.forEach((item) => {
      const expected = item.quantity * item.unitPrice;
      const actual = item.totalPrice;
      // %5 tolerans
      if (Math.abs(expected - actual) / actual < 0.05) {
        mathCorrect++;
      }
    });
    score += (mathCorrect / data.items.length) * 40;
  }

  // Ekstra alanlar (20 puan)
  maxScore += 20;
  if (data.taxAmount && data.taxAmount > 0) score += 10;
  if (data.items.some((i) => i.unitPrice > 0)) score += 10;

  return score / maxScore;
}

/**
 * HIBRIT ANALIZ
 * Önce cache, sonra local, gerekirse AI
 */
export async function analyzeWithHybridEngine(
  fileBuffer: ArrayBuffer,
  fileName: string,
  localParserFn: () => Promise<LocalParseResult>,
  aiParserFn?: () => Promise<any>
): Promise<HybridAnalysisResult> {
  try {
    // 1. FILE HASH HESAPLA
    const fileHash = await calculateFileHash(fileBuffer);
    console.log(`[Hybrid Engine] 📄 File hash: ${fileHash.substring(0, 16)}...`);

    // 2. CACHE KONTROL (30 gün TTL)
    const cached = await getCachedAIResult(fileHash, 'invoice');
    if (cached && cached.success) {
      console.log(`[Hybrid Engine] ✅ Cache HIT (${fileHash.substring(0, 16)}...)`);
      return {
        success: true,
        data: cached.data,
        method: 'cache',
        confidence: 1.0,
        provider: cached.provider,
      };
    }
    console.log('[Hybrid Engine] ⚠️ Cache MISS - fresh AI analysis');

    // 3. LOCAL PARSER DENE
    console.log('[Hybrid Engine] 🔍 Trying local parser...');
    let localResult: LocalParseResult | null = null;
    let localConfidence = 0;

    try {
      localResult = await localParserFn();
      localConfidence = calculateConfidenceScore(localResult);
      console.log(`[Hybrid Engine] Local parser confidence: ${(localConfidence * 100).toFixed(1)}%`);
    } catch (error: any) {
      console.warn('[Hybrid Engine] Local parser failed:', error.message);
    }

    // 4. GÜVEN SKORU KONTROLU (>%80 ise local kullan)
    if (localResult && localConfidence >= 0.80) {
      console.log(`[Hybrid Engine] ✅ Local parser sufficient (${(localConfidence * 100).toFixed(1)}% confidence)`);
      
      // Cache'e kaydet (AI kullanmadık ama yine de cache'le)
      await cacheAIResult(
        fileHash,
        'invoice',
        localResult,
        'local-parser',
        undefined,
        localConfidence
      );

      return {
        success: true,
        data: localResult,
        method: 'local',
        confidence: localConfidence,
        provider: 'local',
      };
    }

    // 5. AI PARSER (Eğer varsa ve güven <%80)
    if (!aiParserFn) {
      return {
        success: false,
        error: `Local parser yetersiz (${(localConfidence * 100).toFixed(1)}% confidence). AI parser tanımlanmamış.`,
        method: 'local',
        confidence: localConfidence,
      };
    }

    console.log(`[Hybrid Engine] 🤖 Local parser yetersiz (${(localConfidence * 100).toFixed(1)}%), AI'a gönderiliyor...`);

    try {
      const aiResult = await aiParserFn();
      
      // AI sonucunu cache'le
      await cacheAIResult(
        fileHash,
        'invoice',
        aiResult,
        'ai',
        undefined,
        1.0
      );

      console.log('[Hybrid Engine] ✅ AI analysis successful, cached for 30 days');

      return {
        success: true,
        data: aiResult,
        method: 'ai',
        confidence: 1.0,
        provider: 'ai',
      };
    } catch (aiError: any) {
      console.error('[Hybrid Engine] ❌ AI parser failed:', aiError.message);
      
      // AI da başarısız, local sonucu döndür (düşük güvenle)
      if (localResult) {
        return {
          success: true,
          data: localResult,
          method: 'local',
          confidence: localConfidence,
          provider: 'local',
        };
      }

      return {
        success: false,
        error: `Hem local hem AI başarısız. Local: ${(localConfidence * 100).toFixed(1)}%, AI: ${aiError.message}`,
        method: 'local',
        confidence: localConfidence,
      };
    }
  } catch (error: any) {
    console.error('[Hybrid Engine] Critical error:', error.message);
    return {
      success: false,
      error: error.message,
      method: 'local',
      confidence: 0,
    };
  }
}

/**
 * Basit arayüz: Sadece cache + local
 */
export async function analyzeWithCache(
  fileBuffer: ArrayBuffer,
  fileName: string,
  parserFn: () => Promise<any>
): Promise<{ success: boolean; data?: any; fromCache: boolean }> {
  const fileHash = await calculateFileHash(fileBuffer);
  
  // Cache kontrol
  const cached = await getCachedAIResult(fileHash, 'invoice');
  if (cached && cached.success) {
    return { success: true, data: cached.data, fromCache: true };
  }

  // Parse et
  const result = await parserFn();
  
  // Cache'le
  await cacheAIResult(fileHash, 'invoice', result, 'local');

  return { success: true, data: result, fromCache: false };
}
