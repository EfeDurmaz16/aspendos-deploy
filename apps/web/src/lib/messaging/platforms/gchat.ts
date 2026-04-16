/**
 * Google Chat Platform Adapter (Stub)
 *
 * Google Chat Card v2 format for approvals. Activate when GChat adapter
 * becomes available in Vercel Chat SDK or when direct integration is needed.
 *
 * Google Chat uses Card v2 JSON for interactive content.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_EMOJI } from '../../messaging/badge-constants';

// ============================================
// Google Chat Card Types
// ============================================

export interface GChatCard {
    cardsV2: Array<{
        cardId: string;
        card: {
            header: { title: string; subtitle?: string };
            sections: GChatSection[];
        };
    }>;
}

export interface GChatSection {
    header?: string;
    widgets: GChatWidget[];
}

export type GChatWidget =
    | { textParagraph: { text: string } }
    | {
          decoratedText: {
              topLabel: string;
              text: string;
              icon?: { knownIcon: string };
          };
      }
    | {
          buttonList: {
              buttons: Array<{
                  text: string;
                  onClick: {
                      action: {
                          function: string;
                          parameters: Array<{ key: string; value: string }>;
                      };
                  };
                  color?: { red: number; green: number; blue: number };
              }>;
          };
      }
    | { divider: Record<string, never> };

// ============================================
// Approval Card Builder
// ============================================

export function buildGChatApprovalCard(payload: ApprovalPayload, callbackUrl: string): GChatCard {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';

    const infoWidgets: GChatWidget[] = [
        { textParagraph: { text: humanExplanation } },
        { divider: {} },
        {
            decoratedText: {
                topLabel: 'Reversibility',
                text: `${emoji} ${badgeLabel}`,
            },
        },
        {
            decoratedText: {
                topLabel: 'Commit',
                text: commitHash.slice(0, 8),
                icon: { knownIcon: 'BOOKMARK' },
            },
        },
    ];

    if (expiresAt) {
        infoWidgets.push({
            decoratedText: {
                topLabel: 'Expires',
                text: expiresAt,
                icon: { knownIcon: 'CLOCK' },
            },
        });
    }

    const actionWidgets: GChatWidget[] = [
        {
            buttonList: {
                buttons: [
                    {
                        text: 'Approve',
                        onClick: {
                            action: {
                                function: 'handleApproval',
                                parameters: [
                                    { key: 'action', value: 'approve' },
                                    { key: 'commitHash', value: commitHash },
                                    { key: 'callbackUrl', value: callbackUrl },
                                ],
                            },
                        },
                        color: { red: 0.13, green: 0.77, blue: 0.37 },
                    },
                    {
                        text: 'Reject',
                        onClick: {
                            action: {
                                function: 'handleApproval',
                                parameters: [
                                    { key: 'action', value: 'reject' },
                                    { key: 'commitHash', value: commitHash },
                                    { key: 'callbackUrl', value: callbackUrl },
                                ],
                            },
                        },
                        color: { red: 0.94, green: 0.27, blue: 0.27 },
                    },
                ],
            },
        },
    ];

    return {
        cardsV2: [
            {
                cardId: `approval_${commitHash}`,
                card: {
                    header: {
                        title: `${emoji} Approval Required`,
                        subtitle: toolName,
                    },
                    sections: [
                        { widgets: infoWidgets },
                        { header: 'Actions', widgets: actionWidgets },
                    ],
                },
            },
        ],
    };
}

/**
 * Build a resolved card (no buttons).
 */
export function buildGChatResolvedCard(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): GChatCard {
    const emoji = decision === 'approved' ? '✅' : '❌';

    return {
        cardsV2: [
            {
                cardId: `resolved_${payload.commitHash}`,
                card: {
                    header: {
                        title: `${emoji} ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
                        subtitle: payload.toolName,
                    },
                    sections: [
                        {
                            widgets: [
                                { textParagraph: { text: payload.humanExplanation } },
                                {
                                    decoratedText: {
                                        topLabel: 'Decision By',
                                        text: decidedBy,
                                    },
                                },
                            ],
                        },
                    ],
                },
            },
        ],
    };
}

// ============================================
// Stub: GChat Webhook Handler
// ============================================

/**
 * Placeholder for Google Chat webhook processing.
 * Activate when GChat adapter is integrated.
 */
export async function handleGChatWebhook(_req: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: 'gchat_not_activated' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
