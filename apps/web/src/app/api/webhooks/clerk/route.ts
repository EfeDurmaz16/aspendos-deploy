import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Clerk Webhook Handler
 * 
 * This endpoint receives webhooks from Clerk when user events occur.
 * Configure this in Clerk Dashboard → Webhooks → Add Endpoint
 * URL: https://your-domain.com/api/webhooks/clerk
 * 
 * Required events:
 * - user.created
 * - user.updated
 * - user.deleted
 */
export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
        console.error('Missing CLERK_WEBHOOK_SECRET environment variable')
        return NextResponse.json(
            { error: 'Webhook secret not configured' },
            { status: 500 }
        )
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json(
            { error: 'Missing svix headers' },
            { status: 400 }
        )
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Verify the webhook
    const wh = new Webhook(WEBHOOK_SECRET)
    let evt: WebhookEvent

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent
    } catch (err) {
        console.error('Error verifying webhook:', err)
        return NextResponse.json(
            { error: 'Webhook verification failed' },
            { status: 400 }
        )
    }

    // Handle the event
    const eventType = evt.type

    switch (eventType) {
        case 'user.created': {
            const { id, email_addresses, first_name, last_name, image_url } = evt.data
            const email = email_addresses?.[0]?.email_address
            const name = [first_name, last_name].filter(Boolean).join(' ') || null

            console.log(`[Clerk Webhook] User created: ${id} (${email})`)

            // TODO: Create user in database
            // await db.user.create({
            //   data: {
            //     clerkId: id,
            //     email: email!,
            //     name,
            //     avatar: image_url,
            //     tier: 'STARTER',
            //   }
            // })

            // TODO: Create billing account
            // await db.billingAccount.create({
            //   data: {
            //     userId: user.id,
            //     plan: 'starter',
            //     monthlyCredit: 1000,
            //     chatsRemaining: 300,
            //   }
            // })

            break
        }

        case 'user.updated': {
            const { id, email_addresses, first_name, last_name, image_url } = evt.data
            const email = email_addresses?.[0]?.email_address
            const name = [first_name, last_name].filter(Boolean).join(' ') || null

            console.log(`[Clerk Webhook] User updated: ${id} (${email})`)

            // TODO: Update user in database
            // await db.user.update({
            //   where: { clerkId: id },
            //   data: {
            //     email: email!,
            //     name,
            //     avatar: image_url,
            //   }
            // })

            break
        }

        case 'user.deleted': {
            const { id } = evt.data

            console.log(`[Clerk Webhook] User deleted: ${id}`)

            // TODO: Delete user from database (cascades to billing)
            // await db.user.delete({
            //   where: { clerkId: id }
            // })

            break
        }

        default:
            console.log(`[Clerk Webhook] Unhandled event type: ${eventType}`)
    }

    return NextResponse.json({ received: true })
}
