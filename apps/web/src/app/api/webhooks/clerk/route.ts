import { prisma, Tier } from '@aspendos/db';
import type { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

/**
 * Clerk Webhook Handler
 *
 * Handles user lifecycle events from Clerk and syncs to our database.
 * Configure in Clerk Dashboard → Webhooks → Add Endpoint
 * URL: https://your-domain.com/api/webhooks/clerk
 *
 * Required events: user.created, user.updated, user.deleted
 */

// Tier limits based on pricing strategy
const TIER_LIMITS = {
    STARTER: {
        monthlyCredit: 1000, // 1M tokens
        chatsRemaining: 300, // ~10/day
        voiceMinutesRemaining: 300, // 10 min/day for 30 days
    },
    PRO: {
        monthlyCredit: 10000, // 10M tokens
        chatsRemaining: 1500, // ~50/day
        voiceMinutesRemaining: 1800, // 60 min/day for 30 days
    },
    ULTRA: {
        monthlyCredit: 100000, // Effectively unlimited
        chatsRemaining: 5000, // ~166/day
        voiceMinutesRemaining: 5400, // 180 min/day for 30 days
    },
};

export async function POST(req: Request) {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
        console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET');
        return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Get headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 });
    }

    // Get body and verify
    const payload = await req.json();
    const body = JSON.stringify(payload);

    const wh = new Webhook(WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
        evt = wh.verify(body, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        }) as WebhookEvent;
    } catch (err) {
        console.error('[Clerk Webhook] Verification failed:', err);
        return NextResponse.json({ error: 'Webhook verification failed' }, { status: 400 });
    }

    const eventType = evt.type;

    try {
        switch (eventType) {
            case 'user.created': {
                const { id, email_addresses, first_name, last_name, image_url } = evt.data;
                const email = email_addresses?.[0]?.email_address;
                const name = [first_name, last_name].filter(Boolean).join(' ') || null;

                if (!email) {
                    console.error('[Clerk Webhook] User created without email:', id);
                    return NextResponse.json({ error: 'User email required' }, { status: 400 });
                }

                console.log(`[Clerk Webhook] Creating user: ${id} (${email})`);

                // Create user with billing account in a transaction
                const user = await prisma.user.create({
                    data: {
                        clerkId: id,
                        email: email,
                        name: name,
                        avatar: image_url,
                        tier: Tier.STARTER,
                        billingAccount: {
                            create: {
                                plan: 'starter',
                                status: 'active',
                                billingCycle: 'monthly',
                                ...TIER_LIMITS.STARTER,
                                resetDate: new Date(),
                            },
                        },
                    },
                    include: { billingAccount: true },
                });

                console.log(`[Clerk Webhook] User created successfully: ${user.id}`);
                break;
            }

            case 'user.updated': {
                const { id, email_addresses, first_name, last_name, image_url } = evt.data;
                const email = email_addresses?.[0]?.email_address;
                const name = [first_name, last_name].filter(Boolean).join(' ') || null;

                console.log(`[Clerk Webhook] Updating user: ${id}`);

                // Update user info
                await prisma.user.update({
                    where: { clerkId: id },
                    data: {
                        email: email!,
                        name: name,
                        avatar: image_url,
                    },
                });

                console.log(`[Clerk Webhook] User updated successfully`);
                break;
            }

            case 'user.deleted': {
                const { id } = evt.data;

                console.log(`[Clerk Webhook] Deleting user: ${id}`);

                // Delete user (cascades to billing account, chats, etc)
                await prisma.user.delete({
                    where: { clerkId: id },
                });

                console.log(`[Clerk Webhook] User deleted successfully`);
                break;
            }

            default:
                console.log(`[Clerk Webhook] Unhandled event: ${eventType}`);
        }
    } catch (error) {
        console.error(`[Clerk Webhook] Database error:`, error);
        return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
