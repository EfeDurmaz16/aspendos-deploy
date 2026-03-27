/**
 * Slack Bot Gateway
 *
 * Uses Slack Web API and Events API for messaging.
 * Requires: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
 *
 * Docs: https://api.slack.com/apis
 */

import type { DeliveryResult, InboundMessage, MessageContent, MessagingGateway } from './gateway';

const SLACK_API = 'https://slack.com/api';

function getConfig() {
    return {
        botToken: process.env.SLACK_BOT_TOKEN || '',
        signingSecret: process.env.SLACK_SIGNING_SECRET || '',
    };
}

export class SlackGateway implements MessagingGateway {
    platform = 'slack';

    async sendMessage(channelId: string, content: MessageContent): Promise<DeliveryResult> {
        try {
            const config = getConfig();
            if (!config.botToken) {
                return { success: false, error: 'Slack not configured', platform: this.platform };
            }

            const body: Record<string, unknown> = {
                channel: channelId,
                text: content.text,
            };

            // Add action buttons as Slack Block Kit
            if (content.actions && content.actions.length > 0) {
                body.blocks = [
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: content.text },
                    },
                    {
                        type: 'actions',
                        elements: content.actions.map((action) => ({
                            type: 'button',
                            text: { type: 'plain_text', text: action.label },
                            action_id: `yula_${action.action}`,
                            value: action.value || '',
                            ...(action.action === 'approve'
                                ? { style: 'primary' }
                                : action.action === 'reject'
                                  ? { style: 'danger' }
                                  : {}),
                        })),
                    },
                ];
            }

            const response = await fetch(`${SLACK_API}/chat.postMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${config.botToken}`,
                },
                body: JSON.stringify(body),
            });

            const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
            if (!data.ok) {
                return { success: false, error: data.error || 'Unknown', platform: this.platform };
            }

            return { success: true, messageId: data.ts, platform: this.platform };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                platform: this.platform,
            };
        }
    }

    async sendApprovalRequest(
        channelId: string,
        approvalId: string,
        reason: string,
        toolName: string
    ): Promise<DeliveryResult> {
        return this.sendMessage(channelId, {
            text: `:lock: *Approval Required*\n\nTool: \`${toolName}\`\nReason: ${reason}`,
            type: 'approval_request',
            actions: [
                { label: 'Approve', action: 'approve', value: approvalId },
                { label: 'Reject', action: 'reject', value: approvalId },
                { label: 'Always Allow', action: 'always_allow', value: approvalId },
            ],
        });
    }

    parseInboundMessage(rawEvent: unknown): InboundMessage | null {
        const event = rawEvent as SlackEvent;
        if (!event) return null;

        // Handle regular messages
        if (event.type === 'event_callback' && event.event?.type === 'message') {
            const msg = event.event;
            // Ignore bot messages to prevent loops
            if (msg.bot_id || msg.subtype) return null;

            return {
                platform: this.platform,
                platformUserId: msg.user || '',
                text: msg.text || '',
                messageId: msg.ts || '',
                timestamp: new Date(parseFloat(msg.ts || '0') * 1000),
                metadata: { channel: msg.channel },
            };
        }

        // Handle interactive button clicks
        if (event.type === 'block_actions' && event.actions?.[0]) {
            const action = event.actions[0];
            const actionId = action.action_id?.replace('yula_', '') || '';
            return {
                platform: this.platform,
                platformUserId: event.user?.id || '',
                text: `__callback__:${actionId}:${action.value || ''}`,
                messageId: action.action_ts || '',
                timestamp: new Date(),
                metadata: {
                    isCallback: true,
                    action: actionId,
                    value: action.value,
                    channel: event.channel?.id,
                },
            };
        }

        return null;
    }
}

/**
 * Verify Slack URL challenge (initial webhook setup).
 */
export function handleSlackChallenge(body: Record<string, unknown>): string | null {
    if (body.type === 'url_verification' && typeof body.challenge === 'string') {
        return body.challenge;
    }
    return null;
}

// Slack event types
interface SlackEvent {
    type: string;
    event?: {
        type: string;
        user?: string;
        text?: string;
        ts?: string;
        channel?: string;
        bot_id?: string;
        subtype?: string;
    };
    actions?: Array<{
        action_id?: string;
        value?: string;
        action_ts?: string;
    }>;
    user?: { id: string };
    channel?: { id: string };
}
