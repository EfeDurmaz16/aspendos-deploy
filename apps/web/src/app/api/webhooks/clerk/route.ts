import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
    if (!WEBHOOK_SECRET) {
        console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET not set');
        return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    const body = await req.text();
    const svixId = req.headers.get('svix-id') ?? '';
    const svixTimestamp = req.headers.get('svix-timestamp') ?? '';
    const svixSignature = req.headers.get('svix-signature') ?? '';

    let event: any;
    try {
        const wh = new Webhook(WEBHOOK_SECRET);
        event = wh.verify(body, {
            'svix-id': svixId,
            'svix-timestamp': svixTimestamp,
            'svix-signature': svixSignature,
        });
    } catch (err) {
        console.error('[clerk-webhook] Verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
        console.error('[clerk-webhook] NEXT_PUBLIC_CONVEX_URL not set');
        return NextResponse.json({ error: 'Convex not configured' }, { status: 500 });
    }

    try {
        switch (event.type) {
            case 'user.created':
            case 'user.updated': {
                const { id, email_addresses, first_name, last_name, image_url } = event.data;
                const email = email_addresses?.[0]?.email_address;

                if (!email) break;

                await fetch(`${convexUrl}/api/mutation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        path: 'users:upsertFromWorkOS',
                        args: {
                            workos_id: id,
                            email,
                            name: [first_name, last_name].filter(Boolean).join(' ') || undefined,
                            avatar_url: image_url || undefined,
                        },
                    }),
                });
                break;
            }

            case 'user.deleted': {
                // Optional: handle user deletion
                console.log('[clerk-webhook] User deleted:', event.data.id);
                break;
            }
        }
    } catch (error) {
        console.error('[clerk-webhook] Convex upsert failed:', error);
    }

    return NextResponse.json({ received: true });
}
