import { after } from 'next/server';
import { getBot } from '@/lib/messaging/bot';

export async function POST(request: Request) {
    const b = await getBot();
    return b.webhooks.slack(request, {
        waitUntil: (task) => after(() => task),
    });
}
