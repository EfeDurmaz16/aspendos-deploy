import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (_stripe) return _stripe;
    if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        typescript: true,
    });
    return _stripe;
}

/** @deprecated Use getStripe() for lazy init */
export const stripe = new Proxy({} as Stripe, {
    get(_, prop) {
        return (getStripe() as any)[prop];
    },
});

/**
 * Tier slug -> Stripe price lookup key mapping.
 * These lookup keys must match the prices created in Stripe Dashboard or via the seed script.
 * Format: {slug}_{interval} e.g. "personal_monthly", "pro_annual"
 */
export const TIER_PRICE_LOOKUP_KEYS: Record<string, string> = {
    personal: 'personal_monthly',
    pro: 'pro_monthly',
    pro_byok: 'pro_byok_monthly',
    team: 'team_monthly',
    team_byok: 'team_byok_monthly',
};

export type TierSlug = 'personal' | 'pro' | 'pro_byok' | 'team' | 'team_byok';

export const TIER_CONFIG: Record<
    TierSlug,
    {
        name: string;
        monthlyPriceCents: number;
        isPerSeat: boolean;
        isByok: boolean;
    }
> = {
    personal: {
        name: 'Personal',
        monthlyPriceCents: 2500,
        isPerSeat: false,
        isByok: false,
    },
    pro: {
        name: 'Pro',
        monthlyPriceCents: 6000,
        isPerSeat: false,
        isByok: false,
    },
    pro_byok: {
        name: 'Pro BYOK',
        monthlyPriceCents: 3000,
        isPerSeat: false,
        isByok: true,
    },
    team: {
        name: 'Team',
        monthlyPriceCents: 18000,
        isPerSeat: true,
        isByok: false,
    },
    team_byok: {
        name: 'Team BYOK',
        monthlyPriceCents: 10000,
        isPerSeat: true,
        isByok: true,
    },
};

export type BillingInterval = 'weekly' | 'monthly' | 'annual';

/**
 * Resolve a Stripe Price ID from a tier slug and billing interval.
 * Uses lookup_key for portability — prices are identified by lookup key, not hardcoded IDs.
 */
export async function resolvePriceId(
    slug: TierSlug,
    interval: BillingInterval = 'monthly'
): Promise<string> {
    const lookupKey = `${slug}_${interval}`;

    const prices = await getStripe().prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
    });

    if (prices.data.length === 0) {
        throw new Error(
            `No active Stripe price found for lookup key "${lookupKey}". ` +
                `Run: STRIPE_SECRET_KEY=... bun run scripts/seed-stripe-prices.ts`
        );
    }

    return prices.data[0].id;
}

/**
 * Get or create a Stripe customer for a user.
 */
export async function getOrCreateCustomer(opts: {
    email: string;
    name?: string;
    workosId: string;
    existingCustomerId?: string;
}): Promise<string> {
    if (opts.existingCustomerId) {
        // Verify the customer still exists
        try {
            const customer = await getStripe().customers.retrieve(opts.existingCustomerId);
            if (!customer.deleted) {
                return customer.id;
            }
        } catch {
            // Customer was deleted or doesn't exist, create a new one
        }
    }

    const customer = await getStripe().customers.create({
        email: opts.email,
        name: opts.name,
        metadata: {
            workos_id: opts.workosId,
        },
    });

    return customer.id;
}
