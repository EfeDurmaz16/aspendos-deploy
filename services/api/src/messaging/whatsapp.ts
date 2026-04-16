/**
 * WhatsApp Business Cloud API Gateway
 *
 * Uses Meta's WhatsApp Business Cloud API for messaging.
 * Requires: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import type { DeliveryResult, InboundMessage, MessageContent, MessagingGateway } from './gateway';

const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

function getConfig() {
    return {
        token: process.env.WHATSAPP_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    };
}

export class WhatsAppGateway implements MessagingGateway {
    platform = 'whatsapp';

    async sendMessage(phoneNumber: string, content: MessageContent): Promise<DeliveryResult> {
        try {
            const config = getConfig();
            if (!config.token || !config.phoneNumberId) {
                return {
                    success: false,
                    error: 'WhatsApp not configured',
                    platform: this.platform,
                };
            }

            const body: Record<string, unknown> = {
                messaging_product: 'whatsapp',
                to: phoneNumber,
                type: 'text',
                text: { body: content.text },
            };

            // Use interactive message for approval buttons
            if (content.actions && content.actions.length > 0) {
                body.type = 'interactive';
                body.interactive = {
                    type: 'button',
                    body: { text: content.text },
                    action: {
                        buttons: content.actions.slice(0, 3).map((action, _i) => ({
                            type: 'reply',
                            reply: {
                                id: `${action.action}:${action.value || ''}`,
                                title: action.label.slice(0, 20), // WhatsApp 20-char limit
                            },
                        })),
                    },
                };
                delete body.text;
            }

            const response = await fetch(`${WHATSAPP_API}/${config.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.token}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                return { success: false, error, platform: this.platform };
            }

            const data = (await response.json()) as { messages?: Array<{ id: string }> };
            return {
                success: true,
                messageId: data.messages?.[0]?.id,
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
        phoneNumber: string,
        approvalId: string,
        reason: string,
        toolName: string
    ): Promise<DeliveryResult> {
        return this.sendMessage(phoneNumber, {
            text: `*Approval Required*\n\nTool: ${toolName}\nReason: ${reason}`,
            type: 'approval_request',
            actions: [
                { label: 'Approve', action: 'approve', value: approvalId },
                { label: 'Reject', action: 'reject', value: approvalId },
                { label: 'Always Allow', action: 'always_allow', value: approvalId },
            ],
        });
    }

    parseInboundMessage(rawEvent: unknown): InboundMessage | null {
        const event = rawEvent as WhatsAppWebhook;
        if (!event?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) return null;

        const change = event.entry[0].changes[0].value;
        const msg = change.messages[0];

        // Handle text messages
        if (msg.type === 'text' && msg.text?.body) {
            return {
                platform: this.platform,
                platformUserId: msg.from,
                text: msg.text.body,
                messageId: msg.id,
                timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
            };
        }

        // Handle interactive button replies
        if (msg.type === 'interactive' && msg.interactive?.button_reply) {
            const replyId = msg.interactive.button_reply.id;
            const [action, value] = replyId.split(':');
            return {
                platform: this.platform,
                platformUserId: msg.from,
                text: `__callback__:${action}:${value || ''}`,
                messageId: msg.id,
                timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
                metadata: { isCallback: true, action, value },
            };
        }

        return null;
    }
}

/**
 * Verify WhatsApp webhook subscription (GET request from Meta).
 */
export function verifyWhatsAppWebhook(
    mode: string,
    token: string,
    challenge: string
): string | null {
    const config = getConfig();
    if (mode === 'subscribe' && token === config.verifyToken) {
        return challenge;
    }
    return null;
}

// WhatsApp webhook types
interface WhatsAppWebhook {
    entry?: Array<{
        changes?: Array<{
            value?: {
                messages?: Array<{
                    id: string;
                    from: string;
                    timestamp: string;
                    type: string;
                    text?: { body: string };
                    interactive?: {
                        button_reply?: { id: string; title: string };
                    };
                }>;
            };
        }>;
    }>;
}
