import { Webhooks } from '@polar-sh/nextjs'
import { NextResponse } from 'next/server'

/**
 * Polar.sh Webhook Handler
 * 
 * This endpoint receives webhooks from Polar when payment events occur.
 * Configure this in Polar Dashboard → Settings → Webhooks
 * URL: https://your-domain.com/api/webhooks/polar
 * 
 * Events to subscribe:
 * - order.created
 * - subscription.created
 * - subscription.updated
 * - subscription.canceled
 */

export const POST = Webhooks({
    webhookSecret: process.env.POLAR_WEBHOOK_SECRET!,

    onPayload: async (payload) => {
        console.log(`[Polar Webhook] Received event: ${payload.type}`)
    },

    onOrderCreated: async (payload) => {
        const { data: order } = payload
        console.log(`[Polar Webhook] Order created: ${order.id}`)
        console.log(`  Customer: ${order.customer?.email}`)
        console.log(`  Amount: ${order.amount} ${order.currency}`)

        // TODO: Update user's billing account
        // const userId = order.customer_metadata?.userId
        // if (userId) {
        //   await db.billingAccount.update({
        //     where: { userId },
        //     data: {
        //       plan: order.product?.name?.toLowerCase() || 'starter',
        //       status: 'active',
        //     }
        //   })
        // }
    },

    onSubscriptionCreated: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription created: ${subscription.id}`)
        console.log(`  Status: ${subscription.status}`)
        console.log(`  Customer: ${subscription.customer?.email}`)

        // TODO: Update user's billing account with subscription details
        // const userId = subscription.customer_metadata?.userId
        // if (userId) {
        //   await db.billingAccount.update({
        //     where: { userId },
        //     data: {
        //       polarCustomerId: subscription.customer_id,
        //       subscriptionId: subscription.id,
        //       plan: subscription.product?.name?.toLowerCase() || 'starter',
        //       status: 'active',
        //       resetDate: new Date(),
        //     }
        //   })
        // }
    },

    onSubscriptionUpdated: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription updated: ${subscription.id}`)
        console.log(`  New status: ${subscription.status}`)

        // TODO: Update billing account status
        // Map Polar status to our status
        // const statusMap: Record<string, string> = {
        //   'active': 'active',
        //   'canceled': 'canceled',
        //   'past_due': 'past_due',
        // }
    },

    onSubscriptionCanceled: async (payload) => {
        const { data: subscription } = payload
        console.log(`[Polar Webhook] Subscription canceled: ${subscription.id}`)

        // TODO: Update billing account
        // await db.billingAccount.update({
        //   where: { subscriptionId: subscription.id },
        //   data: {
        //     status: 'canceled',
        //     plan: 'starter', // Downgrade to free tier
        //   }
        // })
    },
})
