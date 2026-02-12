import { prisma, Tier } from '@aspendos/db';
import { Webhooks } from '@polar-sh/nextjs';

/**
 * Polar.sh Webhook Handler
 *
 * Handles payment events from Polar and syncs billing status.
 * Configure in Polar Dashboard → Settings → Webhooks
 * URL: https://your-domain.com/api/webhooks/polar
 *
 * Events: order.created, subscription.created/updated/canceled
 */

// Helper to safely extract userId from metadata (supports both new userId and legacy clerkId)
function getUserIdFromMetadata(metadata: unknown): string | undefined {
    if (metadata && typeof metadata === 'object') {
        // Try new Better Auth userId first
        if ('userId' in metadata) {
            const userId = (metadata as { userId: unknown }).userId;
            if (typeof userId === 'string') return userId;
        }
        // Fallback to legacy clerkId for backward compatibility
        if ('clerkId' in metadata) {
            const clerkId = (metadata as { clerkId: unknown }).clerkId;
            if (typeof clerkId === 'string') return clerkId;
        }
    }
    return undefined;
}

// Map Polar product names/IDs to our tiers
const PLAN_TO_TIER: Record<string, Tier> = {
    starter: Tier.STARTER,
    pro: Tier.PRO,
    ultra: Tier.ULTRA,
};

// Tier limits based on approved pricing strategy
const TIER_LIMITS: Record<
    Tier,
    { monthlyCredit: number; chatsRemaining: number; voiceMinutesRemaining: number }
> = {
    [Tier.FREE]: {
        monthlyCredit: 100, // 100K tokens
        chatsRemaining: 100, // ~3/day
        voiceMinutesRemaining: 0, // No voice
    },
    [Tier.STARTER]: {
        monthlyCredit: 1000, // 1M tokens
        chatsRemaining: 300, // ~10/day
        voiceMinutesRemaining: 300, // 10 min/day
    },
    [Tier.PRO]: {
        monthlyCredit: 10000, // 10M tokens
        chatsRemaining: 1500, // ~50/day
        voiceMinutesRemaining: 1800, // 60 min/day
    },
    [Tier.ULTRA]: {
        monthlyCredit: 100000, // Effectively unlimited
        chatsRemaining: 5000, // ~166/day
        voiceMinutesRemaining: 5400, // 180 min/day
    },
};

export const POST = Webhooks({
    webhookSecret:
        process.env.POLAR_WEBHOOK_SECRET ||
        (() => {
            throw new Error('POLAR_WEBHOOK_SECRET is required');
        })(),

    onOrderCreated: async (payload) => {
        const { data: order } = payload;

        // Get user ID from metadata (try order metadata first, then customer metadata)
        const userId =
            getUserIdFromMetadata(order.metadata) ||
            getUserIdFromMetadata(order.customer?.metadata);
        if (!userId) {
            console.warn('[Polar Webhook] No userId in order metadata, skipping');
            return;
        }
        // Log the order for audit trail
        console.log(
            `[Polar Webhook] Order created for user ${userId}, product: ${order.product?.name}`
        );
    },

    onSubscriptionCreated: async (payload) => {
        const { data: subscription } = payload;

        // Get user ID from metadata (supports both userId and legacy clerkId)
        const userId =
            getUserIdFromMetadata(subscription.metadata) ||
            getUserIdFromMetadata(subscription.customer?.metadata);
        if (!userId) {
            console.warn('[Polar Webhook] No userId in subscription metadata');
            return;
        }

        // Determine plan and tier
        const productName = subscription.product?.name?.toLowerCase() || 'pro';
        const plan = productName.includes('ultra')
            ? 'ultra'
            : productName.includes('pro')
              ? 'pro'
              : 'starter';
        const tier = PLAN_TO_TIER[plan] || Tier.PRO;
        const limits = TIER_LIMITS[tier];

        try {
            // Find user by ID (try direct ID first, then legacy clerkId)
            let user = await prisma.user.findUnique({
                where: { id: userId },
                include: { billingAccount: true },
            });
            if (!user) {
                user = await prisma.user.findUnique({
                    where: { clerkId: userId },
                    include: { billingAccount: true },
                });
            }

            if (!user) {
                console.error(`[Polar Webhook] User not found: ${userId}`);
                return;
            }

            // Update user tier and billing account
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: { tier },
                }),
                prisma.billingAccount.update({
                    where: { userId: user.id },
                    data: {
                        polarCustomerId: subscription.customerId,
                        subscriptionId: subscription.id,
                        plan,
                        status: 'active',
                        ...limits,
                        resetDate: new Date(),
                        creditUsed: 0, // Reset usage on new subscription
                    },
                }),
            ]);
        } catch (error) {
            console.error('[Polar Webhook] Database error:', error);
        }
    },

    onSubscriptionUpdated: async (payload) => {
        const { data: subscription } = payload;

        // Map Polar status to our status
        const statusMap: Record<string, string> = {
            active: 'active',
            canceled: 'canceled',
            past_due: 'past_due',
            incomplete: 'past_due',
        };
        const status = statusMap[subscription.status] || 'active';

        try {
            // Find the billing account first, then update
            const billingAccount = await prisma.billingAccount.findFirst({
                where: { subscriptionId: subscription.id },
            });

            if (billingAccount) {
                await prisma.billingAccount.update({
                    where: { id: billingAccount.id },
                    data: { status },
                });
            } else {
                console.warn('[Polar Webhook] Billing account not found for subscription');
            }
        } catch (error) {
            console.error('[Polar Webhook] Error updating status:', error);
        }
    },

    onSubscriptionCanceled: async (payload) => {
        const { data: subscription } = payload;

        try {
            // Find the billing account and its user
            const billingAccount = await prisma.billingAccount.findFirst({
                where: { subscriptionId: subscription.id },
                include: { user: true },
            });

            if (!billingAccount) {
                console.warn('[Polar Webhook] Billing account not found');
                return;
            }

            // Downgrade to free tier on cancellation
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: billingAccount.userId },
                    data: { tier: Tier.FREE },
                }),
                prisma.billingAccount.update({
                    where: { id: billingAccount.id },
                    data: {
                        plan: 'free',
                        status: 'canceled',
                        subscriptionId: null,
                        ...TIER_LIMITS.FREE,
                        creditUsed: 0,
                    },
                }),
            ]);
        } catch (error) {
            console.error('[Polar Webhook] Error canceling subscription:', error);
        }
    },
});
