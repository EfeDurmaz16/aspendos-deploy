import { after } from 'next/server';
import { bot } from '@/lib/messaging/bot';
import { verifyWebhook } from '@/lib/messaging/platforms/whatsapp';

/** WhatsApp webhook verification (GET) */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const verification = verifyWebhook(url);
    if (verification) return verification;
    return new Response('Forbidden', { status: 403 });
}

/** WhatsApp webhook messages (POST) */
export async function POST(request: Request) {
    return bot.webhooks.whatsapp(request, {
        waitUntil: (task) => after(() => task),
    });
}
