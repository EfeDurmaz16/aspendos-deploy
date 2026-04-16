export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { convexServer } from '@/lib/convex-server';
import { getStripe } from '@/lib/stripe';
import { api } from '../../../../../../../convex/_generated/api';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://yula.dev';

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session so users can manage their subscription,
 * update payment methods, view invoices, and cancel.
 *
 * Returns: { url: string }
 */
export async function POST() {
    const session = await auth();
    const userId = session?.userId;

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Look up the user in Convex to get their stripe_customer_id
        const convexUser = await convexServer.query(api.users.getByWorkOSId, {
            workos_id: userId,
        });

        if (!convexUser?.stripe_customer_id) {
            return NextResponse.json(
                { error: 'No billing account found. Please subscribe to a plan first.' },
                { status: 404 }
            );
        }

        const portalSession = await getStripe().billingPortal.sessions.create({
            customer: convexUser.stripe_customer_id,
            return_url: `${APP_URL}/pricing`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('[API /billing/portal] Error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
