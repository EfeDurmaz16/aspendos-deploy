/**
 * Microsoft Teams Platform Adapter (Stub)
 *
 * Adaptive Card format for approvals. Activate when Teams adapter
 * becomes available in Vercel Chat SDK or when direct Bot Framework
 * integration is needed.
 *
 * Teams uses Adaptive Cards v1.5+ for interactive content.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_EMOJI } from '@aspendos/core/messaging/types';

// ============================================
// Adaptive Card Types
// ============================================

export interface AdaptiveCard {
    type: 'AdaptiveCard';
    $schema: string;
    version: string;
    body: AdaptiveElement[];
    actions?: AdaptiveAction[];
}

export type AdaptiveElement =
    | {
          type: 'TextBlock';
          text: string;
          weight?: string;
          size?: string;
          color?: string;
          wrap?: boolean;
      }
    | {
          type: 'ColumnSet';
          columns: Array<{ type: 'Column'; width: string; items: AdaptiveElement[] }>;
      }
    | { type: 'FactSet'; facts: Array<{ title: string; value: string }> };

export type AdaptiveAction =
    | { type: 'Action.Submit'; title: string; data: Record<string, unknown>; style?: string }
    | { type: 'Action.OpenUrl'; title: string; url: string };

// ============================================
// Approval Card Builder
// ============================================

export function buildTeamsApprovalCard(
    payload: ApprovalPayload,
    callbackUrl: string
): AdaptiveCard {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';

    const facts = [
        { title: 'Reversibility', value: `${emoji} ${badgeLabel}` },
        { title: 'Commit', value: commitHash.slice(0, 8) },
    ];

    if (expiresAt) {
        facts.push({ title: 'Expires', value: expiresAt });
    }

    return {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.5',
        body: [
            {
                type: 'TextBlock',
                text: `${emoji} Approval Required: ${toolName}`,
                weight: 'Bolder',
                size: 'Medium',
                wrap: true,
            },
            {
                type: 'TextBlock',
                text: humanExplanation,
                wrap: true,
            },
            {
                type: 'FactSet',
                facts,
            },
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Approve',
                data: { action: 'approve', commitHash, callbackUrl },
                style: 'positive',
            },
            {
                type: 'Action.Submit',
                title: 'Reject',
                data: { action: 'reject', commitHash, callbackUrl },
                style: 'destructive',
            },
        ],
    };
}

/**
 * Build a resolved card (no buttons).
 */
export function buildTeamsResolvedCard(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): AdaptiveCard {
    const emoji = decision === 'approved' ? '✅' : '❌';

    return {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.5',
        body: [
            {
                type: 'TextBlock',
                text: `${emoji} ${decision === 'approved' ? 'Approved' : 'Rejected'}: ${payload.toolName}`,
                weight: 'Bolder',
                size: 'Medium',
                wrap: true,
            },
            {
                type: 'TextBlock',
                text: payload.humanExplanation,
                wrap: true,
            },
            {
                type: 'FactSet',
                facts: [
                    { title: 'Decision By', value: decidedBy },
                    { title: 'Commit', value: payload.commitHash.slice(0, 8) },
                ],
            },
        ],
    };
}

// ============================================
// Stub: Teams Webhook Handler
// ============================================

/**
 * Placeholder for Teams webhook processing.
 * Activate when Teams adapter is integrated.
 */
export async function handleTeamsWebhook(_req: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: 'teams_not_activated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
