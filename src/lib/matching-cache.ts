/**
 * Lightweight Cache with TTL (Time-To-Live) support
 * Used for product matching results to improve performance
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number; // Timestamp when entry expires
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    hitRate: number;
}

export class MatchingCache<T> {
    private cache: Map<string, CacheEntry<T>>;
    private readonly ttl: number; // Time-to-live in milliseconds
    private readonly maxSize: number; // Maximum cache size
    private hits: number = 0;
    private misses: number = 0;

    /**
     * @param ttl Time-to-live in milliseconds (default: 24 hours)
     * @param maxSize Maximum number of entries (default: 10000)
     */
    constructor(ttl: number = 24 * 60 * 60 * 1000, maxSize: number = 10000) {
        this.cache = new Map();
        this.ttl = ttl;
        this.maxSize = maxSize;

        // Auto-cleanup expired entries every 5 minutes
        setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }

    /**
     * Get value from cache
     * Returns null if not found or expired
     */
    get(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            this.misses++;
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }

        this.hits++;
        return entry.value;
    }

    /**
     * Set value in cache
     * Automatically removes oldest entry if at max capacity
     */
    set(key: string, value: T): void {
        // If at max capacity, remove oldest entry (first item in Map)
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + this.ttl
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Delete specific key
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        let deleted = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                deleted++;
            }
        }

        if (deleted > 0) {
            console.log(`[Cache] Cleaned up ${deleted} expired entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        const total = this.hits + this.misses;
        return {
            hits: this.hits,
            misses: this.misses,
            size: this.cache.size,
            hitRate: total > 0 ? (this.hits / total) * 100 : 0
        };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get current size
     */
    getSize(): number {
        return this.cache.size;
    }

    /**
     * Check if cache is near capacity
     */
    isNearCapacity(threshold: number = 0.9): boolean {
        return this.cache.size >= this.maxSize * threshold;
    }
}

// ============================================================================
// GLOBAL CACHE INSTANCES
// ============================================================================

/**
 * Cache for string similarity results
 * TTL: 24 hours (product names don't change often)
 */
export const similarityCache = new MatchingCache<number>(
    24 * 60 * 60 * 1000, // 24 hours
    50000 // 50k entries max
);

/**
 * Cache for full matching results
 * TTL: 24 hours
 */
export const matchResultCache = new MatchingCache<any>(
    24 * 60 * 60 * 1000, // 24 hours
    50000 // 50k entries max
);

/**
 * Cache for AI terminology results
 * TTL: 7 days (AI suggestions are stable)
 */
export const aiTerminologyCache = new MatchingCache<any>(
    7 * 24 * 60 * 60 * 1000, // 7 days
    10000 // 10k entries max
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(...args: any[]): string {
    return args.map(arg => JSON.stringify(arg)).join('|');
}

/**
 * Log cache statistics periodically
 */
export function logCacheStats(): void {
    const similarity = similarityCache.getStats();
    const matchResult = matchResultCache.getStats();
    const aiTerm = aiTerminologyCache.getStats();

    console.log('[Cache Statistics]');
    console.log(`  Similarity: ${similarity.size} entries, ${similarity.hitRate.toFixed(1)}% hit rate`);
    console.log(`  Match Result: ${matchResult.size} entries, ${matchResult.hitRate.toFixed(1)}% hit rate`);
    console.log(`  AI Terminology: ${aiTerm.size} entries, ${aiTerm.hitRate.toFixed(1)}% hit rate`);
    console.log(`  Total entries: ${similarity.size + matchResult.size + aiTerm.size}`);
}
