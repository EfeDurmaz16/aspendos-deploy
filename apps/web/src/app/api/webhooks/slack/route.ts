import { after } from 'next/server';
import { bot } from '@/lib/messaging/bot';

export async function POST(request: Request) {
    return bot.webhooks.slack(request, {
        waitUntil: (task) => after(() => task),
    });
}
