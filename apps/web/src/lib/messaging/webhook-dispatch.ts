import { after } from 'next/server';
import { getBot } from './bot';

export async function dispatchWebhook(platform: string, request: Request) {
    const bot = await getBot();
    const handler = (
        bot.webhooks as Record<
            string,
            ((request: Request, options: unknown) => Promise<Response>) | undefined
        >
    )?.[platform];
    if (!handler) {
        return new Response(`Platform not configured: ${platform}`, { status: 503 });
    }

    return handler(request, {
        waitUntil: (task: Promise<unknown>) => after(() => task),
    });
}
