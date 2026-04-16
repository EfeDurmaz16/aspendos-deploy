import { after } from 'next/server';
import { getBot } from '@/lib/messaging/bot';

type Platform = keyof typeof bot.webhooks;

/**
 * Catch-all webhook route for any platform.
 * Individual platform routes (slack/, telegram/, etc.) take priority
 * in Next.js routing. This handles any new platforms added to the bot
 * without needing new route files.
 */
export async function POST(request: Request, context: { params: Promise<{ platform: string }> }) {
    const { platform } = await context.params;

    const handler = bot.webhooks[platform as Platform];
    if (!handler) {
        return new Response(`Unknown platform: ${platform}`, { status: 404 });
    }

    return handler(request, {
        waitUntil: (task) => after(() => task),
    });
}
