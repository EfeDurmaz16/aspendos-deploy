/**
 * Polar Billing Service
 * Handles Polar API integration for subscriptions and checkout.
 * Uses direct fetch calls for more control over API interface.
 */
import { prisma } from '@aspendos/db';
import crypto from 'crypto';
import { TIER_CONFIG, TierName, getTierConfig } from '../config/tiers';

const POLAR_API_URL = 'https://api.polar.sh/v1';
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || '';

// Product IDs from Polar dashboard
const PRODUCT_IDS = {
    STARTER: process.env.POLAR_STARTER_PRODUCT_ID || '',
    PRO: process.env.POLAR_PRO_PRODUCT_ID || '',
    ULTRA: process.env.POLAR_ULTRA_PRODUCT_ID || '',
};

// ============================================
// CHECKOUT
// ============================================

export interface CreateCheckoutOptions {
    userId: string;
    email: string;
    plan: 'starter' | 'pro' | 'ultra';
    successUrl: string;
    cancelUrl?: string;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckout(options: CreateCheckoutOptions) {
    const productId = PRODUCT_IDS[options.plan.toUpperCase() as keyof typeof PRODUCT_IDS];

    if (!productId) {
        throw new Error(`Product ID not configured for plan: ${options.plan}`);
    }

    const response = await fetch(`${POLAR_API_URL}/checkouts/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            product_id: productId,
            success_url: options.successUrl,
            customer_email: options.email,
            metadata: {
                userId: options.userId,
                plan: options.plan,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Polar checkout failed: ${error}`);
    }

    const checkout = await response.json() as { url: string; id: string };

    return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
    };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(subscriptionId: string) {
    const response = await fetch(`${POLAR_API_URL}/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${POLAR_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            cancel_at_period_end: true,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Polar subscription cancel failed: ${error}`);
    }

    return response.json();
}

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Verify Polar webhook signature
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    } catch {
        return false;
    }
}

export interface PolarWebhookEvent {
    type: string;
    data: {
        id: string;
        customer_id?: string;
        customer?: {
            id: string;
            email: string;
            metadata?: Record<string, string>;
        };
        product_id?: string;
        metadata?: Record<string, string>;
        status?: string;
        current_period_end?: string;
    };
}

/**
 * Handle Polar webhook events
 */
export async function handleWebhook(event: PolarWebhookEvent) {
    const { type, data } = event;

    console.log(`Processing Polar webhook: ${type}`);

    switch (type) {
        case 'checkout.created':
        case 'checkout.updated':
            // Checkout in progress - no action needed
            break;

        case 'order.created':
            await handleOrderCreated(data);
            break;

        case 'subscription.created':
            await handleSubscriptionCreated(data);
            break;

        case 'subscription.updated':
        case 'subscription.active':
            await handleSubscriptionActive(data);
            break;

        case 'subscription.canceled':
        case 'subscription.revoked':
            await handleSubscriptionCanceled(data);
            break;

        default:
            console.log(`Unhandled webhook type: ${type}`);
    }
}

async function handleOrderCreated(data: PolarWebhookEvent['data']) {
    const userId = data.metadata?.userId;
    if (!userId) return;
    // For one-time purchases - usually credit top-ups
}

async function handleSubscriptionCreated(data: PolarWebhookEvent['data']) {
    const userId = data.metadata?.userId || data.customer?.metadata?.userId;
    if (!userId) {
        console.error('No userId in subscription metadata');
        return;
    }

    const plan = (data.metadata?.plan || 'starter') as 'starter' | 'pro' | 'ultra';
    const tier = plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    // Update or create billing account
    await prisma.billingAccount.upsert({
        where: { userId },
        create: {
            userId,
            polarCustomerId: data.customer_id,
            subscriptionId: data.id,
            plan,
            status: 'active',
            monthlyCredit: config.monthlyTokens / 1000,
            chatsRemaining: config.monthlyChats,
            voiceMinutesRemaining: config.dailyVoiceMinutes * 30,
            creditUsed: 0,
            resetDate: new Date(),
        },
        update: {
            polarCustomerId: data.customer_id,
            subscriptionId: data.id,
            plan,
            status: 'active',
            monthlyCredit: config.monthlyTokens / 1000,
            chatsRemaining: config.monthlyChats,
            voiceMinutesRemaining: config.dailyVoiceMinutes * 30,
        },
    });

    // Update user tier
    await prisma.user.update({
        where: { id: userId },
        data: { tier },
    });
}

async function handleSubscriptionActive(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    const account = await prisma.billingAccount.findFirst({
        where: { polarCustomerId: data.customer_id },
    });

    if (!account) return;

    const tier = account.plan.toUpperCase() as TierName;
    const config = getTierConfig(tier);

    // Reset credits on renewal
    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: 'active',
            creditUsed: 0,
            chatsRemaining: config.monthlyChats,
            voiceMinutesRemaining: config.dailyVoiceMinutes * 30,
            resetDate: new Date(),
        },
    });
}

async function handleSubscriptionCanceled(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    const account = await prisma.billingAccount.findFirst({
        where: { polarCustomerId: data.customer_id },
    });

    if (!account) return;

    // Downgrade to starter
    const starterConfig = getTierConfig('STARTER');

    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: 'canceled',
            plan: 'starter',
            monthlyCredit: starterConfig.monthlyTokens / 1000,
        },
    });

    await prisma.user.update({
        where: { id: account.userId },
        data: { tier: 'STARTER' },
    });
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Get Polar customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(customerId: string): Promise<string> {
    return `https://polar.sh/purchases/subscriptions`;
}
