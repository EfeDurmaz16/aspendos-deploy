/**
 * Slack Card Renderer
 *
 * Generates Slack Block Kit JSON for approval cards.
 * Re-exports from the platform adapter for clean imports.
 */

import { buildSlackApprovalBlocks, buildSlackResolvedBlocks } from '../platforms/slack';
import type { ApprovalPayload, PlatformCardRenderer } from '../types';

export const slackCardRenderer: PlatformCardRenderer = {
    renderApprovalCard(payload: ApprovalPayload, _callbackUrl: string) {
        return buildSlackApprovalBlocks(payload, _callbackUrl);
    },
};

export function renderSlackApprovalCard(payload: ApprovalPayload, callbackUrl: string) {
    return buildSlackApprovalBlocks(payload, callbackUrl);
}

export function renderSlackResolvedCard(
    payload: ApprovalPayload,
    decision: 'approved' | 'rejected',
    decidedBy: string
) {
    return buildSlackResolvedBlocks(payload, decision, decidedBy);
}
