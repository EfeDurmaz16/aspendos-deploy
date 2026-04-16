export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, type TierSlug } from '@/lib/stripe';
import { convexServer } from '@/lib/convex-server';
import { api } from '../../../../../../../convex/_generated/api';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
    console.warn('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set — webhooks will be rejected');
}

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events for subscription lifecycle.
 *
 * Events handled:
 * - checkout.session.completed — new subscription created
 * - customer.subscription.updated — plan change, renewal, payment status
 * - customer.subscription.deleted — subscription canceled
 * - invoice.payment_failed — payment failure
 */
export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = getStripe().webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[Stripe Webhook] Signature verification failed: ${message}`);
        return NextResponse.json(
            { error: `Webhook signature verification failed: ${message}` },
            { status: 400 }
        );
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
        // Return 200 to prevent Stripe from retrying — we logged the error
        return NextResponse.json({ received: true, error: 'Processing failed' });
    }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription' || !session.subscription) {
        return;
    }

    const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

    // Retrieve full subscription to get price metadata
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price'],
    });

    const tier = (subscription.metadata.tier ?? session.metadata?.tier) as TierSlug | undefined;

    if (!tier) {
        console.error('[Stripe Webhook] checkout.session.completed: missing tier metadata');
        return;
    }

    const workosId = subscription.metadata.workos_id ?? session.metadata?.workos_id;

    if (!workosId) {
        console.error('[Stripe Webhook] checkout.session.completed: missing workos_id');
        return;
    }

    // Find the Convex user
    const convexUser = await convexServer.query(api.users.getByWorkOSId, {
        workos_id: workosId,
    });

    if (!convexUser) {
        console.error(`[Stripe Webhook] No Convex user found for workos_id: ${workosId}`);
        return;
    }

    // Save stripe_customer_id if not already set
    const customerId =
        typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer | null)?.id;

    if (customerId && !convexUser.stripe_customer_id) {
        await convexServer.mutation(api.users.updateStripeCustomerId, {
            id: convexUser._id,
            stripe_customer_id: customerId,
        });
    }

    const isByok = tier === 'pro_byok' || tier === 'team_byok';
    const firstItem = subscription.items.data[0];
    const seats = firstItem?.quantity ?? undefined;
    // Stripe v22: current_period_end is on SubscriptionItem, not Subscription
    const periodEnd = firstItem?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;

    // Upsert subscription in Convex
    await convexServer.mutation(api.subscriptions.upsertFromStripe, {
        user_id: convexUser._id,
        stripe_subscription_id: subscriptionId,
        tier,
        status: mapSubscriptionStatus(subscription.status),
        current_period_end: periodEnd * 1000, // seconds -> ms
        seats,
        byok: isByok,
    });

    // Update user tier
    await convexServer.mutation(api.users.updateTier, {
        id: convexUser._id,
        tier,
    });

    console.log(
        `[Stripe Webhook] checkout.session.completed: user=${convexUser._id} tier=${tier} sub=${subscriptionId}`
    );
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const tier = subscription.metadata.tier as TierSlug | undefined;
    const workosId = subscription.metadata.workos_id;

    if (!workosId) {
        console.error(
            `[Stripe Webhook] subscription.updated: missing workos_id on sub ${subscription.id}`
        );
        return;
    }

    const convexUser = await convexServer.query(api.users.getByWorkOSId, {
        workos_id: workosId,
    });

    if (!convexUser) {
        console.error(`[Stripe Webhook] No Convex user for workos_id: ${workosId}`);
        return;
    }

    // If tier changed (plan switch), use the new tier; otherwise keep existing
    const existingSub = await convexServer.query(api.subscriptions.getByUser, {
        user_id: convexUser._id,
    });

    const effectiveTier = tier ?? existingSub?.tier;
    if (!effectiveTier) {
        console.error('[Stripe Webhook] subscription.updated: cannot determine tier');
        return;
    }

    const isByok = effectiveTier === 'pro_byok' || effectiveTier === 'team_byok';
    const firstItem = subscription.items.data[0];
    const seats = firstItem?.quantity ?? undefined;
    const status = mapSubscriptionStatus(subscription.status);
    // Stripe v22: current_period_end is on SubscriptionItem
    const periodEnd = firstItem?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400;

    await convexServer.mutation(api.subscriptions.upsertFromStripe, {
        user_id: convexUser._id,
        stripe_subscription_id: subscription.id,
        tier: effectiveTier,
        status,
        current_period_end: periodEnd * 1000,
        seats,
        byok: isByok,
    });

    // Sync user tier
    if (status === 'active' || status === 'trialing') {
        await convexServer.mutation(api.users.updateTier, {
            id: convexUser._id,
            tier: effectiveTier,
        });
    } else if (status === 'canceled') {
        await convexServer.mutation(api.users.updateTier, {
            id: convexUser._id,
            tier: 'free',
        });
    }

    console.log(
        `[Stripe Webhook] subscription.updated: user=${convexUser._id} status=${status} tier=${effectiveTier}`
    );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const workosId = subscription.metadata.workos_id;

    if (!workosId) {
        console.error(
            `[Stripe Webhook] subscription.deleted: missing workos_id on sub ${subscription.id}`
        );
        return;
    }

    const convexUser = await convexServer.query(api.users.getByWorkOSId, {
        workos_id: workosId,
    });

    if (!convexUser) {
        console.error(`[Stripe Webhook] No Convex user for workos_id: ${workosId}`);
        return;
    }

    // Mark subscription as canceled
    const existingSub = await convexServer.query(api.subscriptions.getByUser, {
        user_id: convexUser._id,
    });

    if (existingSub) {
        await convexServer.mutation(api.subscriptions.cancel, {
            id: existingSub._id,
        });
    }

    // Downgrade user to free tier
    await convexServer.mutation(api.users.updateTier, {
        id: convexUser._id,
        tier: 'free',
    });

    console.log(`[Stripe Webhook] subscription.deleted: user=${convexUser._id} downgraded to free`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    // Stripe v22: subscription is at invoice.parent.subscription_details.subscription
    const subRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subRef === 'string' ? subRef : subRef?.id;

    if (!subscriptionId) return;

    // Retrieve subscription to get metadata
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    const workosId = subscription.metadata.workos_id;

    if (!workosId) return;

    const convexUser = await convexServer.query(api.users.getByWorkOSId, {
        workos_id: workosId,
    });

    if (!convexUser) return;

    // Update subscription status to past_due
    const existingSub = await convexServer.query(api.subscriptions.getByUser, {
        user_id: convexUser._id,
    });

    if (existingSub) {
        const isByok = existingSub.tier === 'pro_byok' || existingSub.tier === 'team_byok';
        await convexServer.mutation(api.subscriptions.upsertFromStripe, {
            user_id: convexUser._id,
            stripe_subscription_id: subscriptionId,
            tier: existingSub.tier,
            status: 'past_due',
            current_period_end: existingSub.current_period_end,
            seats: existingSub.seats,
            byok: isByok,
        });
    }

    console.log(
        `[Stripe Webhook] invoice.payment_failed: user=${convexUser._id} sub=${subscriptionId}`
    );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSubscriptionStatus(
    stripeStatus: Stripe.Subscription.Status
): 'active' | 'past_due' | 'canceled' | 'trialing' {
    switch (stripeStatus) {
        case 'active':
            return 'active';
        case 'past_due':
            return 'past_due';
        case 'canceled':
        case 'unpaid':
        case 'incomplete_expired':
            return 'canceled';
        case 'trialing':
            return 'trialing';
        case 'incomplete':
        case 'paused':
        default:
            return 'active';
    }
}
