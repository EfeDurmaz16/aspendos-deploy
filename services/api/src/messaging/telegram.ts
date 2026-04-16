/**
 * Telegram Bot Gateway
 *
 * Adapter for the Telegram Bot API.
 * Uses webhooks for inbound messages and HTTP API for outbound.
 *
 * Why Telegram first:
 * - Lowest friction bot API
 * - Webhook-based (fits existing architecture)
 * - Rich message formatting (buttons for approvals)
 * - Popular in Turkey (user's market)
 */

import type { DeliveryResult, InboundMessage, MessageContent, MessagingGateway } from './gateway';

// ============================================
// CONFIG
// ============================================

const TELEGRAM_API = 'https://api.telegram.org';

function getBotToken(): string {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
    return token;
}

// ============================================
// TELEGRAM GATEWAY
// ============================================

export class TelegramGateway implements MessagingGateway {
    platform = 'telegram';

    async sendMessage(chatId: string, content: MessageContent): Promise<DeliveryResult> {
        try {
            const token = getBotToken();
            const body: Record<string, unknown> = {
                chat_id: chatId,
                text: content.text,
                parse_mode: 'Markdown',
            };

            // Add inline keyboard for actions (approval buttons)
            if (content.actions && content.actions.length > 0) {
                body.reply_markup = {
                    inline_keyboard: [
                        content.actions.map((action) => ({
                            text: action.label,
                            callback_data: JSON.stringify({
                                action: action.action,
                                value: action.value,
                            }),
                        })),
                    ],
                };
            }

            const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                return { success: false, error, platform: this.platform };
            }

            const data = (await response.json()) as { result?: { message_id?: number } };
            return {
                success: true,
                messageId: String(data.result?.message_id),
                platform: this.platform,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                platform: this.platform,
            };
        }
    }

    async sendApprovalRequest(
        chatId: string,
        approvalId: string,
        reason: string,
        toolName: string
    ): Promise<DeliveryResult> {
        return this.sendMessage(chatId, {
            text: `🔐 *Approval Required*\n\nTool: \`${toolName}\`\nReason: ${reason}\n\nPlease approve or reject this action.`,
            type: 'approval_request',
            actions: [
                { label: '✅ Approve', action: 'approve', value: approvalId },
                { label: '❌ Reject', action: 'reject', value: approvalId },
                { label: '✅ Always Allow', action: 'always_allow', value: approvalId },
            ],
        });
    }

    parseInboundMessage(rawEvent: unknown): InboundMessage | null {
        const event = rawEvent as TelegramUpdate;
        if (!event) return null;

        // Handle regular messages
        if (event.message?.text) {
            return {
                platform: this.platform,
                platformUserId: String(event.message.from?.id),
                text: event.message.text,
                messageId: String(event.message.message_id),
                timestamp: new Date(event.message.date * 1000),
            };
        }

        // Handle callback queries (button presses)
        if (event.callback_query?.data) {
            try {
                const data = JSON.parse(event.callback_query.data);
                return {
                    platform: this.platform,
                    platformUserId: String(event.callback_query.from.id),
                    text: `__callback__:${data.action}:${data.value || ''}`,
                    messageId: String(event.callback_query.id),
                    timestamp: new Date(),
                    metadata: { isCallback: true, action: data.action, value: data.value },
                };
            } catch {
                return null;
            }
        }

        return null;
    }
}

// ============================================
// TELEGRAM WEBHOOK SETUP
// ============================================

/**
 * Set the webhook URL for the Telegram bot.
 * Call this once during deployment/setup.
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
    const token = getBotToken();
    const response = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
    });
    const data = (await response.json()) as { ok: boolean };
    return data.ok;
}

// ============================================
// TELEGRAM TYPES
// ============================================

interface TelegramUpdate {
    update_id: number;
    message?: {
        message_id: number;
        from?: { id: number; first_name: string; username?: string };
        chat: { id: number; type: string };
        date: number;
        text?: string;
    };
    callback_query?: {
        id: string;
        from: { id: number; first_name: string };
        data?: string;
    };
}
