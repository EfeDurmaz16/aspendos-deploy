export const STRIPE_PRODUCTS = {
    personal: { name: 'YULA Personal', price_cents: 2500 },
    pro: { name: 'YULA Pro', price_cents: 6000 },
    pro_byok: { name: 'YULA Pro BYOK', price_cents: 3000 },
    team: { name: 'YULA Team', price_cents: 18000 },
    team_byok: { name: 'YULA Team BYOK', price_cents: 10000 },
} as const;

export type StripeTier = keyof typeof STRIPE_PRODUCTS;

function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
    // Dynamic import to avoid requiring stripe at module load
    return import('stripe').then((m) => new m.default(key));
}

export async function createCheckoutSession(
    customerEmail: string,
    tier: StripeTier,
    successUrl: string,
    cancelUrl: string,
): Promise<{ url: string }> {
    const stripe = await getStripe();
    const product = STRIPE_PRODUCTS[tier];

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: customerEmail,
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    recurring: { interval: 'month' },
                    unit_amount: product.price_cents,
                    product_data: { name: product.name },
                },
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { tier },
    });

    return { url: session.url! };
}

export async function createPortalSession(
    customerId: string,
    returnUrl: string,
): Promise<{ url: string }> {
    const stripe = await getStripe();
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
    return { url: session.url };
}

export async function constructWebhookEvent(
    payload: string,
    signature: string,
): Promise<any> {
    const stripe = await getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    return stripe.webhooks.constructEvent(payload, signature, secret);
}

export async function getUserTierFromStripe(customerId: string): Promise<StripeTier | null> {
    const stripe = await getStripe();
    const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
        limit: 1,
    });

    if (subs.data.length === 0) return null;

    const tier = subs.data[0].metadata?.tier as StripeTier | undefined;
    return tier ?? null;
}
