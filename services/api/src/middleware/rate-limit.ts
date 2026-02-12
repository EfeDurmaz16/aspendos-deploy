/**
 * Rate Limiting Middleware
 * Token bucket algorithm with tier-based limits.
 *
 * Uses Upstash Redis for distributed rate limiting across multiple instances.
 * Falls back to in-memory rate limiting if Redis is not configured.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { Context, Next } from 'hono';

// Rate limit configuration per tier
const TIER_LIMITS = {
    FREE: {
        requestsPerMinute: 10,
        requestsPerDay: 100,
        tokensPerDay: 10000,
    },
    STARTER: {
        requestsPerMinute: 20,
        requestsPerDay: 500,
        tokensPerDay: 50000,
    },
    PRO: {
        requestsPerMinute: 60,
        requestsPerDay: 2000,
        tokensPerDay: 500000,
    },
    ULTRA: {
        requestsPerMinute: 120,
        requestsPerDay: 10000,
        tokensPerDay: 2000000,
    },
} as const;

type UserTier = keyof typeof TIER_LIMITS;

// Initialize Redis client (optional - falls back to in-memory if not configured)
const redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? new Redis({
              url: process.env.UPSTASH_REDIS_REST_URL,
              token: process.env.UPSTASH_REDIS_REST_TOKEN,
          })
        : null;

const isRedisEnabled = redis !== null;

if (isRedisEnabled) {
    console.info('✅ Rate limiting: Upstash Redis (distributed, production-ready)');
} else {
    console.warn(
        '⚠️  Rate limiting: In-memory fallback. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.'
    );
}

// Create Upstash rate limiters per tier (per-minute sliding window)
const minuteLimiters = isRedisEnabled
    ? Object.fromEntries(
          Object.entries(TIER_LIMITS).map(([tier, limits]) => [
              tier,
              new Ratelimit({
                  redis: redis!,
                  limiter: Ratelimit.slidingWindow(limits.requestsPerMinute, '1 m'),
                  prefix: `rl:min:${tier.toLowerCase()}`,
              }),
          ])
      )
    : null;

// Create Upstash rate limiters per tier (daily fixed window)
const dailyLimiters = isRedisEnabled
    ? Object.fromEntries(
          Object.entries(TIER_LIMITS).map(([tier, limits]) => [
              tier,
              new Ratelimit({
                  redis: redis!,
                  limiter: Ratelimit.fixedWindow(limits.requestsPerDay, '1 d'),
                  prefix: `rl:day:${tier.toLowerCase()}`,
              }),
          ])
      )
    : null;

// ─── In-Memory Fallback (for development / single-instance) ──────────────────

interface RateLimitState {
    tokens: number;
    lastRefill: number;
    requestsToday: number;
    lastReset: number;
    resetTime: number;
}

const fallbackStore = new Map<string, RateLimitState>();

// Abuse detection: track velocity of free-tier activity
const abuseTracker = new Map<
    string,
    {
        firstSeenAt: number;
        requestCount: number;
        burstCount: number;
        lastRequestAt: number;
        flagged: boolean;
    }
>();

// Periodic cleanup for fallback store
setInterval(() => {
    const now = Date.now();
    for (const [key, state] of fallbackStore.entries()) {
        if (now - state.resetTime > 2 * 24 * 60 * 60 * 1000) {
            fallbackStore.delete(key);
        }
    }
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [key, state] of abuseTracker.entries()) {
        if (state.lastRequestAt < cutoff) abuseTracker.delete(key);
    }
}, 60_000);

function getFallbackState(userId: string, tier: UserTier): RateLimitState {
    const key = `${userId}:${tier}`;
    const now = Date.now();
    const limits = TIER_LIMITS[tier];

    let state = fallbackStore.get(key);

    if (!state) {
        state = {
            tokens: limits.requestsPerMinute,
            lastRefill: now,
            requestsToday: 0,
            lastReset: now,
            resetTime: now,
        };
        fallbackStore.set(key, state);
        return state;
    }

    const startOfToday = new Date().setHours(0, 0, 0, 0);
    if (state.lastReset < startOfToday) {
        state.requestsToday = 0;
        state.lastReset = now;
    }

    const elapsed = now - state.lastRefill;
    const refillRate = limits.requestsPerMinute / 60000;
    const tokensToAdd = elapsed * refillRate;
    state.tokens = Math.min(limits.requestsPerMinute, state.tokens + tokensToAdd);
    state.lastRefill = now;
    state.resetTime = now;

    return state;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Rate limit middleware - uses Redis when available, falls back to in-memory
 */
export function rateLimit() {
    return async (c: Context, next: Next) => {
        const path = c.req.path;

        // Skip rate limiting for health/status/docs/metrics endpoints
        if (
            path === '/health' ||
            path === '/status' ||
            path === '/ready' ||
            path === '/metrics' ||
            path.startsWith('/.well-known/') ||
            path.startsWith('/api/docs') ||
            path.startsWith('/api/auth/')
        ) {
            await next();
            return;
        }

        const userId = c.get('userId');

        // Determine identity and tier
        let identifier: string;
        let tier: UserTier;

        if (!userId) {
            const ip =
                c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                c.req.header('cf-connecting-ip') ||
                'unknown';
            identifier = `ip:${ip}`;
            tier = 'FREE';
        } else {
            identifier = userId;
            const user = c.get('user');
            const rawTier = (user as unknown as Record<string, unknown>)?.tier;
            const VALID_TIERS = new Set<string>(['FREE', 'STARTER', 'PRO', 'ULTRA']);
            tier =
                typeof rawTier === 'string' && VALID_TIERS.has(rawTier)
                    ? (rawTier as UserTier)
                    : 'FREE';
        }

        const limits = TIER_LIMITS[tier];

        // ─── Redis Path ─────────────────────────────────────────────
        if (isRedisEnabled && minuteLimiters && dailyLimiters) {
            // Check daily limit first
            const dailyResult = await dailyLimiters[tier].limit(identifier);
            if (!dailyResult.success) {
                c.header('X-RateLimit-Limit', String(limits.requestsPerDay));
                c.header('X-RateLimit-Remaining', String(dailyResult.remaining));
                c.header('X-RateLimit-Reset', String(dailyResult.reset));
                c.header('Retry-After', String(Math.ceil((dailyResult.reset - Date.now()) / 1000)));

                return c.json(
                    {
                        error: 'Daily rate limit exceeded',
                        limit: limits.requestsPerDay,
                        resetAt: new Date(dailyResult.reset).toISOString(),
                    },
                    429
                );
            }

            // Check per-minute limit
            const minuteResult = await minuteLimiters[tier].limit(identifier);
            if (!minuteResult.success) {
                c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
                c.header('X-RateLimit-Remaining', String(minuteResult.remaining));
                c.header(
                    'Retry-After',
                    String(Math.ceil((minuteResult.reset - Date.now()) / 1000))
                );

                return c.json(
                    {
                        error: 'Rate limit exceeded',
                        limit: limits.requestsPerMinute,
                        retryAfter: Math.ceil((minuteResult.reset - Date.now()) / 1000),
                    },
                    429
                );
            }

            // Set headers
            c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
            c.header('X-RateLimit-Remaining', String(minuteResult.remaining));
            c.header('X-RateLimit-Daily-Remaining', String(dailyResult.remaining));

            await next();
            return;
        }

        // ─── In-Memory Fallback Path ────────────────────────────────
        const state = getFallbackState(identifier, tier);

        // Check daily limit
        if (state.requestsToday >= limits.requestsPerDay) {
            c.header('X-RateLimit-Limit', String(limits.requestsPerDay));
            c.header('X-RateLimit-Remaining', '0');
            c.header('X-RateLimit-Reset', String(new Date().setHours(24, 0, 0, 0)));

            return c.json(
                {
                    error: 'Daily rate limit exceeded',
                    limit: limits.requestsPerDay,
                    resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
                },
                429
            );
        }

        // Check per-minute limit
        if (state.tokens < 1) {
            const retryAfter = Math.ceil((1 - state.tokens) / (limits.requestsPerMinute / 60));
            c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
            c.header('X-RateLimit-Remaining', '0');
            c.header('Retry-After', String(retryAfter));

            return c.json(
                {
                    error: 'Rate limit exceeded',
                    limit: limits.requestsPerMinute,
                    retryAfter,
                },
                429
            );
        }

        // Consume
        state.tokens -= 1;
        state.requestsToday += 1;

        // Abuse detection for FREE tier
        if (tier === 'FREE' && userId) {
            const abuseKey = `abuse:${userId}`;
            const now = Date.now();
            let abuse = abuseTracker.get(abuseKey);

            if (!abuse) {
                abuse = {
                    firstSeenAt: now,
                    requestCount: 0,
                    burstCount: 0,
                    lastRequestAt: now,
                    flagged: false,
                };
                abuseTracker.set(abuseKey, abuse);
            }

            abuse.requestCount++;
            if (now - abuse.lastRequestAt < 5000) {
                abuse.burstCount++;
            } else {
                abuse.burstCount = 0;
            }
            abuse.lastRequestAt = now;

            const minutesSinceFirstSeen = (now - abuse.firstSeenAt) / 60000;
            if (abuse.burstCount >= 10 || (minutesSinceFirstSeen < 10 && abuse.requestCount > 50)) {
                abuse.flagged = true;
                console.warn(
                    `[Abuse] FREE tier user ${userId} flagged: burst=${abuse.burstCount}, total=${abuse.requestCount}`
                );
            }

            if (abuse.flagged) {
                state.tokens = Math.max(0, state.tokens - 0.5);
                c.header('X-Abuse-Warning', 'Rate throttled due to unusual activity patterns');
            }
        }

        // Set headers
        c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
        c.header('X-RateLimit-Remaining', String(Math.floor(state.tokens)));
        c.header(
            'X-RateLimit-Daily-Remaining',
            String(limits.requestsPerDay - state.requestsToday)
        );

        await next();
    };
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(userId: string, tier: UserTier = 'FREE') {
    const limits = TIER_LIMITS[tier];

    if (isRedisEnabled && minuteLimiters && dailyLimiters) {
        const [minuteResult, dailyResult] = await Promise.all([
            minuteLimiters[tier].getRemaining(userId),
            dailyLimiters[tier].getRemaining(userId),
        ]);

        return {
            tier,
            limits: {
                requestsPerMinute: limits.requestsPerMinute,
                requestsPerDay: limits.requestsPerDay,
            },
            current: {
                tokensRemaining: minuteResult,
                dailyRemaining: dailyResult,
            },
            backend: 'redis',
        };
    }

    // Fallback
    const state = getFallbackState(userId, tier);
    return {
        tier,
        limits: {
            requestsPerMinute: limits.requestsPerMinute,
            requestsPerDay: limits.requestsPerDay,
        },
        current: {
            tokensRemaining: Math.floor(state.tokens),
            requestsToday: state.requestsToday,
            dailyRemaining: limits.requestsPerDay - state.requestsToday,
        },
        backend: 'memory',
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };
}

/**
 * Clear all rate limits (for testing)
 */
export function clearGlobalRateLimits_forTesting() {
    fallbackStore.clear();
    abuseTracker.clear();
}

export default rateLimit;
