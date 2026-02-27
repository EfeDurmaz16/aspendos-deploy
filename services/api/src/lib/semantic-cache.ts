import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

interface CacheEntry {
    key: string;
    originalQuery: string;
    normalizedQuery: string;
    model: string;
    response: string;
    hitCount: number;
    createdAt: string; // ISO string for JSON serialization
    lastAccessedAt: string; // ISO string for JSON serialization
    ttl: number;
    metadata?: {
        inputTokens?: number;
        outputTokens?: number;
        costSaved?: number;
    };
}

interface CacheLookupResult {
    hit: boolean;
    response?: string;
    costSaved?: number;
}

interface CacheStats {
    totalEntries: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    estimatedCostSaved: number;
    topQueries: Array<{
        query: string;
        model: string;
        hits: number;
        costSaved: number;
    }>;
}

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_SIZE = 5000;
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

class SemanticCache {
    private cache: Map<string, CacheEntry>; // In-memory fallback / dev store
    private accessOrder: string[]; // For LRU eviction (in-memory only)
    private totalHits: number;
    private totalMisses: number;
    private cleanupTimer?: NodeJS.Timeout;
    private redis: Redis | null = null;
    private readonly REDIS_PREFIX = 'scache:';
    private readonly TTL_SECONDS: number;

    constructor() {
        this.cache = new Map();
        this.accessOrder = [];
        this.totalHits = 0;
        this.totalMisses = 0;
        this.TTL_SECONDS = Math.ceil(DEFAULT_TTL / 1000);
        this.initRedis();
        this.startAutoCleanup();
    }

    private initRedis(): void {
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
        if (redisUrl && redisToken) {
            try {
                this.redis = new Redis({ url: redisUrl, token: redisToken });
                console.log('[SemanticCache] Using Redis backing store');
            } catch (err) {
                console.warn('[SemanticCache] Failed to init Redis, using in-memory:', err);
                this.redis = null;
            }
        }
    }

    /**
     * Normalize a query for cache lookup
     */
    normalizeQuery(query: string): string {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .split(' ')
            .sort() // Sort words alphabetically for bag-of-words similarity
            .join(' ');
    }

    /**
     * Generate SHA-256 hash key from normalized query + model
     */
    getCacheKey(normalizedQuery: string, model: string): string {
        const input = `${normalizedQuery}:${model}`;
        return createHash('sha256').update(input).digest('hex');
    }

    /**
     * Store response with metadata
     */
    cacheResponse(
        query: string,
        model: string,
        response: string,
        metadata?: {
            inputTokens?: number;
            outputTokens?: number;
            costSaved?: number;
        }
    ): void {
        const normalizedQuery = this.normalizeQuery(query);
        const key = this.getCacheKey(normalizedQuery, model);
        const now = new Date().toISOString();

        const entry: CacheEntry = {
            key,
            originalQuery: query,
            normalizedQuery,
            model,
            response,
            hitCount: 0,
            createdAt: now,
            lastAccessedAt: now,
            ttl: DEFAULT_TTL,
            metadata,
        };

        // Write to Redis if available (fire-and-forget)
        if (this.redis) {
            this.redis
                .set(this.REDIS_PREFIX + key, JSON.stringify(entry), { ex: this.TTL_SECONDS })
                .catch(() => {});
        }

        // Also keep in local cache for fast reads
        if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(key)) {
            this.evictLRU();
        }
        this.cache.set(key, entry);
        this.updateAccessOrder(key);
    }

    /**
     * Find cached response (checks local cache first, then Redis)
     */
    async lookupCache(query: string, model: string): Promise<CacheLookupResult> {
        const normalizedQuery = this.normalizeQuery(query);
        const key = this.getCacheKey(normalizedQuery, model);
        const now = new Date();

        // Check local cache first
        let entry = this.cache.get(key);

        // On local miss, check Redis
        if (!entry && this.redis) {
            try {
                const raw = await this.redis.get<string>(this.REDIS_PREFIX + key);
                if (raw) {
                    entry = typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as CacheEntry);
                    // Populate local cache for subsequent fast reads
                    if (entry) {
                        this.cache.set(key, entry);
                        this.updateAccessOrder(key);
                    }
                }
            } catch {
                // Redis read failed — treat as miss
            }
        }

        if (!entry) {
            this.totalMisses++;
            return { hit: false };
        }

        // Check TTL
        const age = now.getTime() - new Date(entry.createdAt).getTime();
        if (age > entry.ttl) {
            this.cache.delete(key);
            this.removeFromAccessOrder(key);
            if (this.redis) this.redis.del(this.REDIS_PREFIX + key).catch(() => {});
            this.totalMisses++;
            return { hit: false };
        }

        // Update hit count and last accessed
        entry.hitCount++;
        entry.lastAccessedAt = now.toISOString();
        this.totalHits++;
        this.updateAccessOrder(key);

        // Update Redis entry (fire-and-forget)
        if (this.redis) {
            const remainingTtl = Math.ceil((entry.ttl - age) / 1000);
            this.redis
                .set(this.REDIS_PREFIX + key, JSON.stringify(entry), { ex: remainingTtl })
                .catch(() => {});
        }

        return {
            hit: true,
            response: entry.response,
            costSaved: entry.metadata?.costSaved,
        };
    }

    /**
     * Return cache statistics
     */
    getCacheStats(): CacheStats {
        const totalRequests = this.totalHits + this.totalMisses;
        const hitRate = totalRequests > 0 ? this.totalHits / totalRequests : 0;

        let estimatedCostSaved = 0;
        const queryStats = new Map<
            string,
            {
                query: string;
                model: string;
                hits: number;
                costSaved: number;
            }
        >();

        for (const entry of this.cache.values()) {
            const costSaved = (entry.metadata?.costSaved || 0) * entry.hitCount;
            estimatedCostSaved += costSaved;

            const statKey = `${entry.normalizedQuery}:${entry.model}`;
            queryStats.set(statKey, {
                query: entry.originalQuery,
                model: entry.model,
                hits: entry.hitCount,
                costSaved,
            });
        }

        const topQueries = Array.from(queryStats.values())
            .sort((a, b) => b.hits - a.hits)
            .slice(0, 10);

        return {
            totalEntries: this.cache.size,
            hitRate,
            totalHits: this.totalHits,
            totalMisses: this.totalMisses,
            estimatedCostSaved,
            topQueries,
        };
    }

    /**
     * Remove entries older than TTL
     */
    evictStale(): number {
        const now = Date.now();
        let evicted = 0;

        for (const [key, entry] of this.cache.entries()) {
            const age = now - new Date(entry.createdAt).getTime();
            if (age > entry.ttl) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
                if (this.redis) this.redis.del(this.REDIS_PREFIX + key).catch(() => {});
                evicted++;
            }
        }

        return evicted;
    }

    /**
     * Return estimated cost savings for period
     */
    getCostSavings(period?: number): number {
        const cutoffMs = period ? Date.now() - period : 0;
        let savings = 0;

        for (const entry of this.cache.values()) {
            if (new Date(entry.lastAccessedAt).getTime() >= cutoffMs) {
                savings += (entry.metadata?.costSaved || 0) * entry.hitCount;
            }
        }

        return savings;
    }

    /**
     * Clear cache for specific model
     */
    invalidateForModel(model: string): number {
        let invalidated = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.model === model) {
                this.cache.delete(key);
                this.removeFromAccessOrder(key);
                invalidated++;
            }
        }

        return invalidated;
    }

    /**
     * Get most frequently hit cached queries
     */
    getTopCachedQueries(limit = 10): Array<{
        query: string;
        model: string;
        hits: number;
        costSaved: number;
    }> {
        return Array.from(this.cache.values())
            .map((entry) => ({
                query: entry.originalQuery,
                model: entry.model,
                hits: entry.hitCount,
                costSaved: (entry.metadata?.costSaved || 0) * entry.hitCount,
            }))
            .sort((a, b) => b.hits - a.hits)
            .slice(0, limit);
    }

    /**
     * Reset cache (for testing)
     */
    clearCache_forTesting(): void {
        this.cache.clear();
        this.accessOrder = [];
        this.totalHits = 0;
        this.totalMisses = 0;
    }

    /**
     * LRU eviction
     */
    private evictLRU(): void {
        if (this.accessOrder.length === 0) return;

        const keyToEvict = this.accessOrder.shift();
        if (keyToEvict) {
            this.cache.delete(keyToEvict);
        }
    }

    /**
     * Update access order for LRU
     */
    private updateAccessOrder(key: string): void {
        this.removeFromAccessOrder(key);
        this.accessOrder.push(key);
    }

    /**
     * Remove from access order
     */
    private removeFromAccessOrder(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    /**
     * Start automatic cleanup
     */
    private startAutoCleanup(): void {
        this.cleanupTimer = setInterval(() => {
            this.evictStale();
        }, CLEANUP_INTERVAL);
    }

    /**
     * Stop automatic cleanup (for testing)
     */
    stopAutoCleanup(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
    }
}

// Singleton instance
const semanticCache = new SemanticCache();

export { semanticCache, type CacheEntry, type CacheLookupResult, type CacheStats };
