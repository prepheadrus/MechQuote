'use server'

import { prisma } from '@/lib/prisma';
import { findBestMatch } from '@/lib/matching-engine';
import { revalidatePath } from 'next/cache';
import { Product } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logCacheStats, matchResultCache, aiTerminologyCache } from '@/lib/matching-cache';
import { hybridMatch } from '@/services/ai-semantic-matching';
import { findBestProductMatch, searchProducts } from '@/services/product-search-service';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AiTerminologyResult {
    original: string;
    suggested: string;
}

interface ExtractedTableItem {
    name: string;
    quantity: number;
    unit: string;
    price: number;
    matchIndex?: number;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Normalizes product names using AI according to mechanical installation terminology.
 * Supports multiple providers with fallback logic.
 */
export async function normalizeProductNamesWithAI(
    names: string[],
    keys: {
        gemini?: string,
        qwen?: string,
        kimi?: string,
        glm?: string,
        deepseek?: string
    },
    modelConfig?: {
        geminiModel?: string
    }
) {
    try {
        logger.info('[AI Terminology] Processing', names.length, 'products...');

        // Resolve Keys
        const geminiKey = keys.gemini || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const qwenKey = keys.qwen;
        const kimiKey = keys.kimi;
        const glmKey = keys.glm;
        const deepseekKey = keys.deepseek;

        if (!geminiKey && !qwenKey && !kimiKey && !glmKey && !deepseekKey) {
            return { success: false, error: 'Hiçbir AI anahtarı bulunamadı. Lütfen ayarlardan bir anahtar ekleyin.' };
        }

        // Higher chunk size for efficiency and stronger context
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < names.length; i += chunkSize) {
            chunks.push(names.slice(i, i + chunkSize));
        }

        const allResults: AiTerminologyResult[] = [];

        for (const chunk of chunks) {
            const prompt = `
Sen 30 yıllık deneyime sahip, teknik şartname hazırlama ve ihale süreçlerinde uzman bir Baş Mekanik Tesisat Mühendisisin. 
Görevin: Sana iletilen ham ve düzensiz ürün isimlerini, Türkiye'deki mekanik tesisat terminolojisine uygun, FİYATLANDIRMAYA ESAS, net teknik isimlere dönüştürmektir. 

### KRİTİK KURALLAR:
1. **ÖZ VE NET OL:** "Kombi" gibi basit kelimeleri "Yoğuşmalı Kombi (24kW)" seviyesinde tut. "Lüks Konut Tipi Duvar Tipi Hermetik..." gibi aşırı uzun nitelemelerden KAÇIN. 
2. **TEKNİK DİL:** "Petek" yerine "Panel Radyatör", "Musluk" yerine "Eviye Bataryası" gibi literatür karşılıklarını kullan. 
3. **FİYATI ETKİLEYEN DETAYLARI KORU (OK ÖNEMLİ):** Ürünün maliyetini değiştiren özellikleri (Çift/Tek Sıra, Motorlu/Manuel, Flanşlı/Dişli, İzolasyonlu/İzolesiz) MUTLAKA YAZ. Bu detaylar "gereksiz" değildir. 
4. **YER VE GÖRSEL TARİFİNİ SİL:** "Koridor tavanı için", "Estetik görünümlü", "Rahat montajlı" gibi fiyatı değiştirmeyen, sadece yer veya pazarlama belirten ifadeleri SİL. 
5. **FORMAT:** Bir ihale keşif listesinde okunabilirliği bozmayacak, profesyonel ve kompakt bir dil kullan. 

**Örnek Dönüşüm:**
Gelen: "Koridor için güzel görünümlü çift sıra kanatlı üfleme menfezi" 
Çıktı: "Çift Sıra Kanatlı Dağıtıcı Menfez (Damperli)"

Sana listeyi veriyorum:
${chunk.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "results": [
    { "original": "orijinal isim", "suggested": "teknik mühendislik ismi" }
  ]
}
`;

            let success = false;
            let lastError = "";

            // --- STRATEGY: Try providers in order of preference (Gemini -> Qwen -> GLM -> Kimi -> DeepSeek) ---

            // 1. Try Gemini
            if (!success && geminiKey) {
                const candidates = [
                    modelConfig?.geminiModel,
                    'gemini-1.5-flash',
                    'gemini-2.0-flash',
                    'gemini-pro'
                ].filter(Boolean) as string[];

                const genAI = new GoogleGenerativeAI(geminiKey);

                for (const modelName of Array.from(new Set(candidates))) {
                    try {
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent(prompt);
                        const text = result.response.text();
                        allResults.push(...parseAiJson(text, chunk));
                        success = true;
                        logger.info('[AI Terminology] Success with Gemini', modelName);
                        break;
                    } catch (e: any) {
                        lastError = `Gemini (${modelName}): ${e.message}`;
                        logger.warn(`[AI Terminology] Gemini ${modelName} failed, trying fallback...`);
                    }
                }
            }

            // 2. Try Qwen (OpenAI Compatible)
            if (!success && qwenKey) {
                try {
                    const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            model: "qwen-plus",
                            messages: [{ role: "user", content: prompt }],
                            temperature: 0.1
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        allResults.push(...parseAiJson(data.choices[0].message.content, chunk));
                        success = true;
                        logger.info('[AI Terminology] Success with Qwen');
                    } else {
                        const err = await response.json();
                        lastError = `Qwen: ${err.error?.message}`;
                    }
                } catch (e: any) { lastError = `Qwen: ${e.message}`; }
            }

            // 3. Try GLM
            if (!success && glmKey) {
                try {
                    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${glmKey}` },
                        body: JSON.stringify({
                            model: 'glm-4-flash',
                            messages: [{ role: 'user', content: prompt }],
                            temperature: 0.1
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        allResults.push(...parseAiJson(data.choices[0].message.content, chunk));
                        success = true;
                        logger.info('[AI Terminology] Success with GLM');
                    } else {
                        const err = await response.text();
                        lastError = `GLM: ${err}`;
                    }
                } catch (e: any) { lastError = `GLM: ${e.message}`; }
            }

            // 4. Try Kimi
            if (!success && kimiKey) {
                try {
                    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kimiKey}` },
                        body: JSON.stringify({
                            model: 'moonshot-v1-8k',
                            messages: [{ role: 'user', content: prompt }],
                            temperature: 0.1
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        allResults.push(...parseAiJson(data.choices[0].message.content, chunk));
                        success = true;
                        logger.info('[AI Terminology] Success with Kimi');
                    } else {
                        const err = await response.text();
                        lastError = `Kimi: ${err}`;
                    }
                } catch (e: any) { lastError = `Kimi: ${e.message}`; }
            }

            // 5. Try DeepSeek
            if (!success && deepseekKey) {
                try {
                    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
                        body: JSON.stringify({
                            model: 'deepseek-chat',
                            messages: [{ role: "user", content: prompt }],
                            temperature: 0.1
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        allResults.push(...parseAiJson(data.choices[0].message.content, chunk));
                        success = true;
                        logger.info('[AI Terminology] Success with DeepSeek');
                    } else {
                        const err = await response.text();
                        lastError = `DeepSeek: ${err}`;
                    }
                } catch (e: any) { lastError = `DeepSeek: ${e.message}`; }
            }

            if (!success) {
                throw new Error(`Tüm AI servisleri başarısız oldu. Son hata: ${lastError}`);
            }
        }

        return { success: true, data: allResults };
    } catch (error: any) {
        logger.error('[normalizeProductNamesWithAI] Critical Error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

/**
 * Helper to parse AI JSON response safely
 */
function parseAiJson(text: string, originalChunk: string[]): AiTerminologyResult[] {
    try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        const parsed = JSON.parse(jsonText.trim());
        return parsed.results || [];
    } catch (e) {
        logger.error("[AI Terminology] JSON Parse Fail, returning original names.");
        return originalChunk.map(n => ({ original: n, suggested: n }));
    }
}

/**
 * Saves a mapping between a supplier's product name and our system product.
 */
export async function saveProductAlias(supplierId: string | null, aliasName: string, productId: string) {
    try {
        if (!aliasName || !productId) return { success: false };

        await prisma.productAlias.upsert({
            where: {
                supplierId_aliasName: {
                    supplierId: (supplierId || null) as any,
                    aliasName: aliasName.trim()
                }
            },
            update: {
                productId: productId
            },
            create: {
                supplierId: supplierId || null,
                aliasName: aliasName.trim(),
                productId: productId
            }
        });

        return { success: true };
    } catch (error) {
        logger.error('[saveProductAlias] Error:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * The Hybrid Matching Engine
 * Now with AI-powered semantic matching!
 */
export async function matchProduct(name: string, supplierId?: string | null) {
    if (!name) return null;
    const normalizedName = name.trim();
    const searchName = normalizedName.toLocaleLowerCase('tr-TR');

    // STEP 1: Check feedback history first (LEARNING!)
    const feedbackMatch = await prisma.feedback.findFirst({
        where: { isDeleted: false,
            invoiceItemName: { equals: normalizedName },
            type: 'approved'
        },
        orderBy: { createdAt: 'desc' },
        include: { product: { where: { isDeleted: false } } }
    });

    if (feedbackMatch && feedbackMatch.product) {
        logger.debug('[matchProduct] Using feedback-based match:', normalizedName, '→', feedbackMatch.product.name);
        return {
            product: feedbackMatch.product,
            method: 'feedback-learning',
            score: 0.95
        };
    }

    // STEP 2: Check for corrected feedback
    const correctedMatch = await prisma.feedback.findFirst({
        where: { isDeleted: false,
            invoiceItemName: { equals: normalizedName },
            type: 'corrected'
        },
        orderBy: { createdAt: 'desc' },
        include: { product: { where: { isDeleted: false } } }
    });

    if (correctedMatch && correctedMatch.product) {
        logger.debug('[matchProduct] Using corrected match:', normalizedName, '→', correctedMatch.product.name);
        return {
            product: correctedMatch.product,
            method: 'feedback-corrected',
            score: 0.90
        };
    }

    // STEP 3: Exact match
    const exactProduct = await prisma.product.findFirst({
        where: { isDeleted: false,
            OR: [
                { name: { equals: normalizedName } },
                { name: { equals: searchName } }
            ]
        }
    });
    if (exactProduct) return { product: exactProduct, method: 'exact' };

    // STEP 4: Check supplier aliases
    if (supplierId) {
        const supplierAlias = await prisma.productAlias.findFirst({
            where: { isDeleted: false,
                supplierId: supplierId,
                aliasName: normalizedName
            },
            include: { product: { } }
        });
        if (supplierAlias) return { product: supplierAlias.product, method: 'memory-supplier' };
    }

    // STEP 5: Check global aliases
    const globalAlias = await prisma.productAlias.findFirst({
        where: { isDeleted: false,  aliasName: { equals: normalizedName } },
        include: { product: { } },
        orderBy: { createdAt: 'desc' }
    });
    if (globalAlias) return { product: globalAlias.product, method: 'memory-global' };

    // STEP 6: String-based fuzzy matching with NEW centralized search service
    const allProducts = await prisma.product.findMany({ where: { isDeleted: false },
        select: { id: true, name: true, code: true, brand: true, model: true, unit: true, description: true }
    });

    // Use new searchProducts service for better matching
    const searchResults = searchProducts(allProducts as unknown as Product[], normalizedName);

    if (searchResults.length > 0 && searchResults[0].score >= 30) { // Lower threshold for more matches
        const product = await prisma.product.findFirst({ where: { isDeleted: false,  id: searchResults[0].product.id } });
        return {
            product,
            method: 'fuzzy-v2',
            score: searchResults[0].score / 100, // Normalize to 0-1
            matchReason: searchResults[0].matchReason
        };
    }

    // STEP 7: AI Semantic Matching (fallback for low string confidence)
    // Only if string matching failed or confidence is low (< 0.3)
    if (searchResults.length === 0 || searchResults[0].score < 30) {
        logger.debug('[matchProduct] String matching low confidence (score:', searchResults[0]?.score || 0, '), trying AI semantics...');

        try {
            // Import findBestMatch from matching-engine
            const aiResult = await hybridMatch(
                normalizedName,
                allProducts,
                (name) => {
                    const match = findBestMatch(name, allProducts, (p) => p.name);
                    return match ? { item: match.item, score: match.score, method: match.method } : null;
                },
                {
                    gemini: process.env.GEMINI_API_KEY,
                    qwen: process.env.QWEN_API_KEY,
                    glm: process.env.GLM_API_KEY,
                    kimi: process.env.KIMI_API_KEY
                },
                { stringThreshold: 0.5, aiThreshold: 0.5 }
            );

            if (aiResult && aiResult.confidence > 0.5) {
                logger.info('[matchProduct] AI semantic match found:', normalizedName, '→', aiResult.productName);
                const product = await prisma.product.findFirst({ where: { isDeleted: false,  id: aiResult.productId } });
                return {
                    product,
                    method: 'ai-semantic',
                    score: aiResult.confidence
                };
            }
        } catch (error) {
            logger.warn('[matchProduct] AI semantic matching failed:', error);
            // Continue to return null (no match)
        }
    }

    return null;
}

/**
 * Suggests cleaned name, code, and category based on raw invoice item name.
 */
export async function suggestProductDetails(rawName: string) {
    if (!rawName) return null;

    let cleanedName = rawName
        .replace(/\b(ADET|KG|PAKET|METRE|TAKIM|LTD|STI|SAN|TIC|A\.S\.)\b/gi, '')
        .replace(/\b(\d{1,2}%|KDV|DV|OTV)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const codePrefix = cleanedName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'PRD');
    const suggestedCode = `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const existingCategories = await prisma.product.findMany({ where: { isDeleted: false },
        select: { category: true },
        distinct: ['category']
    });

    const categories = existingCategories.map(c => c.category).filter(Boolean) as string[];
    const bestCategory = findBestMatch(
        cleanedName,
        categories,
        (c) => c,
        undefined,
        0.5
    );

    return {
        suggestedName: cleanedName,
        suggestedCode: suggestedCode,
        suggestedCategory: bestCategory ? bestCategory.item : null,
        confidence: bestCategory ? bestCategory.score : 0
    };
}

/**
 * Parses a single line of text and matches it to a product.
 */
export async function parseAndMatch(text: string, supplierId?: string | null) {
    if (!text) return null;

    const knownUnits = ['ad', 'adet', 'tane', 'm', 'mt', 'metre', 'kg', 'set', 'tk', 'takım', 'pcs', 'koli', 'paket', 'boy'];
    const unitPattern = knownUnits.join('|');

    let quantity = 1;
    let unit = 'Adet';
    let productName = text.trim();

    const startPattern = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})?\\s+(.*)$`, 'i');
    const endPattern = new RegExp(`^(.*?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})?$`, 'i');

    const startMatch = text.trim().match(startPattern);
    const endMatch = text.trim().match(endPattern);

    if (startMatch) {
        quantity = parseFloat(startMatch[1].replace(',', '.'));
        unit = startMatch[2] || 'Adet';
        productName = startMatch[3].trim();
    } else if (endMatch) {
        const potentialQty = parseFloat(endMatch[2].replace(',', '.'));
        const hasExplicitUnit = !!endMatch[3];

        if (hasExplicitUnit || potentialQty > 0) {
            productName = endMatch[1].trim();
            quantity = potentialQty;
            unit = endMatch[3] || 'Adet';
        }
    }

    const matchResult = await matchProduct(productName, supplierId);

    return {
        parsed: { quantity, unit, productName },
        match: matchResult
    };
}

/**
 * Extracts structured items from raw table text (OCR/Excel Copy) using AI.
 * This is the radical solution for multi-column formats with multi-provider fallback.
 */
export async function extractTableItemsWithAI(
    text: string,
    keys: {
        gemini?: string,
        qwen?: string,
        kimi?: string,
        glm?: string,
        deepseek?: string
    },
    context?: {
        proposalItems?: { id: string, name: string, brand: string, productId: string }[]
    }
) {
    try {
        logger.info(`[AI Table Extraction] Analyzing text (Length: ${text.length})...`);

        const geminiKey = keys.gemini || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const qwenKey = keys.qwen;
        const kimiKey = keys.kimi;
        const glmKey = keys.glm;
        const deepseekKey = keys.deepseek;

        if (!geminiKey && !qwenKey && !kimiKey && !glmKey && !deepseekKey) {
            return { success: false, error: 'Hiçbir AI anahtarı bulunamadı. Lütfen ayarlardan bir anahtar ekleyin.' };
        }

        let contextPrompt = "";
        if (context?.proposalItems && context.proposalItems.length > 0) {
            contextPrompt = `
### ÖNEMLİ: MEVCUT TEKLİF KALEMLERİ (HASSAS EŞLEŞTİRME)
Tedarikçiden gelen kalemleri benim şu anki teklifimdeki ürünlerle eşleştirmelisin. 
DİKKAT: İsimler birbirine çok benzeyebilir, ancak EBATLAR (1MT, 2MT, 50x20 vb.) farklıdır. Kesinlikle doğru ebata sahip olanı seç!

Aşağıdaki listede her ürünün başında bir [SIRA NO] var. Eşleşme bulursan "matchIndex" alanına listedeki sıra numarasını yaz.

Benim Teklifimdeki Kalemler:
${context.proposalItems.map((i: any, idx: number) => `[${idx + 1}] ${i.name} (Miktar: ${i.quantity} ${i.unit})`).join('\n')}
`;
        }

        const prompt = `
Aşağıda bir tedarikçiden gelen ham fiyat teklifi metni yer almaktadır.
Görevin: Bu karmaşık metindeki satırları analiz et ve her bir ürünü miktar, birim ve fiyat bilgileriyle birlikte JSON formatında çıkar.

${contextPrompt}

### ANALİZ VE EŞLEŞTİRME KURALLARI:
1. **İSİM OLUŞTURMA (KRİTİK):** Tedarikçi satırındaki "Malzeme" ve "Ebat/Ölçü" bilgilerini KESİNLİKLE BİRLEŞTİR. Boyut bilgilerini (Örn: 50*20, 1MT, 0.6mm) asla ismin dışına atma.
2. **HASSAS EŞLEŞTİRME:** Tedarikçideki ürünü benim "Benim Teklifimdeki Kalemler" listemle kıyaslarken EBAT ve ÖLÇÜ uyumuna %100 dikkat et. 1MT olan ürünü 2MT ile eşleştirme!
3. **MİKTAR AYIKLAMA:** Metindeki sayıların miktar mı yoksa fiyat mı olduğunu sütun başlıklarına göre saptan.
4. **FORMAT:** Sadece ürün kalemlerini al.

Metin:
"""
${text}
"""

Yanıtını SADECE aşağıdaki JSON formatında ver:
{
  "items": [
    { 
      "name": "Malzeme + Ebat Bilgisi (Örn: Üfleme Menfezi 50*20)", 
      "quantity": 10, 
      "unit": "Adet", 
      "price": 1500.50, 
      "matchIndex": 1 
    }
  ]
}
`;
        // ... (rest of function)

        let success = false;
        let lastError = "";
        let finalItems: ExtractedTableItem[] = [];

        // 1. Try Gemini
        if (!success && geminiKey) {
            const candidates = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
            const genAI = new GoogleGenerativeAI(geminiKey);
            for (const modelName of candidates) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const responseText = result.response.text();
                    finalItems = parseExtractJson(responseText);
                    success = true;
                    logger.info(`[AI Table Extraction] Success with Gemini (${modelName})`);
                    break;
                } catch (e: any) {
                    lastError = `Gemini (${modelName}): ${e.message}`;
                }
            }
        }

        // 2. Try Qwen
        if (!success && qwenKey) {
            try {
                const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${qwenKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "qwen-plus",
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    finalItems = parseExtractJson(data.choices[0].message.content);
                    success = true;
                }
            } catch (e: any) { lastError = `Qwen: ${e.message}`; }
        }
        // 3. Try GLM
        if (!success && glmKey) {
            try {
                const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${glmKey}` },
                    body: JSON.stringify({
                        model: 'glm-4-flash',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    finalItems = parseExtractJson(data.choices[0].message.content);
                    success = true;
                    logger.info(`[AI Table Extraction] Success with GLM`);
                } else {
                    const err = await response.text();
                    lastError = `GLM: ${err}`;
                }
            } catch (e: any) { lastError = `GLM: ${e.message}`; }
        }

        // 4. Try Kimi
        if (!success && kimiKey) {
            try {
                const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${kimiKey}` },
                    body: JSON.stringify({
                        model: 'moonshot-v1-8k',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    finalItems = parseExtractJson(data.choices[0].message.content);
                    success = true;
                    logger.info(`[AI Table Extraction] Success with Kimi`);
                } else {
                    const err = await response.text();
                    lastError = `Kimi: ${err}`;
                }
            } catch (e: any) { lastError = `Kimi: ${e.message}`; }
        }

        // 5. Try DeepSeek
        if (!success && deepseekKey) {
            try {
                const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${deepseekKey}` },
                    body: JSON.stringify({
                        model: 'deepseek-chat',
                        messages: [{ role: "user", content: prompt }],
                        temperature: 0.1
                    })
                });
                if (response.ok) {
                    const data = await response.json();
                    finalItems = parseExtractJson(data.choices[0].message.content);
                    success = true;
                    logger.info(`[AI Table Extraction] Success with DeepSeek`);
                } else {
                    const err = await response.text();
                    lastError = `DeepSeek: ${err}`;
                }
            } catch (e: any) { lastError = `DeepSeek: ${e.message}`; }
        }

        if (!success) throw new Error(`Tüm AI servisleri başarısız oldu. Son hata: ${lastError}`);

        return { success: true, data: finalItems };
    } catch (error: any) {
        logger.error('[extractTableItemsWithAI] Error:', error);
        return { success: false, error: error.message || String(error) };
    }
}

/**
 * Helper to parse extraction JSON safely
 */
function parseExtractJson(text: string): ExtractedTableItem[] {
    try {
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : text;
        const parsed = JSON.parse(jsonText.trim());
        return parsed.items || [];
    } catch (e) {
        return [];
    }
}

/**
 * Extracts quantity and unit from a string.
 */
export async function extractQuantityAndQuery(text: string) {
    const knownUnits = ['ad', 'adet', 'tane', 'm', 'mt', 'metre', 'kg', 'set', 'tk', 'takım', 'pcs', 'koli', 'paket', 'boy'];
    const unitPattern = knownUnits.join('|');

    const startPattern = new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})?\\s+(.*)$`, 'i');
    const endPattern = new RegExp(`^(.*?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${unitPattern})?$`, 'i');

    const startMatch = text.trim().match(startPattern);
    const endMatch = text.trim().match(endPattern);

    if (startMatch) {
        return {
            quantity: parseFloat(startMatch[1].replace(',', '.')),
            unit: startMatch[2] || 'Adet',
            query: startMatch[3].trim()
        };
    } else if (endMatch) {
        const potentialQty = parseFloat(endMatch[2].replace(',', '.'));
        if (!!endMatch[3] || potentialQty > 0) {
            return {
                quantity: potentialQty,
                unit: endMatch[3] || 'Adet',
                query: endMatch[1].trim()
            };
        }
    }

    return {
        quantity: 1,
        unit: 'Adet',
        query: text.trim()
    };
}

/**
 * Searches products for the Quick Add feature.
 */
export async function searchForQuickAdd(text: string) {
    if (!text || text.trim().length < 2) return [];

    const { query } = await extractQuantityAndQuery(text);
    if (!query || query.length < 2) return [];

    const tokens = query.toLocaleLowerCase('tr-TR').split(/\s+/).filter(t => t.length > 0);

    if (tokens.length === 0) return [];

    const products = await prisma.product.findMany({
        where: { isDeleted: false,
            AND: tokens.map(token => ({
                OR: [
                    { name: { contains: token } },
                    { brand: { contains: token } },
                    { model: { contains: token } },
                    { code: { contains: token } },
                    { name: { contains: token.toLocaleUpperCase('tr-TR') } }
                ]
            }))
        },
        take: 50
    });

    return products;
}

/**
 * Get matching cache statistics
 */
export async function getMatchingCacheStats() {
    try {
        const stats = {
            similarity: matchResultCache.getStats(),
            aiTerminology: aiTerminologyCache.getStats(),
            totalSize: matchResultCache.getSize() + aiTerminologyCache.getSize()
        };

        return { success: true, data: stats };
    } catch (error) {
        logger.error('Failed to get cache stats:', error);
        return { success: false, error: 'Cache istatistikleri alınamadı.' };
    }
}

/**
 * Clear matching cache
 */
export async function clearMatchingCache() {
    try {
        matchResultCache.clear();
        aiTerminologyCache.clear();

        logger.info('[Cache] Cleared all matching caches');
        revalidatePath('/', 'layout');

        return { success: true };
    } catch (error) {
        logger.error('Failed to clear cache:', error);
        return { success: false, error: 'Cache temizlenemedi.' };
    }
}

/**
 * Log cache statistics to console (for debugging)
 */
export async function logMatchingCacheStats() {
    try {
        logCacheStats();
        return { success: true };
    } catch (error) {
        logger.error('Failed to log cache stats:', error);
        return { success: false, error: 'Cache logları yazılamadı.' };
    }
}
