// Ensemble AI Invoice Parser
// Runs multiple AI models in parallel and merges results for maximum accuracy

import { logger } from '@/lib/logger';

interface AIResult {
    source: 'Gemini' | 'Qwen' | 'GLM' | 'Kimi';
    success: boolean;
    data?: any;
    error?: string;
    confidence?: number;
}

interface ParserFunctions {
    gemini?: (text: string, key: string) => Promise<any>;
    qwen?: (text: string, key: string) => Promise<any>;
    glm?: (text: string, key: string) => Promise<any>;
    kimi?: (text: string, key: string) => Promise<any>;
}

interface EnsembleConfig {
    geminiKey?: string;
    qwenKey?: string;
    glmKey?: string;
    kimiKey?: string;
    parsers: ParserFunctions;
}

/**
 * Runs all available AI models in parallel and merges results
 * Uses voting and confidence scoring to determine the most accurate data
 */
export const parseWithEnsembleAI = async (
    text: string,
    config: EnsembleConfig
): Promise<any> => {
    const { geminiKey, qwenKey, glmKey, kimiKey, parsers } = config;

    logger.info('🤖 Starting Ensemble AI Parsing...');
    logger.info(`📊 Active models: ${[geminiKey && 'Gemini', qwenKey && 'Qwen', glmKey && 'GLM', kimiKey && 'Kimi'].filter(Boolean).join(', ')}`);

    // Run all AI models in parallel
    const promises: Promise<AIResult>[] = [];

    if (geminiKey && parsers.gemini) {
        promises.push(
            parsers.gemini(text, geminiKey)
                .then((data: any) => ({ source: 'Gemini' as const, success: true, data, confidence: 0.9 }))
                .catch((error: any) => ({ source: 'Gemini' as const, success: false, error: error.message }))
        );
    }

    if (qwenKey && parsers.qwen) {
        promises.push(
            parsers.qwen(text, qwenKey)
                .then((data: any) => ({ source: 'Qwen' as const, success: true, data, confidence: 0.85 }))
                .catch((error: any) => ({ source: 'Qwen' as const, success: false, error: error.message }))
        );
    }

    if (glmKey && parsers.glm) {
        promises.push(
            parsers.glm(text, glmKey)
                .then((data: any) => ({ source: 'GLM' as const, success: true, data, confidence: 0.88 }))
                .catch((error: any) => ({ source: 'GLM' as const, success: false, error: error.message }))
        );
    }

    if (kimiKey && parsers.kimi) {
        promises.push(
            parsers.kimi(text, kimiKey)
                .then((data: any) => ({ source: 'Kimi' as const, success: true, data, confidence: 0.87 }))
                .catch((error: any) => ({ source: 'Kimi' as const, success: false, error: error.message }))
        );
    }

    if (promises.length === 0) {
        throw new Error('No AI models available');
    }

    // Wait for all to complete
    const results = await Promise.all(promises);

    // Filter successful results
    const successfulResults = results.filter(r => r.success && r.data);

    logger.info(`✅ ${successfulResults.length}/${results.length} AI models succeeded`);
    successfulResults.forEach(r => logger.info(`  - ${r.source}: ✓`));

    if (successfulResults.length === 0) {
        const errors = results.map(r => `${r.source}: ${r.error}`).join(', ');
        throw new Error(`All AI models failed: ${errors}`);
    }

    // If only one succeeded, return it
    if (successfulResults.length === 1) {
        logger.warn(`⚠️ Only ${successfulResults[0].source} succeeded, using its result`);
        return {
            ...successfulResults[0].data,
            _aiSource: successfulResults[0].source,
            _confidence: 'low'
        };
    }

    // Merge results using consensus
    logger.info('🔀 Merging results from multiple AIs...');
    const merged = mergeAIResults(successfulResults);

    return {
        ...merged,
        _aiSource: `Ensemble (${successfulResults.map(r => r.source).join(' + ')})`,
        _confidence: 'high'
    };
};

/**
 * Merges multiple AI results using voting and confidence scoring
 */
function mergeAIResults(results: AIResult[]): any {
    if (results.length === 0) return {};
    if (results.length === 1) return results[0].data;

    const merged: any = {};

    // Merge metadata fields (invoice number, date, sender, etc.)
    merged.invoiceNumber = voteForField(results, 'invoiceNumber');
    merged.invoiceDate = voteForField(results, 'invoiceDate');
    merged.senderName = voteForField(results, 'senderName');
    merged.totalAmount = averageNumericField(results, 'totalAmount');
    merged.subTotal = averageNumericField(results, 'subTotal');
    merged.totalTaxAmount = averageNumericField(results, 'totalTaxAmount');
    merged.totalDiscountAmount = averageNumericField(results, 'totalDiscountAmount');
    merged.taxInclusiveTotal = averageNumericField(results, 'taxInclusiveTotal');

    // Merge line items (most complex part)
    merged.items = mergeLineItems(results);

    logger.debug(`📦 Merged ${merged.items?.length || 0} line items from ${results.length} AIs`);

    return merged;
}

/**
 * Voting mechanism for string fields
 */
function voteForField(results: AIResult[], fieldName: string): any {
    const values = results
        .map(r => r.data?.[fieldName])
        .filter(v => v !== undefined && v !== null && v !== '');

    if (values.length === 0) return undefined;

    // Count occurrences
    const counts = new Map<any, number>();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));

    // Return most common value
    let maxCount = 0;
    let winner = values[0];
    counts.forEach((count, value) => {
        if (count > maxCount) {
            maxCount = count;
            winner = value;
        }
    });

    return winner;
}

/**
 * Average numeric fields (for amounts)
 */
function averageNumericField(results: AIResult[], fieldName: string): number {
    const values = results
        .map(r => Number(r.data?.[fieldName]))
        .filter(v => !isNaN(v) && v > 0);

    if (values.length === 0) return 0;

    // Use median instead of mean to reduce outlier impact
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];
}

/**
 * Merge line items from multiple AIs
 * Uses fuzzy matching to identify same items across different AI results
 */
function mergeLineItems(results: AIResult[]): any[] {
    const allItems: any[][] = results.map(r => r.data?.items || []);

    if (allItems.length === 0) return [];

    // Use the result with most items as base
    const baseItems = allItems.reduce((a, b) => a.length > b.length ? a : b, []);

    // For each base item, find matching items in other results
    return baseItems.map((baseItem, index) => {
        const matchingItems = allItems
            .map(items => items[index]) // Same position
            .filter(item => item && isSimilarItem(baseItem, item));

        if (matchingItems.length === 0) return baseItem;

        // Merge matching items
        return {
            name: voteForItemField(matchingItems, 'name'),
            quantity: averageItemField(matchingItems, 'quantity'),
            unitPrice: averageItemField(matchingItems, 'unitPrice'),
            totalPrice: averageItemField(matchingItems, 'totalPrice'),
            unit: voteForItemField(matchingItems, 'unit'),
            taxRate: voteForItemField(matchingItems, 'taxRate'),
            discountRate: averageItemField(matchingItems, 'discountRate'),
            taxAmount: averageItemField(matchingItems, 'taxAmount'),
            discountAmount: averageItemField(matchingItems, 'discountAmount'),
            unitListPrice: averageItemField(matchingItems, 'unitListPrice')
        };
    });
}

/**
 * Check if two items are similar (fuzzy name matching)
 */
function isSimilarItem(item1: any, item2: any): boolean {
    if (!item1?.name || !item2?.name) return false;

    const name1 = item1.name.toLowerCase().trim();
    const name2 = item2.name.toLowerCase().trim();

    // Exact match
    if (name1 === name2) return true;

    // Substring match (one contains the other)
    if (name1.includes(name2) || name2.includes(name1)) return true;

    // Levenshtein distance < 30% of longer string
    const distance = levenshteinDistance(name1, name2);
    const maxLen = Math.max(name1.length, name2.length);
    return distance / maxLen < 0.3;
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

function voteForItemField(items: any[], field: string): any {
    const values = items.map(item => item[field]).filter(v => v !== undefined);
    if (values.length === 0) return undefined;

    const counts = new Map();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));

    let maxCount = 0;
    let winner = values[0];
    counts.forEach((count, value) => {
        if (count > maxCount) {
            maxCount = count;
            winner = value;
        }
    });

    return winner;
}

function averageItemField(items: any[], field: string): number {
    const values = items.map(item => Number(item[field])).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return 0;

    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0
        ? (values[mid - 1] + values[mid]) / 2
        : values[mid];
}
