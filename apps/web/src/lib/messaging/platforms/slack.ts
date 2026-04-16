/**
 * Slack Platform Adapter
 *
 * Handles Slack-specific formatting, Block Kit structures,
 * slash command registration, and interactive message payloads.
 *
 * The Vercel Chat SDK createSlackAdapter() handles webhook verification,
 * event parsing, and message posting. This module provides supplementary
 * utilities for Slack-native features beyond the SDK.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_COLORS, BADGE_EMOJI } from '../../messaging/badge-constants';

// ============================================
// Slack Block Kit Helpers
// ============================================

export interface SlackBlock {
    type: string;
    [key: string]: unknown;
}

/**
 * Build Slack Block Kit for an approval card.
 * Used when you need raw Block Kit JSON outside the Chat SDK Card abstraction,
 * e.g. for Slack API direct calls or interactive message updates.
 */
export function buildSlackApprovalBlocks(
    payload: ApprovalPayload,
    callbackUrl: string
): SlackBlock[] {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';

    const blocks: SlackBlock[] = [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} Approval Required: ${toolName}`,
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: humanExplanation,
            },
        },
        { type: 'divider' },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `*Reversibility:* ${badgeLabel} | *Commit:* \`${commitHash.slice(0, 8)}\`${expiresAt ? ` | *Expires:* ${expiresAt}` : ''}`,
                },
            ],
        },
        {
            type: 'actions',
            block_id: `approval_${commitHash}`,
            elements: [
                {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Approve', emoji: true },
                    style: 'primary',
                    action_id: 'approve',
                    value: commitHash,
                },
                {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Reject', emoji: true },
                    style: 'danger',
                    action_id: 'reject',
                    value: commitHash,
                },
            ],
        },
    ];

    return blocks;
}

/**
 * Build the updated Block Kit for a resolved approval (approved/rejected).
 */
export function buildSlackResolvedBlocks(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): SlackBlock[] {
    const emoji = decision === 'approved' ? '✅' : '❌';
    return [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: `${emoji} ${decision === 'approved' ? 'Approved' : 'Rejected'}: ${payload.toolName}`,
                emoji: true,
            },
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: payload.humanExplanation,
            },
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `${decision === 'approved' ? 'Approved' : 'Rejected'} by <@${decidedBy}> | \`${payload.commitHash.slice(0, 8)}\``,
                },
            ],
        },
    ];
}

// ============================================
// Slash Command Parsing
// ============================================

export interface SlackSlashCommand {
    command: string;
    text: string;
    userId: string;
    channelId: string;
    responseUrl: string;
    triggerId: string;
}

export function parseSlashCommand(body: URLSearchParams): SlackSlashCommand {
    return {
        command: body.get('command') || '',
        text: body.get('text') || '',
        userId: body.get('user_id') || '',
        channelId: body.get('channel_id') || '',
        responseUrl: body.get('response_url') || '',
        triggerId: body.get('trigger_id') || '',
    };
}

// ============================================
// Interactive Payload Parsing
// ============================================

export interface SlackInteractionPayload {
    type: string;
    actions: Array<{
        action_id: string;
        value: string;
    }>;
    user: { id: string; username: string };
    channel: { id: string };
    message: { ts: string };
    responseUrl: string;
}

export function parseInteractionPayload(payloadStr: string): SlackInteractionPayload {
    return JSON.parse(payloadStr);
}

/**
 * Update a Slack message via response_url after approval/rejection.
 */
export async function updateSlackMessage(responseUrl: string, blocks: SlackBlock[]): Promise<void> {
    await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            replace_original: 'true',
            blocks,
        }),
    });
}
