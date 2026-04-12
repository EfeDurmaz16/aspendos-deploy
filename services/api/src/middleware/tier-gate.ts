import type { Context, Next } from 'hono';

export type UserTier = 'free' | 'personal' | 'pro' | 'pro_byok' | 'team' | 'team_byok';

const PRO_PLUS_TIERS: UserTier[] = ['pro', 'pro_byok', 'team', 'team_byok'];

export function isProPlus(tier: UserTier): boolean {
    return PRO_PLUS_TIERS.includes(tier);
}

export function requireProPlus(feature: string) {
    return async (c: Context, next: Next) => {
        const tier = (c.get('userTier') as UserTier) ?? 'free';

        if (!isProPlus(tier)) {
            return c.json(
                {
                    error: 'upgrade_required',
                    message: `${feature} requires a Pro or Team plan.`,
                    upgrade_url: '/pricing',
                },
                403,
            );
        }

        return next();
    };
}

export function requireTier(minTier: UserTier, feature: string) {
    const tierRank: Record<UserTier, number> = {
        free: 0,
        personal: 1,
        pro: 2,
        pro_byok: 2,
        team: 3,
        team_byok: 3,
    };

    return async (c: Context, next: Next) => {
        const tier = (c.get('userTier') as UserTier) ?? 'free';

        if (tierRank[tier] < tierRank[minTier]) {
            return c.json(
                {
                    error: 'upgrade_required',
                    message: `${feature} requires ${minTier} plan or higher.`,
                    upgrade_url: '/pricing',
                },
                403,
            );
        }

        return next();
    };
}
