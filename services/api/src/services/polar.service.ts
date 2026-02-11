/**
 * Polar Billing Service
 * Handles Polar API integration for subscriptions and checkout.
 * Uses direct fetch calls for more control over API interface.
 */

import crypto from 'node:crypto';
import { prisma } from '@aspendos/db';
import { getTierConfig, type TierName } from '../config/tiers';

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || '';
// Auto-detect environment based on token prefix
const IS_SANDBOX = POLAR_ACCESS_TOKEN.startsWith('polar_sat_');
const POLAR_API_URL = IS_SANDBOX ? 'https://sandbox-api.polar.sh/v1' : 'https://api.polar.sh/v1';

console.log('Polar Enviroment:', IS_SANDBOX ? 'SANDBOX' : 'PRODUCTION');
console.log(
    'Polar Token Loaded:',
    POLAR_ACCESS_TOKEN ? `${POLAR_ACCESS_TOKEN.substring(0, 4)}...` : 'NONE'
);

// Product IDs from Polar dashboard (monthly)
const PRODUCT_IDS = {
    STARTER: process.env.POLAR_STARTER_PRODUCT_ID || '',
    PRO: process.env.POLAR_PRO_PRODUCT_ID || '',
    ULTRA: process.env.POLAR_ULTRA_PRODUCT_ID || '',
};

// Annual product IDs (separate products in Polar)
const ANNUAL_PRODUCT_IDS = {
    STARTER: process.env.POLAR_STARTER_ANNUAL_PRODUCT_ID || '',
    PRO: process.env.POLAR_PRO_ANNUAL_PRODUCT_ID || '',
    ULTRA: process.env.POLAR_ULTRA_ANNUAL_PRODUCT_ID || '',
};

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

/**
 * Create a Polar customer for an existing user
 */
export async function createCustomer(options: {
    userId: string;
    email: string;
    name?: string;
}): Promise<{ id: string; email: string }> {
    const response = await fetch(`${POLAR_API_URL}/customers/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: options.email,
            name: options.name,
            external_id: options.userId, // Links to our user ID
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        // Check if customer already exists
        if (response.status === 409 || error.includes('already exists')) {
            // Try to get existing customer
            return getCustomerByExternalId(options.userId);
        }
        throw new Error(`Polar customer creation failed: ${error}`);
    }

    const customer = (await response.json()) as { id: string; email: string };
    return customer;
}

/**
 * Get a Polar customer by external ID (our user ID)
 */
export async function getCustomerByExternalId(
    userId: string
): Promise<{ id: string; email: string }> {
    const response = await fetch(`${POLAR_API_URL}/customers/external/${userId}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Customer not found for user: ${userId}`);
    }

    return response.json();
}

// ============================================
// CHECKOUT
// ============================================

export interface CreateCheckoutOptions {
    userId: string;
    email: string;
    plan: 'starter' | 'pro' | 'ultra';
    cycle: 'monthly' | 'annual';
    successUrl: string;
    cancelUrl?: string;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckout(options: CreateCheckoutOptions) {
    const planKey = options.plan.toUpperCase() as keyof typeof PRODUCT_IDS;
    const isAnnual = options.cycle === 'annual';

    // Select the correct product ID based on billing cycle
    const productId = isAnnual
        ? ANNUAL_PRODUCT_IDS[planKey] || PRODUCT_IDS[planKey] // Fallback to monthly if annual not configured
        : PRODUCT_IDS[planKey];

    if (!productId) {
        throw new Error(`Product ID not configured for plan: ${options.plan} (${options.cycle})`);
    }

    const response = await fetch(`${POLAR_API_URL}/checkouts/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            product_id: productId,
            success_url: options.successUrl,
            customer_email: options.email,
            metadata: {
                userId: options.userId,
                plan: options.plan,
                cycle: options.cycle,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Polar checkout failed: ${error}`);
    }

    const checkout = (await response.json()) as { url: string; id: string };

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
            Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
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
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
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

    // Downgrade to FREE
    const freeConfig = getTierConfig('FREE');

    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: 'canceled',
            plan: 'free',
            monthlyCredit: freeConfig.monthlyTokens / 1000,
            chatsRemaining: freeConfig.monthlyChats,
            voiceMinutesRemaining: freeConfig.dailyVoiceMinutes * 30,
        },
    });

    await prisma.user.update({
        where: { id: account.userId },
        data: { tier: 'FREE' },
    });
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Get Polar customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(_customerId: string): Promise<string> {
    return `https://polar.sh/purchases/subscriptions`;
}
