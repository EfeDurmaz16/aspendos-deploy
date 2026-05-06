import { dispatchWebhook } from '@/lib/messaging/webhook-dispatch';

const SUPPORTED_WEBHOOK_PLATFORMS = new Set(['slack', 'discord', 'telegram', 'whatsapp']);

/**
 * Catch-all webhook route for any platform.
 * Individual platform routes (slack/, telegram/, etc.) take priority
 * in Next.js routing. New platforms must be explicitly added here after
 * their verification and idempotency behavior is production-ready.
 */
export async function POST(request: Request, context: { params: Promise<{ platform: string }> }) {
    const { platform } = await context.params;
    if (!SUPPORTED_WEBHOOK_PLATFORMS.has(platform)) {
        return new Response(`Unknown platform: ${platform}`, { status: 404 });
    }

    return dispatchWebhook(platform, request);
}
