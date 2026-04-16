/**
 * Discord Platform Adapter
 *
 * Handles Discord embed formatting, button components for approvals,
 * and interaction payload verification.
 *
 * The Vercel Chat SDK createDiscordAdapter() handles webhook events,
 * message parsing, and basic posting. This module provides supplementary
 * utilities for Discord-native embed + component features.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_HEX, BADGE_EMOJI } from '../../messaging/badge-constants';

// ============================================
// Discord Embed Types
// ============================================

export interface DiscordEmbed {
    title: string;
    description: string;
    color: number;
    fields: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
    footer?: { text: string };
    timestamp?: string;
}

export interface DiscordButtonComponent {
    type: 2; // Button
    style: 1 | 2 | 3 | 4; // Primary, Secondary, Success, Danger
    label: string;
    custom_id: string;
}

export interface DiscordActionRow {
    type: 1; // Action Row
    components: DiscordButtonComponent[];
}

export interface DiscordMessage {
    embeds: DiscordEmbed[];
    components: DiscordActionRow[];
}

// ============================================
// Approval Card Builder
// ============================================

export function buildDiscordApprovalMessage(payload: ApprovalPayload): DiscordMessage {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';
    const color = BADGE_HEX[reversibilityClass] || 0x808080;

    const fields = [
        { name: 'Reversibility', value: `${emoji} ${badgeLabel}`, inline: true },
        { name: 'Commit', value: `\`${commitHash.slice(0, 8)}\``, inline: true },
    ];

    if (expiresAt) {
        fields.push({ name: 'Expires', value: expiresAt, inline: true });
    }

    return {
        embeds: [
            {
                title: `${emoji} Approval Required: ${toolName}`,
                description: humanExplanation,
                color,
                fields,
                footer: { text: 'YULA Governance' },
            },
        ],
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3, // Success (green)
                        label: 'Approve',
                        custom_id: `approve:${commitHash}`,
                    },
                    {
                        type: 2,
                        style: 4, // Danger (red)
                        label: 'Reject',
                        custom_id: `reject:${commitHash}`,
                    },
                ],
            },
        ],
    };
}

/**
 * Build the updated message for a resolved approval (removes buttons).
 */
export function buildDiscordResolvedMessage(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): DiscordMessage {
    const emoji = decision === 'approved' ? '✅' : '❌';
    const color = decision === 'approved' ? 0x22c55e : 0xef4444;

    return {
        embeds: [
            {
                title: `${emoji} ${decision === 'approved' ? 'Approved' : 'Rejected'}: ${payload.toolName}`,
                description: payload.humanExplanation,
                color,
                fields: [
                    {
                        name: 'Decision By',
                        value: `<@${decidedBy}>`,
                        inline: true,
                    },
                    {
                        name: 'Commit',
                        value: `\`${payload.commitHash.slice(0, 8)}\``,
                        inline: true,
                    },
                ],
                footer: { text: 'YULA Governance' },
            },
        ],
        components: [], // Remove buttons
    };
}

// ============================================
// Interaction Parsing
// ============================================

export interface DiscordInteraction {
    type: number;
    data: {
        custom_id: string;
        component_type: number;
    };
    member?: { user: { id: string; username: string } };
    user?: { id: string; username: string };
    message: { id: string; channel_id: string };
    token: string;
}

export function parseInteractionCustomId(customId: string): {
    action: 'approve' | 'reject';
    commitHash: string;
} | null {
    const [action, commitHash] = customId.split(':');
    if ((action === 'approve' || action === 'reject') && commitHash) {
        return { action, commitHash };
    }
    return null;
}

// ============================================
// Discord API Calls
// ============================================

const DISCORD_API = 'https://discord.com/api/v10';

function getToken(): string {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw new Error('DISCORD_BOT_TOKEN not set');
    return token;
}

/**
 * Send a message with embeds and components to a Discord channel.
 */
export async function sendDiscordMessage(
    channelId: string,
    message: DiscordMessage
): Promise<{ id: string }> {
    const token = getToken();
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    if (!res.ok) throw new Error(`Discord API error: ${res.status}`);
    return res.json();
}

/**
 * Edit a message (e.g., remove buttons after approval).
 */
export async function editDiscordMessage(
    channelId: string,
    messageId: string,
    message: DiscordMessage
): Promise<void> {
    const token = getToken();
    await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}

/**
 * Respond to a Discord interaction (for button callbacks).
 */
export async function respondToInteraction(
    interactionId: string,
    interactionToken: string,
    content: string
): Promise<void> {
    await fetch(`${DISCORD_API}/interactions/${interactionId}/${interactionToken}/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
            data: { content, flags: 64 }, // Ephemeral
        }),
    });
}

// ============================================
// Signature Verification
// ============================================

export async function verifyDiscordSignature(
    body: string,
    signature: string,
    timestamp: string
): Promise<boolean> {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) return false;

    try {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            hexToUint8Array(publicKey),
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        const message = encoder.encode(timestamp + body);
        const sig = hexToUint8Array(signature);

        return await crypto.subtle.verify('Ed25519', key, sig, message);
    } catch {
        return false;
    }
}

function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}
