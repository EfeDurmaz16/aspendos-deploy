import { dispatchWebhook } from '@/lib/messaging/webhook-dispatch';

export async function POST(request: Request) {
    return dispatchWebhook('telegram', request);
}
