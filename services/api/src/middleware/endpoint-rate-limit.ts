/**
 * Per-Endpoint Rate Limiting Middleware
 * Different rate limits for different endpoint patterns.
 *
 * Uses Redis (Upstash) in production for multi-instance consistency.
 * Falls back to in-memory Map for development.
 */
import type { Context, Next } from 'hono';
import { Redis } from '@upstash/redis';

// Rate limit configuration per endpoint pattern
const ENDPOINT_LIMITS: Record<string, { requestsPerMinute: number; requestsPerHour?: number }> = {
    'POST /api/chat': { requestsPerMinute: 20 },
    'POST /api/memory': { requestsPerMinute: 30 },
    'POST /api/memory/search': { requestsPerMinute: 60 },
    'POST /api/council': { requestsPerMinute: 10 },
    'POST /api/import/*': { requestsPerMinute: 5 },
    'POST /api/account/delete': { requestsPerMinute: 1, requestsPerHour: 1 },
    'GET /api/*': { requestsPerMinute: 120 },
    DEFAULT: { requestsPerMinute: 60 },
};

interface RateLimitEntry {
    count: number;
    resetAt: number;
    hourlyCount?: number;
    hourlyResetAt?: number;
}

// ============================================
// STORE ABSTRACTION
// ============================================

interface RateLimitStore {
    get(key: string): Promise<RateLimitEntry | null>;
    set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>;
}

/** In-memory store for development */
class InMemoryStore implements RateLimitStore {
    private store = new Map<string, RateLimitEntry>();

    constructor() {
        // Cleanup expired entries every 60 seconds
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.store.entries()) {
                if (entry.resetAt <= now && (!entry.hourlyResetAt || entry.hourlyResetAt <= now)) {
                    this.store.delete(key);
                }
            }
        }, 60_000);
    }

    async get(key: string): Promise<RateLimitEntry | null> {
        return this.store.get(key) || null;
    }

    async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
        this.store.set(key, entry);
    }
}

/** Redis store for production (multi-instance safe) */
class RedisStore implements RateLimitStore {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    async get(key: string): Promise<RateLimitEntry | null> {
        const data = await this.redis.get<RateLimitEntry>(key);
        return data || null;
    }

    async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
        const ttlSeconds = Math.ceil(ttlMs / 1000);
        await this.redis.set(key, entry, { ex: ttlSeconds });
    }
}

// Initialize store based on environment
function createStore(): RateLimitStore {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
        try {
            const redis = new Redis({ url: redisUrl, token: redisToken });
            console.log('[RateLimit] Endpoint rate limiting using Redis store');
            return new RedisStore(redis);
        } catch (err) {
            console.error('[RateLimit] Failed to initialize Redis, falling back to in-memory:', err);
        }
    }

    if (process.env.NODE_ENV === 'production') {
        console.warn(
            '[RateLimit] Endpoint rate limiting: in-memory store in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for multi-instance support.'
        );
    }
    return new InMemoryStore();
}

const store = createStore();

/**
 * Match endpoint pattern to rate limit configuration
 */
function matchEndpointPattern(method: string, path: string): string {
    const normalizedPath = path.split('?')[0]; // Remove query params

    // Try exact match first
    const exactKey = `${method} ${normalizedPath}`;
    if (ENDPOINT_LIMITS[exactKey]) {
        return exactKey;
    }

    // Try wildcard matches
    for (const [pattern] of Object.entries(ENDPOINT_LIMITS)) {
        if (pattern === 'DEFAULT') continue;

        const [patternMethod, patternPath] = pattern.split(' ');
        if (patternMethod !== method) continue;

        // Handle wildcard patterns
        if (patternPath.endsWith('/*')) {
            const prefix = patternPath.slice(0, -2);
            if (normalizedPath.startsWith(prefix)) {
                return pattern;
            }
        }
    }

    // Default GET pattern
    if (method === 'GET' && ENDPOINT_LIMITS['GET /api/*']) {
        if (normalizedPath.startsWith('/api/')) {
            return 'GET /api/*';
        }
    }

    return 'DEFAULT';
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Per-endpoint rate limiting middleware
 */
export function endpointRateLimit() {
    return async (c: Context, next: Next) => {
        const userId = c.get('userId');
        const method = c.req.method;
        const path = c.req.path;

        // Skip rate limiting for health checks and public endpoints
        if (
            path === '/health' ||
            path === '/status' ||
            path === '/ready' ||
            path === '/metrics' ||
            path.startsWith('/.well-known/') ||
            path.startsWith('/api/auth/') ||
            path.startsWith('/api/docs')
        ) {
            await next();
            return;
        }

        // Determine identity
        const identifier =
            userId || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

        // Match endpoint pattern
        const endpointPattern = matchEndpointPattern(method, path);
        const limits = ENDPOINT_LIMITS[endpointPattern] || ENDPOINT_LIMITS.DEFAULT;

        // Create rate limit keys
        const minuteKey = `eprl:${identifier}:${endpointPattern}:m`;
        const now = Date.now();

        // Check per-minute limit
        let minuteEntry = await store.get(minuteKey);
        if (!minuteEntry || minuteEntry.resetAt <= now) {
            minuteEntry = { count: 0, resetAt: now + MINUTE_MS };
        }

        if (minuteEntry.count >= limits.requestsPerMinute) {
            const retryAfter = Math.ceil((minuteEntry.resetAt - now) / 1000);

            c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
            c.header('X-RateLimit-Remaining', '0');
            c.header('X-RateLimit-Reset', String(Math.floor(minuteEntry.resetAt / 1000)));
            c.header('Retry-After', String(retryAfter));

            return c.json(
                {
                    error: 'Rate limit exceeded for this endpoint',
                    endpoint: endpointPattern,
                    limit: limits.requestsPerMinute,
                    window: '1 minute',
                    retryAfter,
                },
                429
            );
        }

        // Check per-hour limit if configured
        if (limits.requestsPerHour) {
            const hourKey = `eprl:${identifier}:${endpointPattern}:h`;
            let hourEntry = await store.get(hourKey);
            if (!hourEntry || (hourEntry.hourlyResetAt && hourEntry.hourlyResetAt <= now)) {
                hourEntry = { count: 0, resetAt: now + HOUR_MS, hourlyResetAt: now + HOUR_MS };
            }

            if ((hourEntry.hourlyCount ?? hourEntry.count) >= limits.requestsPerHour) {
                const resetAt = hourEntry.hourlyResetAt || hourEntry.resetAt;
                const retryAfter = Math.ceil((resetAt - now) / 1000);

                c.header('X-RateLimit-Limit-Hourly', String(limits.requestsPerHour));
                c.header('X-RateLimit-Remaining-Hourly', '0');
                c.header('X-RateLimit-Reset', String(Math.floor(resetAt / 1000)));
                c.header('Retry-After', String(retryAfter));

                return c.json(
                    {
                        error: 'Hourly rate limit exceeded for this endpoint',
                        endpoint: endpointPattern,
                        limit: limits.requestsPerHour,
                        window: '1 hour',
                        retryAfter,
                    },
                    429
                );
            }

            // Increment hour counter
            hourEntry.count = (hourEntry.hourlyCount ?? hourEntry.count) + 1;
            hourEntry.hourlyCount = hourEntry.count;
            await store.set(hourKey, hourEntry, HOUR_MS);
        }

        // Increment minute counter
        minuteEntry.count += 1;
        await store.set(minuteKey, minuteEntry, MINUTE_MS);

        // Set response headers
        c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
        c.header('X-RateLimit-Remaining', String(limits.requestsPerMinute - minuteEntry.count));
        c.header('X-RateLimit-Reset', String(Math.floor(minuteEntry.resetAt / 1000)));

        if (limits.requestsPerHour) {
            const hourKey = `eprl:${identifier}:${endpointPattern}:h`;
            const hourEntry = await store.get(hourKey);
            if (hourEntry) {
                c.header('X-RateLimit-Limit-Hourly', String(limits.requestsPerHour));
                c.header(
                    'X-RateLimit-Remaining-Hourly',
                    String(limits.requestsPerHour - (hourEntry.hourlyCount ?? hourEntry.count))
                );
            }
        }

        await next();
    };
}

/**
 * Get current rate limit status for testing
 */
export async function getRateLimitEntry_forTesting(key: string) {
    return store.get(key);
}

/**
 * Clear all rate limits (for testing) — only works with in-memory store
 */
export function clearRateLimits_forTesting() {
    // Only meaningful for in-memory store in tests
    if (store instanceof InMemoryStore) {
        (store as unknown as { store: Map<string, unknown> }).store?.clear();
    }
}

export default endpointRateLimit;
