/**
 * Polar Billing Service
 * Handles Polar SDK integration for subscriptions and checkout.
 */
import { Polar } from '@polar-sh/sdk';
import { prisma } from '@aspendos/db';
import crypto from 'crypto';

// Initialize Polar client
const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN || '',
});

// Product IDs from Polar dashboard
const PRODUCT_IDS = {
    PRO: process.env.POLAR_PRO_PRODUCT_ID || '',
    ULTRA: process.env.POLAR_ULTRA_PRODUCT_ID || '',
};

const TIER_CREDITS = {
    pro: 50,
    ultra: 120,
    enterprise: 500,
};

// ============================================
// CHECKOUT
// ============================================

export interface CreateCheckoutOptions {
    userId: string;
    email: string;
    plan: 'pro' | 'ultra';
    successUrl: string;
    cancelUrl?: string;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckout(options: CreateCheckoutOptions) {
    const productId = options.plan === 'ultra' ? PRODUCT_IDS.ULTRA : PRODUCT_IDS.PRO;

    if (!productId) {
        throw new Error(`Product ID not configured for plan: ${options.plan}`);
    }

    const checkout = await polar.checkouts.custom.create({
        productId,
        successUrl: options.successUrl,
        customerEmail: options.email,
        metadata: {
            userId: options.userId,
            plan: options.plan,
        },
    });

    return {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
    };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Get subscription for user from Polar
 */
export async function getSubscription(customerId: string) {
    try {
        const subscriptions = await polar.subscriptions.list({
            customerId,
            active: true,
        });

        return subscriptions.result.items[0] || null;
    } catch (error) {
        console.error('Error fetching subscription:', error);
        return null;
    }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(subscriptionId: string) {
    return polar.subscriptions.cancel({
        id: subscriptionId,
    });
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
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
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
            // Checkout started - no action needed
            break;

        case 'checkout.updated':
            // Checkout in progress
            break;

        case 'order.created':
            // One-time payment completed
            await handleOrderCreated(data);
            break;

        case 'subscription.created':
            await handleSubscriptionCreated(data);
            break;

        case 'subscription.updated':
            await handleSubscriptionUpdated(data);
            break;

        case 'subscription.active':
            await handleSubscriptionActive(data);
            break;

        case 'subscription.canceled':
            await handleSubscriptionCanceled(data);
            break;

        case 'subscription.revoked':
            await handleSubscriptionRevoked(data);
            break;

        default:
            console.log(`Unhandled webhook type: ${type}`);
    }
}

async function handleOrderCreated(data: PolarWebhookEvent['data']) {
    const userId = data.metadata?.userId;
    if (!userId) return;

    // For one-time purchases, update user credits
    // (Usually for credit top-ups, not subscriptions)
}

async function handleSubscriptionCreated(data: PolarWebhookEvent['data']) {
    const userId = data.metadata?.userId || data.customer?.metadata?.userId;
    if (!userId) {
        console.error('No userId in subscription metadata');
        return;
    }

    const plan = data.metadata?.plan || 'pro';

    // Update or create billing account
    await prisma.billingAccount.upsert({
        where: { userId },
        create: {
            userId,
            polarCustomerId: data.customer_id,
            subscriptionId: data.id,
            plan,
            status: 'active',
            monthlyCredit: TIER_CREDITS[plan as keyof typeof TIER_CREDITS] || 50,
            creditUsed: 0,
            resetDate: new Date(),
        },
        update: {
            polarCustomerId: data.customer_id,
            subscriptionId: data.id,
            plan,
            status: 'active',
            monthlyCredit: TIER_CREDITS[plan as keyof typeof TIER_CREDITS] || 50,
        },
    });

    // Update user tier
    await prisma.user.update({
        where: { id: userId },
        data: { tier: plan.toUpperCase() as 'PRO' | 'ULTRA' | 'ENTERPRISE' },
    });
}

async function handleSubscriptionUpdated(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    const account = await prisma.billingAccount.findFirst({
        where: { polarCustomerId: data.customer_id },
    });

    if (!account) return;

    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: data.status || account.status,
        },
    });
}

async function handleSubscriptionActive(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    const account = await prisma.billingAccount.findFirst({
        where: { polarCustomerId: data.customer_id },
    });

    if (!account) return;

    // Reset credits on renewal
    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: 'active',
            creditUsed: 0,
            resetDate: new Date(),
        },
    });
}

async function handleSubscriptionCanceled(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    await prisma.billingAccount.updateMany({
        where: { polarCustomerId: data.customer_id },
        data: { status: 'canceled' },
    });
}

async function handleSubscriptionRevoked(data: PolarWebhookEvent['data']) {
    if (!data.customer_id) return;

    const account = await prisma.billingAccount.findFirst({
        where: { polarCustomerId: data.customer_id },
    });

    if (!account) return;

    // Downgrade to free tier
    await prisma.billingAccount.update({
        where: { id: account.id },
        data: {
            status: 'canceled',
            plan: 'pro',
            monthlyCredit: 0,
        },
    });

    await prisma.user.update({
        where: { id: account.userId },
        data: { tier: 'PRO' },
    });
}

// ============================================
// CUSTOMER PORTAL
// ============================================

/**
 * Get Polar customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(customerId: string): Promise<string> {
    // Polar provides a customer portal for subscription management
    return `https://polar.sh/customer/${customerId}`;
}
