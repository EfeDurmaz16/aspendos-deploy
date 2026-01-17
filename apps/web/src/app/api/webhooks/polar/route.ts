import { Webhooks } from '@polar-sh/nextjs'
import { prisma, Tier } from '@aspendos/db'

/**
 * Polar.sh Webhook Handler
 * 
 * Handles payment events from Polar and syncs billing status.
 * Configure in Polar Dashboard → Settings → Webhooks
 * URL: https://your-domain.com/api/webhooks/polar
 * 
 * Events: order.created, subscription.created/updated/canceled
 */

// Map Polar product names/IDs to our tiers
const PLAN_TO_TIER: Record<string, Tier> = {
    'starter': Tier.STARTER,
    'pro': Tier.PRO,
    'ultra': Tier.ULTRA,
}

// Tier limits based on approved pricing strategy
const TIER_LIMITS = {
    STARTER: {
        monthlyCredit: 1000,       // 1M tokens
        chatsRemaining: 300,        // ~10/day
        voiceMinutesRemaining: 300  // 10 min/day
    },
    PRO: {
        monthlyCredit: 10000,      // 10M tokens
        chatsRemaining: 1500,       // ~50/day
        voiceMinutesRemaining: 1800 // 60 min/day
    },
    ULTRA: {
        monthlyCredit: 100000,     // Effectively unlimited
        chatsRemaining: 5000,       // ~166/day
        voiceMinutesRemaining: 5400 // 180 min/day
    }
}

export const POST = Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

    onPayload: async (payload) => {
        console.log(`[Polar Webhook] Event: ${payload.type}`)
    },

    onOrderCreated: async (payload) => {
        const { data: order } = payload
        console.log(`[Polar Webhook] Order: ${order.id} - ${(order as Record<string, unknown>).amount || 'N/A'} ${order.currency}`)

        // Get the Clerk user ID from metadata
        const clerkId = (order.customer_metadata as { clerkId?: string })?.clerkId
        if (!clerkId) {
            console.log('[Polar Webhook] No clerkId in metadata, skipping')
            return
        }

        // Determine plan from product (lowercase match)
        const productName = order.product?.name?.toLowerCase() || 'pro'
        const plan = productName.includes('ultra') ? 'ultra' :
            productName.includes('pro') ? 'pro' : 'starter'

        console.log(`[Polar Webhook] Updating user ${clerkId} to plan: ${plan}`)
    },

    onSubscriptionCreated: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription created: ${subscription.id}`)

        // Get the Clerk user ID from metadata
        const clerkId = (subscription.customer_metadata as { clerkId?: string })?.clerkId
        if (!clerkId) {
            console.log('[Polar Webhook] No clerkId in metadata')
            return
        }

        // Determine plan and tier
        const productName = subscription.product?.name?.toLowerCase() || 'pro'
        const plan = productName.includes('ultra') ? 'ultra' :
            productName.includes('pro') ? 'pro' : 'starter'
        const tier = PLAN_TO_TIER[plan] || Tier.PRO
        const limits = TIER_LIMITS[tier]

        try {
            // Find user by clerkId
            const user = await prisma.user.findUnique({
                where: { clerkId },
                include: { billingAccount: true }
            })

            if (!user) {
                console.error(`[Polar Webhook] User not found: ${clerkId}`)
                return
            }

            // Update user tier and billing account
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: { tier }
                }),
                prisma.billingAccount.update({
                    where: { userId: user.id },
                    data: {
                        polarCustomerId: subscription.customer_id,
                        subscriptionId: subscription.id,
                        plan,
                        status: 'active',
                        ...limits,
                        resetDate: new Date(),
                        creditUsed: 0, // Reset usage on new subscription
                    }
                })
            ])

            console.log(`[Polar Webhook] User ${clerkId} upgraded to ${plan}`)
        } catch (error) {
            console.error('[Polar Webhook] Database error:', error)
        }
    },

    onSubscriptionUpdated: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription updated: ${subscription.id}`)

        // Map Polar status to our status
        const statusMap: Record<string, string> = {
            'active': 'active',
            'canceled': 'canceled',
            'past_due': 'past_due',
            'incomplete': 'past_due',
        }
        const status = statusMap[subscription.status] || 'active'

        try {
            await prisma.billingAccount.update({
                where: { subscriptionId: subscription.id },
                data: { status }
            })

            console.log(`[Polar Webhook] Subscription status: ${status}`)
        } catch (error) {
            console.error('[Polar Webhook] Error updating status:', error)
        }
    },

    onSubscriptionCanceled: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription canceled: ${subscription.id}`)

        try {
            // Find the billing account and its user
            const billingAccount = await prisma.billingAccount.findFirst({
                where: { subscriptionId: subscription.id },
                include: { user: true }
            })

            if (!billingAccount) {
                console.log('[Polar Webhook] Billing account not found')
                return
            }

            // Downgrade to starter
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: billingAccount.userId },
                    data: { tier: Tier.STARTER }
                }),
                prisma.billingAccount.update({
                    where: { id: billingAccount.id },
                    data: {
                        plan: 'starter',
                        status: 'canceled',
                        subscriptionId: null,
                        ...TIER_LIMITS.STARTER,
                        creditUsed: 0,
                    }
                })
            ])

            console.log(`[Polar Webhook] User downgraded to starter`)
        } catch (error) {
            console.error('[Polar Webhook] Error canceling subscription:', error)
        }
    },
})
