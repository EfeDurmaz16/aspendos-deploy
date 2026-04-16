/**
 * Idempotency Middleware
 * Prevents duplicate processing of requests with the same Idempotency-Key.
 *
 * Stores response in memory cache with 24-hour TTL.
 * LRU eviction when max cache size is reached.
 */
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

// In-memory cache for idempotent responses
const idempotencyCache = new Map<string, CachedResponse>();

// Track access order for LRU eviction
const accessOrder: string[] = [];

/**
 * Cleanup expired entries every 5 minutes
 */
setInterval(() => {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of idempotencyCache.entries()) {
        if (value.expiresAt <= now) {
            expiredKeys.push(key);
        }
    }

    for (const key of expiredKeys) {
        idempotencyCache.delete(key);
        const index = accessOrder.indexOf(key);
        if (index !== -1) {
            accessOrder.splice(index, 1);
        }
    }

    if (expiredKeys.length > 0) {
        console.info(`[Idempotency] Cleaned up ${expiredKeys.length} expired entries`);
    }
}, 5 * 60_000);

/**
 * Evict oldest entry using LRU policy
 */
function evictOldest() {
    if (accessOrder.length === 0) return;

    const oldestKey = accessOrder.shift();
    if (oldestKey) {
        idempotencyCache.delete(oldestKey);
    }
}

/**
 * Update access order for LRU tracking
 */
function updateAccessOrder(key: string) {
    const index = accessOrder.indexOf(key);
    if (index !== -1) {
        accessOrder.splice(index, 1);
    }
    accessOrder.push(key);
}

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
        const cached = idempotencyCache.get(cacheKey);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            // Return cached response
            updateAccessOrder(cacheKey);

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

                // Check if we need to evict
                if (idempotencyCache.size >= MAX_CACHE_SIZE) {
                    evictOldest();
                }

                // Store in cache
                const cachedResponse: CachedResponse = {
                    status,
                    headers,
                    body,
                    timestamp: now,
                    expiresAt: now + TTL_MS,
                };

                idempotencyCache.set(cacheKey, cachedResponse);
                updateAccessOrder(cacheKey);
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
    const now = Date.now();
    let expired = 0;

    for (const entry of idempotencyCache.values()) {
        if (entry.expiresAt <= now) {
            expired++;
        }
    }

    return {
        size: idempotencyCache.size,
        maxSize: MAX_CACHE_SIZE,
        expired,
        active: idempotencyCache.size - expired,
        utilization: (idempotencyCache.size / MAX_CACHE_SIZE) * 100,
    };
}

/**
 * Clear cache (for testing)
 */
export function clearIdempotencyCache_forTesting() {
    idempotencyCache.clear();
    accessOrder.length = 0;
}

/**
 * Get cache entry (for testing)
 */
export function getCacheEntry_forTesting(key: string) {
    return idempotencyCache.get(key);
}

export default idempotency;
