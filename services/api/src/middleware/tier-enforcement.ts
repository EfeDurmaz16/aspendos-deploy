/**
 * Tier Enforcement Middleware
 *
 * Checks the user's subscription tier and blocks access to features
 * that are not available on their plan. Returns 403 with an upgrade
 * prompt when a feature's limit is 0 or its boolean flag is false.
 */
import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { getLimit, hasFeature, type TierConfig, type TierName } from '../config/tiers';

/**
 * Resolve the user's tier from the Prisma database.
 * Falls back to 'FREE' if the user record cannot be found.
 */
async function resolveUserTier(userId: string): Promise<TierName> {
    try {
        const { prisma } = await import('../lib/prisma');
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { tier: true },
        });
        return (user?.tier as TierName) ?? 'FREE';
    } catch {
        // If the database lookup fails, default to the most restrictive tier
        return 'FREE';
    }
}

/**
 * Returns a Hono middleware that enforces tier-based access for a given feature.
 *
 * The `feature` parameter must match a key on `TierConfig` (the tier
 * configuration object). The middleware inspects the value type:
 *   - boolean  -> blocks when `false`
 *   - number   -> blocks when `0`
 *   - string   -> always allows (non-empty config value)
 *
 * Usage:
 * ```ts
 * app.post('/consolidate', enforceTierLimit('memoryInspector'), handler);
 * app.post('/jobs', enforceTierLimit('monthlyChats'), handler);
 * ```
 */
export function enforceTierLimit(feature: keyof TierConfig) {
    return createMiddleware(async (c: Context, next: Next) => {
        const userId = c.get('userId') as string | null;

        if (!userId) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const tier = await resolveUserTier(userId);

        // For numeric limits use getLimit; for booleans use hasFeature
        const numericValue = getLimit(tier, feature);
        const booleanValue = hasFeature(tier, feature);

        // A feature is blocked when its numeric limit is 0 AND its boolean
        // check also returns false.  This covers both types cleanly:
        //   - number fields: getLimit returns 0 -> blocked
        //   - boolean fields: hasFeature returns false -> blocked
        //   - string fields: hasFeature returns true (truthy) -> allowed
        if (numericValue === 0 && !booleanValue) {
            return c.json(
                {
                    error: 'Feature not available on your plan',
                    upgradeRequired: true,
                    feature,
                    currentTier: tier,
                },
                403
            );
        }

        await next();
    });
}
