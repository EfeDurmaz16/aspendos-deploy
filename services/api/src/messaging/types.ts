import type { ReversibilityClass } from '../reversibility/types';

export interface ApprovalCard {
    commitHash: string;
    toolName: string;
    humanExplanation: string;
    reversibilityClass: ReversibilityClass;
    badgeColor: string;
    badgeLabel: string;
    args: unknown;
    expiresAt?: string;
}

export const BADGE_COLORS: Record<ReversibilityClass, string> = {
    undoable: '#22c55e',
    cancelable_window: '#22c55e',
    compensatable: '#eab308',
    approval_only: '#f59e0b',
    irreversible_blocked: '#ef4444',
};

export const BADGE_HEX: Record<ReversibilityClass, number> = {
    undoable: 0x22c55e,
    cancelable_window: 0x22c55e,
    compensatable: 0xeab308,
    approval_only: 0xf59e0b,
    irreversible_blocked: 0xef4444,
};

export const BADGE_EMOJI: Record<ReversibilityClass, string> = {
    undoable: '🟢',
    cancelable_window: '🟢',
    compensatable: '🟡',
    approval_only: '🟠',
    irreversible_blocked: '🔴',
};

export function createApprovalCard(
    commitHash: string,
    toolName: string,
    humanExplanation: string,
    reversibilityClass: ReversibilityClass,
    args: unknown,
    expiresAt?: string,
): ApprovalCard {
    return {
        commitHash,
        toolName,
        humanExplanation,
        reversibilityClass,
        badgeColor: BADGE_COLORS[reversibilityClass],
        badgeLabel: reversibilityClass.replace(/_/g, ' '),
        args,
        expiresAt,
    };
}
