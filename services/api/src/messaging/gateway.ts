/**
 * Messaging Gateway — Thin Wrapper
 *
 * The actual messaging is handled by Vercel Chat SDK (see src/bot/).
 * This file provides the sendToUser() helper for PAC delivery service
 * to send notifications through the Chat SDK bot.
 */

// Bot is lazy-loaded to avoid crashes when Chat SDK packages aren't installed

export interface MessageContent {
    text: string;
    type: 'notification' | 'approval_request' | 'proactive' | 'response';
    actions?: MessageAction[];
    metadata?: Record<string, unknown>;
}

export interface MessageAction {
    label: string;
    action: string;
    value?: string;
}

export interface DeliveryResult {
    success: boolean;
    messageId?: string;
    error?: string;
    platform: string;
}

/**
 * Send a message to a user on a specific platform via Chat SDK.
 * Used by PAC delivery service for notifications and approval requests.
 */
export async function sendToUser(
    platformUserId: string,
    platform: string,
    content: MessageContent
): Promise<DeliveryResult> {
    try {
        const { getBot } = await import('../bot');
        const bot = await getBot();
        if (!bot) {
            return { success: false, error: 'Chat SDK bot not initialized', platform };
        }

        const adapter = (bot as any).adapters?.[platform];
        if (!adapter) {
            return { success: false, error: `No adapter for platform: ${platform}`, platform };
        }

        await adapter.sendMessage(platformUserId, { text: content.text });

        return { success: true, platform };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            platform,
        };
    }
}
