/**
 * Rate Limiting Middleware
 * Token bucket algorithm with tier-based limits.
 */
import { Context, Next } from 'hono';

// Rate limit configuration per tier
const TIER_LIMITS = {
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
}

const rateLimitStore = new Map<string, RateLimitState>();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    for (const [key, state] of rateLimitStore) {
        if (state.lastRefill < oneDayAgo) {
            rateLimitStore.delete(key);
        }
    }
}, 60 * 60 * 1000); // Clean every hour

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

    return state;
}

/**
 * Rate limit middleware
 */
export function rateLimit() {
    return async (c: Context, next: Next) => {
        const userId = c.get('userId');

        // Skip rate limiting for unauthenticated requests
        if (!userId) {
            await next();
            return;
        }

        // Get user tier (default to STARTER)
        const user = c.get('user');
        const tier: UserTier =
            ((user as unknown as Record<string, unknown>)?.tier as UserTier) || 'STARTER';

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

        // Set rate limit headers
        c.header('X-RateLimit-Limit', String(limits.requestsPerMinute));
        c.header('X-RateLimit-Remaining', String(Math.floor(state.tokens)));
        c.header('X-RateLimit-Daily-Remaining', String(limits.requestsPerDay - state.requestsToday));

        await next();
    };
}

/**
 * Get rate limit status for a user
 */
export function getRateLimitStatus(userId: string, tier: UserTier = 'STARTER') {
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
