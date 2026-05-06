/**
 * Idempotency Middleware
 * Prevents duplicate processing of requests with the same Idempotency-Key.
 *
 * Uses Redis in production for multi-instance consistency.
 * Falls back to an in-memory cache only outside production.
 */
import { Redis } from '@upstash/redis';
import type { Context, Next } from 'hono';

interface CachedResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    timestamp: number;
    expiresAt: number;
}

const MAX_CACHE_SIZE = 10000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface IdempotencyCacheStore {
    get(key: string): CachedResponse | null | Promise<CachedResponse | null>;
    set(key: string, response: CachedResponse, ttlMs: number): Promise<void>;
    stats(): {
        size: number | null;
        maxSize: number | null;
        expired: number | null;
        active: number | null;
        utilization: number | null;
        backend: 'memory' | 'redis';
    };
    clearForTesting(): void | Promise<void>;
    getForTesting?(key: string): CachedResponse | undefined | Promise<CachedResponse | undefined>;
}

class InMemoryIdempotencyStore implements IdempotencyCacheStore {
    private cache = new Map<string, CachedResponse>();
    private accessOrder: string[] = [];

    constructor() {
        setInterval(() => this.cleanupExpired(), 5 * 60_000);
    }

    get(key: string): CachedResponse | null {
        const cached = this.cache.get(key);
        if (!cached) return null;
        if (cached.expiresAt <= Date.now()) {
            this.cache.delete(key);
            this.removeAccessKey(key);
            return null;
        }
        this.updateAccessOrder(key);
        return cached;
    }

    async set(key: string, response: CachedResponse, _ttlMs: number): Promise<void> {
        if (this.cache.size >= MAX_CACHE_SIZE) {
            this.evictOldest();
        }
        this.cache.set(key, response);
        this.updateAccessOrder(key);
    }

    stats() {
        const now = Date.now();
        let expired = 0;

        for (const entry of this.cache.values()) {
            if (entry.expiresAt <= now) {
                expired++;
            }
        }

        return {
            size: this.cache.size,
            maxSize: MAX_CACHE_SIZE,
            expired,
            active: this.cache.size - expired,
            utilization: (this.cache.size / MAX_CACHE_SIZE) * 100,
            backend: 'memory' as const,
        };
    }

    clearForTesting(): void {
        this.cache.clear();
        this.accessOrder.length = 0;
    }

    getForTesting(key: string): CachedResponse | undefined {
        return this.cache.get(key);
    }

    private cleanupExpired(): void {
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, value] of this.cache.entries()) {
            if (value.expiresAt <= now) {
                expiredKeys.push(key);
            }
        }

        for (const key of expiredKeys) {
            this.cache.delete(key);
            this.removeAccessKey(key);
        }

        if (expiredKeys.length > 0) {
            console.info(`[Idempotency] Cleaned up ${expiredKeys.length} expired entries`);
        }
    }

    private evictOldest(): void {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private removeAccessKey(key: string): void {
        const index = this.accessOrder.indexOf(key);
        if (index !== -1) {
            this.accessOrder.splice(index, 1);
        }
    }

    private updateAccessOrder(key: string): void {
        this.removeAccessKey(key);
        this.accessOrder.push(key);
    }
}

class RedisIdempotencyStore implements IdempotencyCacheStore {
    constructor(private redis: Redis) {}

    async get(key: string): Promise<CachedResponse | null> {
        return (await this.redis.get<CachedResponse>(key)) ?? null;
    }

    async set(key: string, response: CachedResponse, ttlMs: number): Promise<void> {
        await this.redis.set(key, response, { ex: Math.ceil(ttlMs / 1000) });
    }

    stats() {
        return {
            size: null,
            maxSize: null,
            expired: null,
            active: null,
            utilization: null,
            backend: 'redis' as const,
        };
    }

    async clearForTesting(): Promise<void> {
        throw new Error('Redis idempotency store cannot be cleared through test helper');
    }
}

export function assertIdempotencyProductionConfig(
    redisUrl: string | undefined,
    redisToken: string | undefined
): void {
    if (process.env.NODE_ENV === 'production' && (!redisUrl || !redisToken)) {
        throw new Error(
            'FATAL: Idempotency requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production.'
        );
    }
}

function createStore(): IdempotencyCacheStore {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    assertIdempotencyProductionConfig(redisUrl, redisToken);

    if (redisUrl && redisToken) {
        try {
            console.log('[Idempotency] Using Redis store');
            return new RedisIdempotencyStore(new Redis({ url: redisUrl, token: redisToken }));
        } catch (error) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error(
                    `FATAL: Failed to initialize production idempotency Redis store: ${String(error)}`
                );
            }
            console.error(
                '[Idempotency] Failed to initialize Redis, falling back to in-memory:',
                error
            );
        }
    }

    return new InMemoryIdempotencyStore();
}

const idempotencyCache = createStore();

/**
 * Generate cache key from userId and idempotency key
 */
function generateCacheKey(userId: string | null, idempotencyKey: string): string {
    const userPart = userId || 'anonymous';
    return `${userPart}:${idempotencyKey}`;
}

/**
 * Idempotency middleware
 */
export function idempotency() {
    return async (c: Context, next: Next) => {
        const method = c.req.method;

        // Only apply to POST, PUT, PATCH requests
        if (!['POST', 'PUT', 'PATCH'].includes(method)) {
            await next();
            return;
        }

        const idempotencyKey = c.req.header('Idempotency-Key');

        // If no idempotency key provided, proceed normally
        if (!idempotencyKey || idempotencyKey.trim() === '') {
            // Still validate if header was provided but empty
            if (idempotencyKey !== undefined && idempotencyKey.trim() === '') {
                return c.json(
                    {
                        error: 'Invalid Idempotency-Key header',
                        message: 'Idempotency-Key must be between 1 and 255 characters',
                    },
                    400
                );
            }
            await next();
            return;
        }

        // Validate idempotency key format (basic validation)
        if (idempotencyKey.length > 255) {
            return c.json(
                {
                    error: 'Invalid Idempotency-Key header',
                    message: 'Idempotency-Key must be between 1 and 255 characters',
                },
                400
            );
        }

        const userId = c.get('userId');
        const cacheKey = generateCacheKey(userId, idempotencyKey);

        // Check if we have a cached response
        const cached = await idempotencyCache.get(cacheKey);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            // Set headers from cache
            for (const [key, value] of Object.entries(cached.headers)) {
                c.header(key, value);
            }

            // Add idempotent replay header
            c.header('X-Idempotent-Replayed', 'true');
            c.header('X-Idempotent-Original-Time', new Date(cached.timestamp).toISOString());

            // Parse cached body to return as JSON
            try {
                const body = JSON.parse(cached.body);
                return c.json(body, cached.status as any);
            } catch {
                // If not JSON, return as text
                return c.text(cached.body, cached.status as any);
            }
        }

        // Capture response to cache it
        await next();

        // Get the response
        const response = c.res;
        const status = response.status;

        // Only cache successful responses (2xx)
        if (status >= 200 && status < 300) {
            try {
                // Clone response to read body
                const clonedResponse = response.clone();
                const body = await clonedResponse.text();

                // Extract headers (exclude some)
                const headers: Record<string, string> = {};
                const excludeHeaders = new Set([
                    'set-cookie',
                    'date',
                    'age',
                    'expires',
                    'cache-control',
                    'x-request-id',
                ]);

                for (const [key, value] of response.headers.entries()) {
                    if (!excludeHeaders.has(key.toLowerCase())) {
                        headers[key] = value;
                    }
                }

                // Store in cache
                const cachedResponse: CachedResponse = {
                    status,
                    headers,
                    body,
                    timestamp: now,
                    expiresAt: now + TTL_MS,
                };

                await idempotencyCache.set(cacheKey, cachedResponse, TTL_MS);
            } catch (error) {
                // If caching fails, log but don't fail the request
                console.error('[Idempotency] Failed to cache response:', error);
            }
        }
    };
}

/**
 * Get cache statistics (for monitoring)
 */
export function getIdempotencyCacheStats() {
    return idempotencyCache.stats();
}

/**
 * Clear cache (for testing)
 */
export function clearIdempotencyCache_forTesting() {
    void idempotencyCache.clearForTesting();
}

/**
 * Get cache entry (for testing)
 */
export function getCacheEntry_forTesting(key: string) {
    return idempotencyCache.getForTesting?.(key);
}

export default idempotency;
