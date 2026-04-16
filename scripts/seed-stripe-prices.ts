/**
 * Seed Stripe with YULA OS products and prices (weekly, monthly, annual).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... bun run scripts/seed-stripe-prices.ts
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
    prices: {
        weekly: number;
        monthly: number;
        annual: number;
    };
    isPerSeat: boolean;
}

const TIERS: TierDef[] = [
    {
        slug: 'personal',
        name: 'Yula Personal',
        description: 'For individuals getting started with AI',
        prices: { weekly: 700, monthly: 2500, annual: 24000 },
        isPerSeat: false,
    },
    {
        slug: 'pro',
        name: 'Yula Pro',
        description: 'For power users who need agent capabilities',
        prices: { weekly: 1700, monthly: 6000, annual: 57600 },
        isPerSeat: false,
    },
    {
        slug: 'pro_byok',
        name: 'Yula Pro BYOK',
        description: 'Pro features with your own API keys',
        prices: { weekly: 900, monthly: 3000, annual: 28800 },
        isPerSeat: false,
    },
    {
        slug: 'team',
        name: 'Yula Team',
        description: 'For teams that need shared governance',
        prices: { weekly: 5000, monthly: 18000, annual: 172800 },
        isPerSeat: true,
    },
    {
        slug: 'team_byok',
        name: 'Yula Team BYOK',
        description: 'Team features with your own API keys',
        prices: { weekly: 2800, monthly: 10000, annual: 96000 },
        isPerSeat: true,
    },
];

const INTERVALS: { key: 'weekly' | 'monthly' | 'annual'; stripe: 'week' | 'month' | 'year' }[] = [
    { key: 'weekly', stripe: 'week' },
    { key: 'monthly', stripe: 'month' },
    { key: 'annual', stripe: 'year' },
];

async function main() {
    console.log('Seeding Stripe products and prices (weekly + monthly + annual)...\n');

    for (const tier of TIERS) {
        // Find or create product
        let productId: string;
        const existingMonthly = await stripe.prices.list({
            lookup_keys: [`${tier.slug}_monthly`],
            active: true,
            limit: 1,
        });

        if (existingMonthly.data.length > 0) {
            productId = existingMonthly.data[0].product as string;
            console.log(`[exists] ${tier.name} — product: ${productId}`);
        } else {
            const product = await stripe.products.create({
                name: tier.name,
                description: tier.description,
                metadata: {
                    tier: tier.slug,
                    is_per_seat: tier.isPerSeat ? 'true' : 'false',
                },
            });
            productId = product.id;
            console.log(`[created] ${tier.name} — product: ${productId}`);
        }

        // Create prices for each interval
        for (const interval of INTERVALS) {
            const lookupKey = `${tier.slug}_${interval.key}`;
            const existing = await stripe.prices.list({
                lookup_keys: [lookupKey],
                active: true,
                limit: 1,
            });

            if (existing.data.length > 0) {
                console.log(`  [skip] ${lookupKey} — already exists (${existing.data[0].id})`);
                continue;
            }

            const cents = tier.prices[interval.key];
            const price = await stripe.prices.create({
                product: productId,
                unit_amount: cents,
                currency: 'usd',
                recurring: { interval: interval.stripe },
                lookup_key: lookupKey,
                transfer_lookup_key: true,
                metadata: { tier: tier.slug, interval: interval.key },
            });

            const display =
                interval.key === 'annual'
                    ? `$${(cents / 100).toFixed(2)}/yr`
                    : interval.key === 'weekly'
                      ? `$${(cents / 100).toFixed(2)}/wk`
                      : `$${(cents / 100).toFixed(2)}/mo`;

            console.log(`  [created] ${lookupKey} — ${price.id} (${display})`);
        }
    }

    console.log('\nDone.');
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
