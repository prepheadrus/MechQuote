/**
 * AI-Powered Semantic Matching Service
 * Uses LLM APIs for semantic understanding of product names
 * 
 * HYBRID APPROACH:
 * - String matching first (fast, free)
 * - AI fallback for low confidence (slow, but accurate)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface SemanticMatchResult {
    productId: string;
    productName: string;
    confidence: number;
    method: 'string' | 'ai-semantic' | 'string-fallback';
}

interface AIProviderKeys {
    gemini?: string;
    qwen?: string;
    glm?: string;
    kimi?: string;
}

/**
 * Match invoice product name to catalog using AI semantics
 * Falls back to string matching if AI fails or is disabled
 */
export async function aiSemanticMatch(
    invoiceProductName: string,
    catalogProducts: Array<{ id: string; name: string; code?: string | null }>,
    keys: AIProviderKeys,
    options?: {
        threshold?: number;
        maxCandidates?: number;
    }
): Promise<SemanticMatchResult | null> {
    // Check if AI semantic is enabled
    if (process.env.AI_SEMANTIC_ENABLED !== 'true') {
        console.log('[AI Semantic] Disabled via AI_SEMANTIC_ENABLED flag');
        return null;
    }

    // Validate inputs
    if (!invoiceProductName || catalogProducts.length === 0) {
        return null;
    }

    // Check for available API keys
    const availableKey = Object.entries(keys).find(([_, value]) => value)?.[1];
    if (!availableKey) {
        console.log('[AI Semantic] No API keys available');
        return null;
    }

    try {
        // Use Gemini for semantic matching (best Turkish support)
        if (keys.gemini) {
            return await matchWithGemini(
                invoiceProductName,
                catalogProducts,
                keys.gemini,
                options
            );
        }

        // Fallback to other providers
        if (keys.qwen) {
            return await matchWithQwen(
                invoiceProductName,
                catalogProducts,
                keys.qwen,
                options
            );
        }

        return null;
    } catch (error) {
        console.error('[AI Semantic] Error:', error);
        return null; // Graceful fallback
    }
}

/**
 * Match using Gemini API
 */
async function matchWithGemini(
    invoiceName: string,
    products: Array<{ id: string; name: string; code?: string | null }>,
    apiKey: string,
    options?: { threshold?: number; maxCandidates?: number }
): Promise<SemanticMatchResult | null> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare product list for AI (limit to top candidates)
    const maxCandidates = options?.maxCandidates || 50;
    const productsText = products
        .slice(0, maxCandidates)
        .map((p, i) => `[${i + 1}] ${p.name}${p.code ? ` (Kod: ${p.code})` : ''}`)
        .join('\n');

    const prompt = `
Sen profesyonel bir ürün eşleştirme uzmanısın.

GÖREV:
Fatura ürününü katalogdaki ürünlerle anlamsal olarak eşleştir.

FATURA ÜRÜNÜ:
"${invoiceName}"

KATALOG ÜRÜNLERİ:
${productsText}

KURALLAR:
1. Eş anlamlı kelimeleri anla (Çelik = Metal, PRC = Pirinç)
2. Ebat/ölçü farklılıklarına dikkat et (28'lik ≠ 32'lik)
3. Marka farklıysa eşleştirme (GMV ≠ Gree)
4. Sadece yüksek güven skorlu eşleşmeleri kabul et (>0.7)

ÇIKTI FORMATI (SADECE JSON):
{
    "matchIndex": 1,  // Katalogdaki sıra numarası (1-based), eşleşme yoksa 0
    "confidence": 0.95,  // 0-1 arası güven skoru
    "reason": "Aynı ürün, sadece marka kısaltması farklı"  // Kısa açıklama
}

ÖNEMLİ: Sadece JSON döndür, başka açıklama yapma.
`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('[Gemini] Invalid response format');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        if (parsed.matchIndex === 0 || !parsed.matchIndex) {
            console.log('[Gemini] No match found');
            return null;
        }

        const confidence = parsed.confidence || 0.5;
        const threshold = options?.threshold || 0.7;

        if (confidence < threshold) {
            console.log(`[Gemini] Confidence ${confidence} below threshold ${threshold}`);
            return null;
        }

        const matchedProduct = products[parsed.matchIndex - 1];

        console.log(`[Gemini] Match found: ${matchedProduct.name} (${confidence})`);

        return {
            productId: matchedProduct.id,
            productName: matchedProduct.name,
            confidence: confidence,
            method: 'ai-semantic'
        };
    } catch (error) {
        console.error('[Gemini] Error:', error);
        return null;
    }
}

/**
 * Match using Qwen API (Alibaba)
 */
async function matchWithQwen(
    invoiceName: string,
    products: Array<{ id: string; name: string; code?: string | null }>,
    apiKey: string,
    options?: { threshold?: number; maxCandidates?: number }
): Promise<SemanticMatchResult | null> {
    // Similar implementation to Gemini but using Qwen API
    // Placeholder for future implementation
    console.log('[Qwen] Not yet implemented');
    return null;
}

/**
 * Hybrid matching: String first, AI fallback
 * This is the main entry point for production use
 */
export async function hybridMatch(
    invoiceProductName: string,
    catalogProducts: Array<{ id: string; name: string; code?: string | null }>,
    stringMatchFunction: (name: string) => { item: any; score: number; method: string } | null,
    aiKeys: AIProviderKeys,
    options?: {
        stringThreshold?: number;
        aiThreshold?: number;
        maxCandidates?: number;
    }
): Promise<SemanticMatchResult | null> {
    const stringThreshold = options?.stringThreshold || 0.8;
    const aiThreshold = options?.aiThreshold || 0.7;

    // STEP 1: Try string matching first (fast, free)
    const stringMatch = stringMatchFunction(invoiceProductName);

    if (stringMatch && stringMatch.score >= stringThreshold) {
        console.log(`[Hybrid] String match found: ${stringMatch.score} (${stringMatch.method})`);
        return {
            productId: stringMatch.item.id,
            productName: stringMatch.item.name,
            confidence: stringMatch.score,
            method: 'string'
        };
    }

    // STEP 2: Low confidence → Try AI semantic (slow, but accurate)
    console.log(`[Hybrid] String match low (${stringMatch?.score || 0}), trying AI...`);

    // Get top candidates for AI (reduce API cost)
    const maxCandidates = options?.maxCandidates || 50;
    const topCandidates = catalogProducts.slice(0, maxCandidates);

    const aiMatch = await aiSemanticMatch(
        invoiceProductName,
        topCandidates,
        aiKeys,
        { threshold: aiThreshold, maxCandidates }
    );

    if (aiMatch) {
        console.log(`[Hybrid] AI match found: ${aiMatch.confidence}`);
        return aiMatch;
    }

    // STEP 3: No AI match → Return best string match if available
    if (stringMatch && stringMatch.score >= 0.4) {
        console.log(`[Hybrid] Fallback to string match: ${stringMatch.score}`);
        return {
            productId: stringMatch.item.id,
            productName: stringMatch.item.name,
            confidence: stringMatch.score,
            method: 'string-fallback'
        };
    }

    console.log('[Hybrid] No match found');
    return null;
}

/**
 * Batch matching with rate limiting
 * Processes items in batches to avoid API rate limits
 */
export async function batchHybridMatch(
    items: Array<{ id: string; name: string }>,
    catalogProducts: Array<{ id: string; name: string; code?: string | null }>,
    stringMatchFunction: (name: string) => { item: any; score: number; method: string } | null,
    aiKeys: AIProviderKeys,
    options?: {
        batchSize?: number;
        delayBetweenBatches?: number;
    }
): Promise<Array<{ itemId: string; match: SemanticMatchResult | null }>> {
    const batchSize = options?.batchSize || 10;
    const delayBetweenBatches = options?.delayBetweenBatches || 1000;

    const results: Array<{ itemId: string; match: SemanticMatchResult | null }> = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        console.log(`[Batch] Processing batch ${Math.floor(i / batchSize) + 1}`);

        const batchPromises = batch.map(async (item) => {
            const match = await hybridMatch(
                item.name,
                catalogProducts,
                stringMatchFunction,
                aiKeys
            );

            return {
                itemId: item.id,
                match
            };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Rate limiting: Delay between batches
        if (i + batchSize < items.length) {
            console.log(`[Batch] Delaying ${delayBetweenBatches}ms...`);
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
        }
    }

    return results;
}
