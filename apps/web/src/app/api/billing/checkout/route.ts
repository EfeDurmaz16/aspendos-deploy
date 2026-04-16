export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { convexServer } from '@/lib/convex-server';
import {
    getStripe,
    getOrCreateCustomer,
    resolvePriceId,
    TIER_CONFIG,
    type TierSlug,
} from '@/lib/stripe';
import { api } from '../../../../../../../convex/_generated/api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout Session for a subscription tier.
 *
 * Body: { slug: TierSlug, seats?: number }
 * Returns: { url: string }
 */
export async function POST(req: NextRequest) {
    const session = await auth();
    const userId = session?.userId;

    if (!userId || !session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const slug = body.slug as TierSlug;
        const interval = (body.interval || 'monthly') as 'weekly' | 'monthly' | 'annual';
        const seats = body.seats as number | undefined;

        if (!slug || !TIER_CONFIG[slug]) {
            return NextResponse.json(
                {
                    error: `Invalid tier slug. Valid options: ${Object.keys(TIER_CONFIG).join(', ')}`,
                },
                { status: 400 }
            );
        }

        const tierConfig = TIER_CONFIG[slug];

        // Validate seats for team tiers
        if (tierConfig.isPerSeat && (!seats || seats < 1)) {
            return NextResponse.json(
                { error: 'Team tiers require at least 1 seat' },
                { status: 400 }
            );
        }

        // Look up the user in Convex to get their stripe_customer_id
        const convexUser = await convexServer.query(api.users.getByWorkOSId, {
            workos_id: userId,
        });

        // Get or create a Stripe customer
        const customerId = await getOrCreateCustomer({
            email: session.user.email,
            name: session.user.name,
            workosId: userId,
            existingCustomerId: convexUser?.stripe_customer_id,
        });

        // Save the Stripe customer ID to Convex if it's new
        if (convexUser && !convexUser.stripe_customer_id) {
            await convexServer.mutation(api.users.updateStripeCustomerId, {
                id: convexUser._id,
                stripe_customer_id: customerId,
            });
        }

        // Resolve the Stripe price ID from lookup key
        const priceId = await resolvePriceId(slug, interval);

        // Create the checkout session
        const checkoutSession = await getStripe().checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: tierConfig.isPerSeat ? (seats ?? 1) : 1,
                },
            ],
            success_url: `${APP_URL}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URL}/pricing`,
            subscription_data: {
                metadata: {
                    tier: slug,
                    workos_id: userId,
                    convex_user_id: convexUser?._id ?? '',
                    byok: tierConfig.isByok ? 'true' : 'false',
                },
            },
            metadata: {
                tier: slug,
                workos_id: userId,
            },
            allow_promotion_codes: true,
        });

        if (!checkoutSession.url) {
            return NextResponse.json(
                { error: 'Failed to create checkout session' },
                { status: 500 }
            );
        }

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('[API /billing/checkout] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
