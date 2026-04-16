/**
 * Seed Stripe with YULA OS products and prices.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... bun run scripts/seed-stripe-prices.ts
 *
 * This creates products + monthly recurring prices with lookup_keys that the
 * checkout route resolves at runtime. Safe to run multiple times — it checks
 * for existing prices by lookup_key before creating.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
    console.error('Set STRIPE_SECRET_KEY env var');
    process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { typescript: true });

interface TierDef {
    slug: string;
    name: string;
    description: string;
    monthlyPriceCents: number;
    isPerSeat: boolean;
}

const TIERS: TierDef[] = [
    {
        slug: 'personal',
        name: 'Yula Personal',
        description: 'For individuals getting started with AI',
        monthlyPriceCents: 2500,
        isPerSeat: false,
    },
    {
        slug: 'pro',
        name: 'Yula Pro',
        description: 'For power users who need agent capabilities',
        monthlyPriceCents: 6000,
        isPerSeat: false,
    },
    {
        slug: 'pro_byok',
        name: 'Yula Pro BYOK',
        description: 'Pro features with your own API keys',
        monthlyPriceCents: 3000,
        isPerSeat: false,
    },
    {
        slug: 'team',
        name: 'Yula Team',
        description: 'For teams that need shared governance',
        monthlyPriceCents: 18000,
        isPerSeat: true,
    },
    {
        slug: 'team_byok',
        name: 'Yula Team BYOK',
        description: 'Team features with your own API keys',
        monthlyPriceCents: 10000,
        isPerSeat: true,
    },
];

async function main() {
    console.log('Seeding Stripe products and prices...\n');

    for (const tier of TIERS) {
        const lookupKey = `${tier.slug}_monthly`;

        // Check if a price with this lookup_key already exists
        const existing = await stripe.prices.list({
            lookup_keys: [lookupKey],
            active: true,
            limit: 1,
        });

        if (existing.data.length > 0) {
            console.log(`[skip] ${tier.name} — price already exists (${existing.data[0].id})`);
            continue;
        }

        // Create product
        const product = await stripe.products.create({
            name: tier.name,
            description: tier.description,
            metadata: {
                tier: tier.slug,
                is_per_seat: tier.isPerSeat ? 'true' : 'false',
            },
        });

        // Create monthly recurring price with lookup_key
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: tier.monthlyPriceCents,
            currency: 'usd',
            recurring: { interval: 'month' },
            lookup_key: lookupKey,
            transfer_lookup_key: true,
            metadata: {
                tier: tier.slug,
            },
        });

        console.log(
            `[created] ${tier.name} — product: ${product.id}, price: ${price.id} ($${(tier.monthlyPriceCents / 100).toFixed(2)}/mo)`
        );
    }

    console.log('\nDone. Prices are identified by lookup_key at runtime.');
    console.log('Lookup keys:', TIERS.map((t) => `${t.slug}_monthly`).join(', '));
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
