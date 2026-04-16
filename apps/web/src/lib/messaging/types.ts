import type { ReversibilityClass } from '@aspendos/shared-types';

// ============================================
// Platform Types
// ============================================

export type Platform =
    | 'slack'
    | 'telegram'
    | 'discord'
    | 'whatsapp'
    | 'teams'
    | 'gchat'
    | 'github'
    | 'linear';

export interface IncomingMessage {
    platform: Platform;
    platformUserId: string;
    platformThreadId?: string;
    text: string;
    /** Raw platform payload for adapter-specific handling */
    raw: unknown;
}

export interface ApprovalPayload {
    commitHash: string;
    toolName: string;
    args: unknown;
    humanExplanation: string;
    reversibilityClass: ReversibilityClass;
    badgeLabel: string;
    expiresAt?: string;
}

export interface ApprovalCallbackEvent {
    platform: Platform;
    commitHash: string;
    action: 'approve' | 'reject';
    platformUserId: string;
    /** Platform-specific message ID for updating the card */
    surfaceMessageId?: string;
}

export interface PlatformCardRenderer {
    renderApprovalCard(payload: ApprovalPayload, callbackUrl: string): unknown;
}
