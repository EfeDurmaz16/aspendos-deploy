/**
 * Telegram Card Renderer
 *
 * Generates Telegram inline keyboard markup for approval cards.
 */

import type { ApprovalPayload, PlatformCardRenderer } from '../types';
import { formatApprovalMessage, formatResolvedMessage } from '../platforms/telegram';

export const telegramCardRenderer: PlatformCardRenderer = {
    renderApprovalCard(payload: ApprovalPayload, _callbackUrl: string) {
        return formatApprovalMessage(payload);
    },
};

export function renderTelegramApprovalCard(payload: ApprovalPayload) {
    return formatApprovalMessage(payload);
}

export function renderTelegramResolvedCard(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
) {
    return formatResolvedMessage(payload, decision, decidedBy);
}
