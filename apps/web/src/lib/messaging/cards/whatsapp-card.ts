/**
 * WhatsApp Card Renderer
 *
 * Generates WhatsApp interactive button messages for approval cards.
 */

import type { ApprovalPayload, PlatformCardRenderer } from '../types';
import { buildWhatsAppApprovalMessage, buildWhatsAppResolvedMessage } from '../platforms/whatsapp';

export const whatsappCardRenderer: PlatformCardRenderer = {
    renderApprovalCard(payload: ApprovalPayload, _callbackUrl: string) {
        // WhatsApp needs a recipient; return the builder for deferred use
        return { build: (to: string) => buildWhatsAppApprovalMessage(to, payload) };
    },
};

export function renderWhatsAppApprovalCard(to: string, payload: ApprovalPayload) {
    return buildWhatsAppApprovalMessage(to, payload);
}

export function renderWhatsAppResolvedCard(
    to: string,
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
) {
    return buildWhatsAppResolvedMessage(to, payload, decision, decidedBy);
}
