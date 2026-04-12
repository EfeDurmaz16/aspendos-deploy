export const STRIPE_CATALOG = {
    personal: {
        productId: 'prod_UK1hv3J15EvKz3',
        priceId: 'price_1TLNeNQc1fanBcXKqArO5ggp',
        name: 'YULA Personal',
        amount: 2500,
        tier: 'personal' as const,
    },
    pro: {
        productId: 'prod_UK1iYUYb3mWy63',
        priceId: 'price_1TLNecQc1fanBcXKBvmmTaBU',
        name: 'YULA Pro',
        amount: 6000,
        tier: 'pro' as const,
    },
    pro_byok: {
        productId: 'prod_UK1iSQogE3qMzq',
        priceId: 'price_1TLNedQc1fanBcXKjVBFkXvo',
        name: 'YULA Pro BYOK',
        amount: 3000,
        tier: 'pro_byok' as const,
    },
    team: {
        productId: 'prod_UK1i5Nn3bxrclM',
        priceId: 'price_1TLNefQc1fanBcXKJvar0wru',
        name: 'YULA Team',
        amount: 18000,
        tier: 'team' as const,
    },
    team_byok: {
        productId: 'prod_UK1iicf3T8WvrO',
        priceId: 'price_1TLNegQc1fanBcXKN1zjqJyK',
        name: 'YULA Team BYOK',
        amount: 10000,
        tier: 'team_byok' as const,
    },
} as const;

export type StripeTier = keyof typeof STRIPE_CATALOG;

export function getCatalogEntry(tier: StripeTier) {
    return STRIPE_CATALOG[tier];
}
