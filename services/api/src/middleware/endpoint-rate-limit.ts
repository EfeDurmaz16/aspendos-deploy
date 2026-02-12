/**
 * Per-Endpoint Rate Limiting Middleware
 * Different rate limits for different endpoint patterns.
 *
 * Uses sliding window counter with in-memory storage.
 * Key: userId + endpoint pattern
 */
import type { Context, Next } from 'hono';

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

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt <= now && (!entry.hourlyResetAt || entry.hourlyResetAt <= now)) {
            rateLimitStore.delete(key);
        }
    }
}, 60_000);

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

/**
 * Get rate limit entry for a key
 */
function getRateLimitEntry(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
        entry = {
            count: 0,
            resetAt: now + windowMs,
        };
        rateLimitStore.set(key, entry);
    }

    return entry;
}

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

        // Create rate limit key
        const minuteKey = `endpoint:${identifier}:${endpointPattern}:minute`;
        const hourKey = `endpoint:${identifier}:${endpointPattern}:hour`;

        const now = Date.now();
        const MINUTE_MS = 60 * 1000;
        const HOUR_MS = 60 * 60 * 1000;

        // Check per-minute limit
        const minuteEntry = getRateLimitEntry(minuteKey, MINUTE_MS);

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
            const hourEntry = getRateLimitEntry(hourKey, HOUR_MS);

            if (hourEntry.count >= limits.requestsPerHour) {
                const retryAfter = Math.ceil((hourEntry.resetAt - now) / 1000);

                c.header('X-RateLimit-Limit-Hourly', String(limits.requestsPerHour));
                c.header('X-RateLimit-Remaining-Hourly', '0');
                c.header('X-RateLimit-Reset', String(Math.floor(hourEntry.resetAt / 1000)));
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
            hourEntry.count += 1;
        }

        // Increment minute counter
        minuteEntry.count += 1;

        // Set response headers
        c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
        c.header('X-RateLimit-Remaining', String(limits.requestsPerMinute - minuteEntry.count));
        c.header('X-RateLimit-Reset', String(Math.floor(minuteEntry.resetAt / 1000)));

        if (limits.requestsPerHour) {
            const hourEntry = rateLimitStore.get(hourKey);
            if (hourEntry) {
                c.header('X-RateLimit-Limit-Hourly', String(limits.requestsPerHour));
                c.header(
                    'X-RateLimit-Remaining-Hourly',
                    String(limits.requestsPerHour - hourEntry.count)
                );
            }
        }

        await next();
    };
}

/**
 * Get current rate limit status for testing
 */
export function getRateLimitEntry_forTesting(key: string) {
    return rateLimitStore.get(key);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearRateLimits_forTesting() {
    rateLimitStore.clear();
}

export default endpointRateLimit;
