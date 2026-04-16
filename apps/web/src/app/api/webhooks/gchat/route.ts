import { handleGChatWebhook } from '@/lib/messaging/platforms/gchat';

/** Google Chat webhook (stub — activate later) */
export async function POST(request: Request) {
    return handleGChatWebhook(request);
}
