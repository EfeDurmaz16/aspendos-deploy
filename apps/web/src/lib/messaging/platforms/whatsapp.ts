/**
 * WhatsApp Platform Adapter
 *
 * Handles WhatsApp Cloud API interactive messages, button formatting
 * for approvals, and webhook verification.
 *
 * The Vercel Chat SDK createWhatsAppAdapter() handles webhook setup
 * and basic message flow. This module provides supplementary
 * utilities for WhatsApp-native interactive message types.
 */

import type { ApprovalPayload } from '../types';
import { BADGE_EMOJI } from '../../messaging/badge-constants';

const WHATSAPP_API = 'https://graph.facebook.com/v21.0';

function getConfig() {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) throw new Error('WhatsApp env vars not set');
    return { token, phoneNumberId };
}

// ============================================
// Interactive Message Types
// ============================================

export interface WhatsAppInteractiveMessage {
    messaging_product: 'whatsapp';
    recipient_type: 'individual';
    to: string;
    type: 'interactive';
    interactive: {
        type: 'button';
        header?: { type: 'text'; text: string };
        body: { text: string };
        footer?: { text: string };
        action: {
            buttons: Array<{
                type: 'reply';
                reply: { id: string; title: string };
            }>;
        };
    };
}

export interface WhatsAppTextMessage {
    messaging_product: 'whatsapp';
    recipient_type: 'individual';
    to: string;
    type: 'text';
    text: { body: string };
}

// ============================================
// Approval Message Builder
// ============================================

/**
 * Build a WhatsApp interactive button message for approvals.
 * WhatsApp limits to 3 buttons max with 20 char titles.
 */
export function buildWhatsAppApprovalMessage(
    to: string,
    payload: ApprovalPayload
): WhatsAppInteractiveMessage {
    const { commitHash, toolName, humanExplanation, reversibilityClass, badgeLabel, expiresAt } =
        payload;
    const emoji = BADGE_EMOJI[reversibilityClass] || '?';

    const bodyLines = [
        humanExplanation,
        '',
        `Reversibility: ${badgeLabel}`,
        `Commit: ${commitHash.slice(0, 8)}`,
    ];

    if (expiresAt) {
        bodyLines.push(`Expires: ${expiresAt}`);
    }

    return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            header: {
                type: 'text',
                text: `${emoji} ${toolName}`,
            },
            body: {
                text: bodyLines.join('\n'),
            },
            footer: {
                text: 'YULA Governance',
            },
            action: {
                buttons: [
                    {
                        type: 'reply',
                        reply: { id: `approve:${commitHash}`, title: 'Approve' },
                    },
                    {
                        type: 'reply',
                        reply: { id: `reject:${commitHash}`, title: 'Reject' },
                    },
                ],
            },
        },
    };
}

/**
 * Build a plain text message for resolved approvals.
 * WhatsApp doesn't support editing sent messages, so we send a follow-up.
 */
export function buildWhatsAppResolvedMessage(
    to: string,
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
): WhatsAppTextMessage {
    const emoji = decision === 'approved' ? '✅' : '❌';
    return {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
            body: `${emoji} ${decision === 'approved' ? 'Approved' : 'Rejected'}: ${payload.toolName}\n\nDecision by: ${decidedBy}\nCommit: ${payload.commitHash.slice(0, 8)}`,
        },
    };
}

// ============================================
// WhatsApp Cloud API Calls
// ============================================

/**
 * Send a message via WhatsApp Cloud API.
 */
export async function sendWhatsAppMessage(
    message: WhatsAppInteractiveMessage | WhatsAppTextMessage
): Promise<{ messages: Array<{ id: string }> }> {
    const { token, phoneNumberId } = getConfig();

    const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });

    if (!res.ok) {
        const error = await res.text();
        throw new Error(`WhatsApp API error: ${res.status} - ${error}`);
    }

    return res.json();
}

// ============================================
// Button Reply Parsing
// ============================================

export interface WhatsAppButtonReply {
    action: 'approve' | 'reject';
    commitHash: string;
}

/**
 * Parse a button reply callback from WhatsApp webhook.
 * WhatsApp sends button replies as interactive.button_reply.id
 */
export function parseButtonReply(buttonId: string): WhatsAppButtonReply | null {
    const [action, commitHash] = buttonId.split(':');
    if ((action === 'approve' || action === 'reject') && commitHash) {
        return { action, commitHash };
    }
    return null;
}

/**
 * Extract button reply from a WhatsApp webhook payload.
 */
export function extractButtonReplyFromWebhook(body: any): WhatsAppButtonReply | null {
    try {
        const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (message?.type === 'interactive' && message?.interactive?.type === 'button_reply') {
            return parseButtonReply(message.interactive.button_reply.id);
        }
    } catch {
        // Not a button reply
    }
    return null;
}

/**
 * Extract sender phone number from a WhatsApp webhook payload.
 */
export function extractSenderFromWebhook(body: any): string | null {
    try {
        return body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || null;
    } catch {
        return null;
    }
}

// ============================================
// Webhook Verification
// ============================================

/**
 * Handle WhatsApp webhook verification (GET request).
 */
export function verifyWebhook(url: URL): Response | null {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return new Response(challenge, { status: 200 });
    }

    return null;
}
