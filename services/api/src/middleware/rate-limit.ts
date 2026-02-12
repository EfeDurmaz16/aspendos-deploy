/**
 * Rate Limiting Middleware
 * Token bucket algorithm with tier-based limits.
 *
 * PRODUCTION TODO: Replace with Redis-based rate limiting (@upstash/ratelimit or ioredis)
 * Current implementation uses in-memory Map which will not scale across multiple instances.
 */
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

// In-memory store for rate limiting (use Redis in production)
interface RateLimitState {
    tokens: number;
    lastRefill: number;
    requestsToday: number;
    lastReset: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitState>();

// Abuse detection: track velocity of account activity
const abuseTracker = new Map<
    string,
    {
        firstSeenAt: number;
        requestCount: number;
        burstCount: number; // requests within 5 seconds
        lastRequestAt: number;
        flagged: boolean;
    }
>();

// Clean up abuse tracker every 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour
    for (const [key, state] of abuseTracker.entries()) {
        if (state.lastRequestAt < cutoff) abuseTracker.delete(key);
    }
}, 5 * 60_000);

// Log warning about in-memory rate limiting on startup
console.warn(
    '⚠️  WARNING: Using in-memory rate limiting. This will NOT work correctly across multiple instances.'
);
console.warn(
    '   For production, implement Redis-based rate limiting (@upstash/ratelimit or ioredis).'
);

// Clean up expired entries every 60 seconds to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [key, state] of rateLimitStore.entries()) {
        // Remove entries that haven't been accessed in over 2 days
        if (now - state.resetTime > 2 * 24 * 60 * 60 * 1000) {
            rateLimitStore.delete(key);
        }
    }
}, 60_000);

/**
 * Get or create rate limit state for a user
 */
function getRateLimitState(userId: string, tier: UserTier): RateLimitState {
    const key = `${userId}:${tier}`;
    const now = Date.now();
    const limits = TIER_LIMITS[tier];

    let state = rateLimitStore.get(key);

    if (!state) {
        state = {
            tokens: limits.requestsPerMinute,
            lastRefill: now,
            requestsToday: 0,
            lastReset: now,
            resetTime: now,
        };
        rateLimitStore.set(key, state);
        return state;
    }

    // Check if we need to reset daily counter
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    if (state.lastReset < startOfToday) {
        state.requestsToday = 0;
        state.lastReset = now;
    }

    // Refill tokens based on time elapsed
    const elapsed = now - state.lastRefill;
    const refillRate = limits.requestsPerMinute / 60000; // tokens per ms
    const tokensToAdd = elapsed * refillRate;

    state.tokens = Math.min(limits.requestsPerMinute, state.tokens + tokensToAdd);
    state.lastRefill = now;
    state.resetTime = now;

    return state;
}

/**
 * Rate limit middleware
 */
export function rateLimit() {
    return async (c: Context, next: Next) => {
        const userId = c.get('userId');

        // IP-based rate limiting for unauthenticated requests
        if (!userId) {
            const ip =
                c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
                c.req.header('cf-connecting-ip') ||
                'unknown';
            const ipState = getRateLimitState(`ip:${ip}`, 'FREE');
            const ipLimits = TIER_LIMITS.FREE;

            if (ipState.requestsToday >= ipLimits.requestsPerDay) {
                return c.json({ error: 'Rate limit exceeded' }, 429);
            }
            if (ipState.tokens < 1) {
                return c.json({ error: 'Rate limit exceeded' }, 429);
            }

            ipState.tokens -= 1;
            ipState.requestsToday += 1;
            await next();
            return;
        }

        // Get user tier (default to FREE, validate against known tiers)
        const user = c.get('user');
        const rawTier = (user as unknown as Record<string, unknown>)?.tier;
        const VALID_TIERS = new Set<string>(['FREE', 'STARTER', 'PRO', 'ULTRA']);
        const tier: UserTier =
            typeof rawTier === 'string' && VALID_TIERS.has(rawTier)
                ? (rawTier as UserTier)
                : 'FREE';

        const limits = TIER_LIMITS[tier];
        const state = getRateLimitState(userId, tier);

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

        // Check per-minute limit (token bucket)
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

        // Consume a token
        state.tokens -= 1;
        state.requestsToday += 1;

        // Abuse detection for FREE tier
        if (tier === 'FREE') {
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

            // Detect burst: >5 requests within 5 seconds
            if (now - abuse.lastRequestAt < 5000) {
                abuse.burstCount++;
            } else {
                abuse.burstCount = 0;
            }
            abuse.lastRequestAt = now;

            // Flag if: burst of 10+ rapid requests OR 50+ requests in first 10 minutes
            const minutesSinceFirstSeen = (now - abuse.firstSeenAt) / 60000;
            if (abuse.burstCount >= 10 || (minutesSinceFirstSeen < 10 && abuse.requestCount > 50)) {
                abuse.flagged = true;
                console.warn(
                    `[Abuse] FREE tier user ${userId} flagged: burst=${abuse.burstCount}, total=${abuse.requestCount}, minutes=${Math.round(minutesSinceFirstSeen)}`
                );
            }

            // Progressive throttle: flagged users get 2x slower rate limit refill
            if (abuse.flagged) {
                state.tokens = Math.max(0, state.tokens - 0.5); // Extra token penalty
                c.header('X-Abuse-Warning', 'Rate throttled due to unusual activity patterns');
            }
        }

        // Set rate limit headers
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
export function getRateLimitStatus(userId: string, tier: UserTier = 'FREE') {
    const limits = TIER_LIMITS[tier];
    const state = getRateLimitState(userId, tier);

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
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
    };
}

export default rateLimit;
