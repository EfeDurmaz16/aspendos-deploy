import { handleTeamsWebhook } from '@/lib/messaging/platforms/teams';

/** Microsoft Teams webhook (stub — activate later) */
export async function POST(request: Request) {
    return handleTeamsWebhook(request);
}
