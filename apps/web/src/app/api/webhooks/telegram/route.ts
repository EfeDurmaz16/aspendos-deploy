import { bot } from '@/lib/bot-proxy';

export const POST = async (req: Request) => bot.webhooks.telegram(req);
