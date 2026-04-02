'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

export interface PurchasingInsight {
    summary: string;
    cheapestSupplier: string;
    bestPrice: number;
    lastPrice: number;
    avgPrice: number;
    priceVolatility: number; // Percentage
    trend: 'up' | 'down' | 'stable';
    advice: string;
    localAdvice: string; // Rule-based advice for offline use
    isAiSupported: boolean;
}

export async function getPurchasingInsights(productId: string): Promise<{ success: boolean; data?: PurchasingInsight; error?: string }> {
    try {
        // 1. Fetch Purchase History
        const history = await prisma.purchaseHistory.findMany({
            where: { productId },
            orderBy: { date: 'desc' },
            take: 20
        });

        if (history.length === 0) {
            return { success: false, error: 'Analiz için yeterli satın alma verisi bulunmuyor.' };
        }

        // 2. Core Local Statistics (Works Offline)
        const lastPurchase = history[0];
        const prices = history.map(h => h.netPrice);
        const sortedByPrice = [...history].sort((a, b) => a.netPrice - b.netPrice);
        const bestPurchase = sortedByPrice[0];
        
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceVolatility = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        let localAdvice = "Fiyatlar istikrarlı seyrediyor.";
        
        if (history.length >= 2) {
            const prevPrice = history[1].netPrice;
            const diffPercent = ((lastPurchase.netPrice - prevPrice) / prevPrice) * 100;
            
            if (diffPercent > 2) {
                trend = 'up';
                localAdvice = `Fiyat son alıma göre %${diffPercent.toFixed(1)} artış gösterdi.`;
            } else if (diffPercent < -2) {
                trend = 'down';
                localAdvice = `Fiyat son alıma göre %${Math.abs(diffPercent).toFixed(1)} düşüş gösterdi.`;
            }
        }

        if (lastPurchase.netPrice > minPrice * 1.1) {
            localAdvice += ` En iyi fiyattan (%${((lastPurchase.netPrice/minPrice - 1) * 100).toFixed(0)}) daha pahalı alım yapılıyor.`;
        }

        // 3. AI Analysis with Gemini (Optional, Needs Internet)
        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        let aiAdvice = "";
        let isAiSupported = false;

        if (apiKey && history.length >= 2) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const dataSummary = JSON.stringify({
                    productName: (await prisma.product.findUnique({ where: { id: productId } }))?.name,
                    history: history.map(h => ({
                        date: h.date,
                        supplier: h.supplierName,
                        price: h.netPrice,
                        currency: h.currency
                    }))
                });

                const prompt = `
Aşağıdaki ürün satın alma geçmişini analiz et ve bir satınalma müdürü gibi profesyonel bir Türkçe öneri metni hazırla. 
Hangi tedarikçinin daha avantajlı olduğunu, fiyat trendini ve bir sonraki teklifte ne yapılması gerektiğini belirt.
Maksimum 3 kısa cümle.
Veri: ${dataSummary}
`;
                const result = await model.generateContent(prompt);
                aiAdvice = result.response.text();
                isAiSupported = true;
            } catch (aiError) {
                logger.warn("AI analysis skipped (offline or error):", aiError);
            }
        }

        return {
            success: true,
            data: {
                summary: `${history.length} farklı alım üzerinden analiz yapıldı.`,
                cheapestSupplier: bestPurchase.supplierName || 'Bilinmiyor',
                bestPrice: bestPurchase.netPrice,
                lastPrice: lastPurchase.netPrice,
                avgPrice,
                priceVolatility,
                trend,
                advice: aiAdvice,
                localAdvice,
                isAiSupported
            }
        };
    } catch (error: any) {
        logger.error('Purchasing analysis error:', error);
        return { success: false, error: error.message };
    }
}
