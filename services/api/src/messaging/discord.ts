/**
 * Discord Bot Gateway
 *
 * Uses Discord REST API for messaging.
 * Requires: DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID
 *
 * Docs: https://discord.com/developers/docs
 */

import type { DeliveryResult, InboundMessage, MessageContent, MessagingGateway } from './gateway';

const DISCORD_API = 'https://discord.com/api/v10';

function getConfig() {
    return {
        botToken: process.env.DISCORD_BOT_TOKEN || '',
        applicationId: process.env.DISCORD_APPLICATION_ID || '',
    };
}

export class DiscordGateway implements MessagingGateway {
    platform = 'discord';

    async sendMessage(channelId: string, content: MessageContent): Promise<DeliveryResult> {
        try {
            const config = getConfig();
            if (!config.botToken) {
                return { success: false, error: 'Discord not configured', platform: this.platform };
            }

            const body: Record<string, unknown> = {
                content: content.text,
            };

            // Add action buttons as Discord components
            if (content.actions && content.actions.length > 0) {
                body.components = [
                    {
                        type: 1, // ACTION_ROW
                        components: content.actions.map((action, _i) => ({
                            type: 2, // BUTTON
                            style:
                                action.action === 'approve'
                                    ? 3
                                    : action.action === 'reject'
                                      ? 4
                                      : 2,
                            // 3=SUCCESS(green), 4=DANGER(red), 2=SECONDARY(gray)
                            label: action.label,
                            custom_id: `yula:${action.action}:${action.value || ''}`,
                        })),
                    },
                ];
            }

            const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bot ${config.botToken}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.text();
                return { success: false, error, platform: this.platform };
            }

            const data = (await response.json()) as { id?: string };
            return { success: true, messageId: data.id, platform: this.platform };
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
            text: `**Approval Required**\n\nTool: \`${toolName}\`\nReason: ${reason}`,
            type: 'approval_request',
            actions: [
                { label: 'Approve', action: 'approve', value: approvalId },
                { label: 'Reject', action: 'reject', value: approvalId },
                { label: 'Always Allow', action: 'always_allow', value: approvalId },
            ],
        });
    }

    parseInboundMessage(rawEvent: unknown): InboundMessage | null {
        const event = rawEvent as DiscordInteraction;
        if (!event) return null;

        // Handle regular messages (MESSAGE_CREATE gateway event)
        if (event.t === 'MESSAGE_CREATE' && event.d?.content) {
            // Ignore bot messages
            if (event.d.author?.bot) return null;

            return {
                platform: this.platform,
                platformUserId: event.d.author?.id || '',
                text: event.d.content,
                messageId: event.d.id || '',
                timestamp: new Date(event.d.timestamp || Date.now()),
                metadata: { channelId: event.d.channel_id },
            };
        }

        // Handle button interactions (INTERACTION_CREATE)
        if (event.type === 3 && event.data?.custom_id) {
            // type 3 = MESSAGE_COMPONENT
            const parts = event.data.custom_id.split(':');
            const action = parts[1] || '';
            const value = parts[2] || '';

            return {
                platform: this.platform,
                platformUserId: event.member?.user?.id || event.user?.id || '',
                text: `__callback__:${action}:${value}`,
                messageId: event.id || '',
                timestamp: new Date(),
                metadata: {
                    isCallback: true,
                    action,
                    value,
                    channelId: event.channel_id,
                    interactionToken: event.token,
                },
            };
        }

        return null;
    }
}

/**
 * Respond to a Discord interaction (required within 3 seconds).
 */
export async function respondToInteraction(
    interactionId: string,
    interactionToken: string,
    content: string
): Promise<boolean> {
    const response = await fetch(
        `${DISCORD_API}/interactions/${interactionId}/${interactionToken}/callback`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
                data: { content, flags: 64 }, // 64 = EPHEMERAL
            }),
        }
    );
    return response.ok;
}

// Discord types
interface DiscordInteraction {
    t?: string; // Gateway event type
    type?: number; // Interaction type
    id?: string;
    token?: string;
    channel_id?: string;
    d?: {
        id?: string;
        content?: string;
        author?: { id: string; bot?: boolean };
        channel_id?: string;
        timestamp?: string;
    };
    data?: {
        custom_id?: string;
    };
    member?: { user?: { id: string } };
    user?: { id: string };
}
