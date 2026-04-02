/**
 * Lightweight string similarity functions for offline product matching.
 * Now with caching for improved performance!
 */

import { similarityCache, matchResultCache, generateCacheKey } from './matching-cache';
import { normalizeText, tokenize } from '@/services/product-search-service';

// ============================================================================
// CRITICAL KEYWORDS FOR WEIGHTING
// These patterns indicate critical product specifications
// ============================================================================

const CRITICAL_PATTERNS = [
    // SIZE/DIMENSION PATTERNS (Critical!)
    /\d+'lik/i,        // 28'lik, 32'lik (size)
    /\d+\s*x\s*\d+/i,  // 60x100, 50x20, 60 x 100 (dimensions)
    /\d+\s*MT/i,       // 1MT, 2MT (length in meters)
    /\d+\s*MM/i,       // 20MM, 25MM (millimeters)
    /\d+\s*CM/i,       // 50CM (centimeters)
    /Ø\d+/i,           // Ø125, Ø160 (diameter)
    /DN\s*\d+/i,       // DN80, DN 125 (diameter nominal)
    /NW\s*\d+/i,       // NW125 (nominal width)
    /\d+\s*"/i,        // 5", 28" (inches)

    // TECHNICAL SPECIFICATIONS
    /PN\s*\d+/i,       // PN16, PN 25 (pressure rating)
    /DN\s*\d+\s*PN\s*\d+/i, // DN125 PN16 (combined)
    /\d+\s*BAR/i,      // 10 BAR (pressure)
    /\d+\s*ATM/i,      // 5 ATM (pressure)

    // CONFIGURATION PATTERNS
    /çift\s*sıra/i,    // Çift sıra (double row)
    /tek\s*sıra/i,     // Tek sıra (single row)
    /motorlu/i,        // Motorlu (motorized)
    /manuel/i,         // Manuel (manual)
    /flanşlı/i,        // Flanşlı (flanged)
    /dişli/i,          // Dişli (threaded)
    /izolasyonlu/i,    // İzolasyonlu (insulated)
    /izolesiz/i,       // İzolesiz (uninsulated)
    /kompakt/i,        // Kompakt (compact)
    /standart/i,       // Standart (standard)
    /premium/i,        // Premium
    /pro/i,            // Pro series

    // MATERIAL TYPES
    /çelik/i,          // Çelik (steel)
    /paslanmaz/i,      // Paslanmaz (stainless)
    /plastik/i,        // Plastik (plastic)
    /bakır/i,          // Bakır (copper)
    /döküm/i,          // Döküm (cast iron)
];

// ============================================================================
// BRAND/MODEL EXTRACTION
// Known brands in mechanical contracting industry
// ============================================================================

const KNOWN_BRANDS = [
    // HVAC/R Brands
    'GMV', 'Gree', 'Gree', 'Midea', 'Daikin', 'Mitsubishi', 'LG', 'Samsung',
    'Carrier', 'Trane', 'York', 'McQuay', 'Toshiba', 'Panasonic',
    'Hitachi', 'Fujitsu', 'General', 'Blueway', 'Airfel', 'Baymak',

    // Valve & Fitting Brands
    'Valf', 'Flamco', 'Meibes', 'Oventrop', 'Herz', 'Imi',
    'Caleffi', 'Watts', 'Honeywell', 'Siemens', 'Danfoss',
    'Belimo', 'Samson', 'Spirax Sarco', 'Armstrong', 'Kele',

    // Pipe & Tubing Brands
    'Firat', 'Vesbo', 'Pilsa', 'Uponor', 'Rehau', 'Wavin',
    'PPRC', 'PEX', 'PERT', 'PVC', 'HDPE',

    // Radiator Brands
    'Demirdöküm', 'Eca', 'Vairad', 'Baykan', 'Isısan',
    'Termoakım', 'Alarko', 'Protherm', 'Buderus', 'Vaillant',

    // Pump Brands
    'Grundfos', 'Wilo', 'Lowara', 'Pedrollo', 'Ebara',
    'DAB', 'Saer', 'Calpeda', 'Pentair', 'Flowserve',

    // Other Brands
    'Spirotech', 'Flamco', 'Adexen', 'Giacomini', 'Ferroli',
    'Bosch', 'Ariston', 'Immergas', 'Chaffoteaux'
];

/**
 * Extract brand name from product text
 * Returns the first matching brand or null
 * IMPROVED: Better matching with word boundaries
 */
export function extractBrand(text: string): string | null {
    if (!text) return null;

    const upperText = text.toUpperCase();

    // Sort brands by length (longest first) to avoid partial matches
    const sortedBrands = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);

    for (const brand of sortedBrands) {
        const brandUpper = brand.toUpperCase();
        // Check if brand is present as a whole word
        const brandPattern = new RegExp(`\\b${brandUpper}\\b`, 'i');
        if (brandPattern.test(upperText)) {
            return brand;
        }
    }

    return null;
}

/**
 * Extract model number from product text
 * Looks for patterns after brand name
 * IMPROVED: More patterns and better extraction
 */
export function extractModel(text: string): string | null {
    if (!text) return null;

    // Common model patterns (ordered by specificity)
    const patterns = [
        /[A-Z]{2,}-[A-Z0-9]+/i,      // GMV-ND71TS
        /[A-Z]{2,}\s*[0-9]{3,}/i,     // Gree 12000
        /[0-9]{3,}\s*[A-Z]+/i,        // 12000 BTU
        /DN\s*\d+\s*PN\s*\d+/i,       // DN125 PN16
        /Ø\s*\d+/i,                   // Ø125
        /\d+'\s*\d*\.?\d*/i,          // 5' 2.5
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

/**
 * Check if two brands are compatible (same or related)
 * Returns false if brands are different and critical
 */
export function areBrandsCompatible(brand1: string | null, brand2: string | null): boolean {
    // If either is null, no brand conflict
    if (!brand1 || !brand2) return true;

    // Same brand → compatible
    if (brand1.toUpperCase() === brand2.toUpperCase()) return true;

    // Different brands → NOT compatible (critical!)
    return false;
}

// ============================================================================
// TOKEN-BASED MATCHING (Jaccard Similarity)
// ============================================================================

/**
 * Tokenize a product name into individual words
 * IMPROVED: Turkish character support + better normalization
 */
/**
 * Calculate Jaccard similarity between two strings based on tokens
 * Better for word order independence!
 */
export function getTokenSimilarity(a: string, b: string): number {
    // Generate cache key
    const cacheKey = generateCacheKey('token-similarity', a, b);

    // Try cache first
    const cached = similarityCache.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    const tokensA = new Set(tokenize(a));
    const tokensB = new Set(tokenize(b));

    // Calculate intersection
    const intersection = new Set([...tokensA].filter(t => tokensB.has(t)));

    // Calculate union
    const union = new Set([...tokensA, ...tokensB]);

    // Jaccard similarity
    const result = union.size > 0 ? intersection.size / union.size : 0;

    // Cache the result
    similarityCache.set(cacheKey, result);

    return result;
}

// ============================================================================
// CRITICAL KEYWORDS WEIGHTING
// ============================================================================

/**
 * Check if text contains critical patterns and return matched patterns
 */
function extractCriticalPatterns(text: string): RegExp[] {
    const matched: RegExp[] = [];
    for (const pattern of CRITICAL_PATTERNS) {
        if (pattern.test(text)) {
            matched.push(pattern);
        }
    }
    return matched;
}

/**
 * Extract numeric values from critical patterns (for detailed comparison)
 */
function extractCriticalValues(text: string): { pattern: string, value: string }[] {
    const values: { pattern: string, value: string }[] = [];

    // Extract size values (28'lik, 32'lik)
    const sizeMatches = text.matchAll(/(\d+)'lik/gi);
    for (const match of sizeMatches) {
        values.push({ pattern: 'size', value: match[1] });
    }

    // Extract dimension values (60x100, 50x20)
    const dimMatches = text.matchAll(/(\d+)\s*x\s*(\d+)/gi);
    for (const match of dimMatches) {
        values.push({ pattern: 'dimension', value: `${match[1]}x${match[2]}` });
    }

    // Extract diameter values (Ø125, DN80)
    const diaMatches = text.matchAll(/(?:Ø|DN|NW)\s*(\d+)/gi);
    for (const match of diaMatches) {
        values.push({ pattern: 'diameter', value: match[1] });
    }

    return values;
}

/**
 * Calculate similarity with critical keyword weighting
 * Penalizes mismatches in critical specifications
 * IMPROVED: More aggressive penalty for size/dimension mismatches
 */
export function getWeightedSimilarity(a: string, b: string): number {
    // Generate cache key
    const cacheKey = generateCacheKey('weighted-similarity', a, b);

    // Try cache first
    const cached = similarityCache.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    // Get base similarity
    let baseScore = getStringSimilarity(a, b);

    // Extract critical patterns
    const patternsA = extractCriticalPatterns(a);
    const patternsB = extractCriticalPatterns(b);

    // Extract critical values
    const valuesA = extractCriticalValues(a);
    const valuesB = extractCriticalValues(b);

    // CRITICAL: If one has critical pattern and other doesn't → PENALIZE
    if (patternsA.length > 0 || patternsB.length > 0) {
        const patternsASet = new Set(patternsA.map(p => p.source));
        const patternsBSet = new Set(patternsB.map(p => p.source));

        // Check for mismatches
        let mismatchCount = 0;
        let criticalMismatch = false;

        for (const pattern of patternsA) {
            if (!patternsBSet.has(pattern.source)) {
                mismatchCount++;
                // Critical patterns (size, dimension, diameter) are deal-breakers
                if (pattern.source.includes("'lik") || pattern.source.includes("x") || pattern.source.includes("Ø") || pattern.source.includes("DN")) {
                    criticalMismatch = true;
                }
            }
        }

        for (const pattern of patternsB) {
            if (!patternsASet.has(pattern.source)) {
                mismatchCount++;
                if (pattern.source.includes("'lik") || pattern.source.includes("x") || pattern.source.includes("Ø") || pattern.source.includes("DN")) {
                    criticalMismatch = true;
                }
            }
        }

        // Check numeric value mismatches (e.g., 28'lik vs 32'lik)
        for (const valA of valuesA) {
            const matchingB = valuesB.find(v => v.pattern === valA.pattern);
            if (matchingB && matchingB.value !== valA.value) {
                criticalMismatch = true; // Different size = NO MATCH
            }
        }

        // CRITICAL MISMATCH: Reduce score to near-zero
        if (criticalMismatch) {
            baseScore = baseScore * 0.05; // 95% reduction!
        } else if (mismatchCount > 0) {
            // Non-critical mismatch: reduce by 70% for each
            baseScore = baseScore * Math.pow(0.3, mismatchCount);
        }
    }

    const result = Math.min(1, baseScore);

    // Cache the result
    similarityCache.set(cacheKey, result);

    return result;
}

// ============================================================================
// PRODUCT CODE NORMALIZATION
// ============================================================================

/**
 * Normalize product codes for comparison
 * Removes special characters and standardizes format
 * IMPROVED: Better handling of product code variations
 */
export function normalizeProductCode(code: string): string {
    if (!code) return '';

    return code
        .toUpperCase()
        .replace(/[\s\-\.\*]+/g, '')  // Remove spaces, hyphens, dots, asterisks
        .replace(/[^A-Z0-9]/g, '')    // Remove all other special characters
        .trim();
}

/**
 * Check if two product codes match (after normalization)
 */
export function codesMatch(code1: string, code2: string): boolean {
    if (!code1 || !code2) return false;

    const normalized1 = normalizeProductCode(code1);
    const normalized2 = normalizeProductCode(code2);

    // Both must be at least 5 chars to avoid false positives
    if (normalized1.length < 5 || normalized2.length < 5) {
        return false;
    }

    return normalized1 === normalized2;
}

/**
 * Extract product code from a product name
 * Looks for patterns like GMV-ND71TS, ABC-123, etc.
 */
export function extractProductCode(name: string): string | null {
    // Common product code patterns
    const patterns = [
        /[A-Z]{2,}-[A-Z0-9]+/i,      // GMV-ND71TS
        /[A-Z]{2,}[0-9]{3,}/i,        // ABC123
        /[0-9]{4,}[A-Z]+/i,           // 1234ABC
    ];

    for (const pattern of patterns) {
        const match = name.match(pattern);
        if (match) {
            return match[0];
        }
    }

    return null;
}

// ============================================================================
// COMBINED MATCHING STRATEGY
// ============================================================================

/**
 * Brand-aware similarity calculation
 * Returns 0 if brands are different (critical!)
 * IMPROVED: More aggressive brand mismatch penalty
 */
export function getBrandAwareSimilarity(name1: string, name2: string): number {
    // Extract brands
    const brand1 = extractBrand(name1);
    const brand2 = extractBrand(name2);

    // CRITICAL: If both have brands and they're different → NO MATCH!
    if (brand1 && brand2 && !areBrandsCompatible(brand1, brand2)) {
        console.log(`[Matching] ⚠️ Brand mismatch: ${brand1} vs ${brand2} → 0 score`);
        return 0; // Critical penalty - different brands should never match
    }

    // Same brand or no brand → Normal matching
    return getCombinedSimilarity(name1, name2);
}

/**
 * Combined similarity score using multiple strategies
 * Weights: Token (40%) + Weighted (40%) + Code match bonus (20%)
 */
export function getCombinedSimilarity(name1: string, name2: string, code1?: string, code2?: string): number {
    // Token-based similarity (word order independent)
    const tokenScore = getTokenSimilarity(name1, name2);

    // Weighted similarity (critical keyword aware)
    const weightedScore = getWeightedSimilarity(name1, name2);

    // Code match bonus
    let codeBonus = 0;
    if (code1 && code2 && codesMatch(code1, code2)) {
        codeBonus = 0.2; // 20% bonus for matching codes
    }

    // Combined score (weighted average)
    const combinedScore = (tokenScore * 0.4) + (weightedScore * 0.4) + codeBonus;

    return Math.min(1, combinedScore);
}

/**
 * Calculates the Levenshtein distance between two strings.
 * Lower distance means higher similarity.
 * NOW CACHED for performance!
 */
export function getLevenshteinDistance(a: string, b: string): number {
    // Generate cache key
    const cacheKey = generateCacheKey('levenshtein', a, b);

    // Try cache first
    const cached = similarityCache.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    // Calculate if not in cache
    const matrix: number[][] = [];

    const sa = a.toLowerCase().trim();
    const sb = b.toLowerCase().trim();

    for (let i = 0; i <= sb.length; i++) matrix[i] = [i];
    for (let j = 0; j <= sa.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= sb.length; i++) {
        for (let j = 1; j <= sa.length; j++) {
            if (sb.charAt(i - 1) === sa.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    const result = matrix[sb.length][sa.length];

    // Cache the result
    similarityCache.set(cacheKey, result);

    return result;
}

/**
 * Returns a similarity score between 0 and 1.
 * NOW CACHED for performance!
 */
export function getStringSimilarity(a: string, b: string): number {
    // Generate cache key
    const cacheKey = generateCacheKey('similarity', a, b);

    // Try cache first
    const cached = similarityCache.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    // Calculate if not in cache
    if (a === b) {
        similarityCache.set(cacheKey, 1);
        return 1;
    }
    if (a.length === 0 || b.length === 0) {
        similarityCache.set(cacheKey, 0);
        return 0;
    }

    const distance = getLevenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);

    const result = 1 - distance / maxLength;

    // Cache the result
    similarityCache.set(cacheKey, result);

    return result;
}

/**
 * Finds the best match for a given name in an array of candidates.
 * NOW WITH BRAND AWARENESS!
 * Uses: Brand Check + Product Code + Token-based + Critical Keywords
 */
export function findBestMatch<T>(
    target: string,
    candidates: T[],
    getName: (item: T) => string,
    getCode?: (item: T) => string | null,
    threshold: number = 0.4
): { item: T; score: number; method: string } | null {
    // Generate cache key from target and candidate names
    const candidateNames = candidates.map(c => getName(c)).sort().join('|');
    const cacheKey = generateCacheKey('bestmatch-v3', target, candidateNames, threshold);

    // Try cache first
    const cached = matchResultCache.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    let bestMatch: T | null = null;
    let highestScore = 0;
    let bestMethod = '';

    // Extract target product code and brand
    const extractedTargetCode = extractProductCode(target);
    const targetBrand = extractBrand(target);

    for (const candidate of candidates) {
        const candidateName = getName(candidate).toLowerCase().trim();
        const candidateCode = getCode ? getCode(candidate) : extractProductCode(getName(candidate));
        const candidateBrand = extractBrand(getName(candidate));

        // STRATEGY 0: Brand Check (CRITICAL - different brands = no match!)
        if (targetBrand && candidateBrand && targetBrand !== candidateBrand) {
            continue; // Skip this candidate - different brand!
        }

        // STRATEGY 1: Product Code Match (highest priority)
        if (extractedTargetCode && candidateCode) {
            if (codesMatch(extractedTargetCode, candidateCode)) {
                const result = { item: candidate, score: 0.95, method: 'code-match' };
                matchResultCache.set(cacheKey, result);
                return result; // Immediate match!
            }
        }

        // STRATEGY 2: Brand-Aware Combined Similarity
        const combinedScore = getBrandAwareSimilarity(
            target,
            getName(candidate)
        );

        if (combinedScore > highestScore) {
            highestScore = combinedScore;
            bestMatch = candidate;
            bestMethod = 'brand-aware-combined';
        }

        // STRATEGY 3: Fallback to old methods for edge cases
        const normalizedTarget = target.toLowerCase().trim();

        // Exact check
        if (normalizedTarget === candidateName) {
            const result = { item: candidate, score: 1.0, method: 'exact' };
            matchResultCache.set(cacheKey, result);
            return result;
        }

        // Inclusion check
        if (candidateName.includes(normalizedTarget) || normalizedTarget.includes(candidateName)) {
            const inclusionScore = Math.min(normalizedTarget.length, candidateName.length) /
                                   Math.max(normalizedTarget.length, candidateName.length) * 0.9;
            if (inclusionScore > highestScore) {
                highestScore = inclusionScore;
                bestMatch = candidate;
                bestMethod = 'inclusion';
            }
        }
    }

    const result = highestScore >= threshold && bestMatch
        ? { item: bestMatch, score: highestScore, method: bestMethod }
        : null;

    // Cache the result
    if (result) {
        matchResultCache.set(cacheKey, result);
    }

    return result;
}
