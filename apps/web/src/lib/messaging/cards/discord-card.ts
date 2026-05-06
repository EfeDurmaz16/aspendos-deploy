/**
 * Discord Card Renderer
 *
 * Generates Discord embed + button components for approval cards.
 */

import { buildDiscordApprovalMessage, buildDiscordResolvedMessage } from '../platforms/discord';
import type { ApprovalPayload, PlatformCardRenderer } from '../types';

export const discordCardRenderer: PlatformCardRenderer = {
    renderApprovalCard(payload: ApprovalPayload, _callbackUrl: string) {
        return buildDiscordApprovalMessage(payload);
    },
};

export function renderDiscordApprovalCard(payload: ApprovalPayload) {
    return buildDiscordApprovalMessage(payload);
}

export function renderDiscordResolvedCard(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
) {
    return buildDiscordResolvedMessage(payload, decision, decidedBy);
}
