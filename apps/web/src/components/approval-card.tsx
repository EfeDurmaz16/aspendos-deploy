'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import type { ReversibilityClass } from '@aspendos/shared-types';

// ============================================
// Types
// ============================================

export interface ApprovalCardProps {
    /** Convex approval document ID */
    approvalId: Id<'approvals'>;
    commitHash: string;
    toolName: string;
    humanExplanation: string;
    reversibilityClass: ReversibilityClass;
    badgeLabel: string;
    expiresAt?: string;
    /** Callback after approve action */
    onApprove?: () => void;
    /** Callback after reject action */
    onReject?: () => void;
    /** Callback for always-allow */
    onAlwaysAllow?: () => void;
}

// ============================================
// Badge Styles
// ============================================

const BADGE_STYLES: Record<ReversibilityClass, string> = {
    undoable: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelable_window: 'bg-green-500/20 text-green-400 border-green-500/30',
    compensatable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approval_only: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    irreversible_blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const BADGE_EMOJI: Record<ReversibilityClass, string> = {
    undoable: '🟢',
    cancelable_window: '🟢',
    compensatable: '🟡',
    approval_only: '🟠',
    irreversible_blocked: '🔴',
};

// ============================================
// Component
// ============================================

export function ApprovalCard({
    approvalId,
    commitHash,
    toolName,
    humanExplanation,
    reversibilityClass,
    badgeLabel,
    expiresAt,
    onApprove,
    onReject,
    onAlwaysAllow,
}: ApprovalCardProps) {
    const [processing, setProcessing] = useState<'approve' | 'reject' | null>(null);
    const [resolved, setResolved] = useState<'approved' | 'rejected' | null>(null);

    const approveMutation = useMutation(api.approvals.approve);
    const rejectMutation = useMutation(api.approvals.reject);
    const logMutation = useMutation(api.actionLog.log);

    const badgeStyle = BADGE_STYLES[reversibilityClass] ?? BADGE_STYLES.irreversible_blocked;
    const emoji = BADGE_EMOJI[reversibilityClass] ?? '?';

    async function handleApprove() {
        setProcessing('approve');
        try {
            await approveMutation({ id: approvalId });
            await logMutation({
                event_type: 'approval.approve',
                details: { commit_hash: commitHash, surface: 'web' },
            });
            setResolved('approved');
            onApprove?.();
        } catch (err) {
            console.error('Approval failed:', err);
        } finally {
            setProcessing(null);
        }
    }

    async function handleReject() {
        setProcessing('reject');
        try {
            await rejectMutation({ id: approvalId });
            await logMutation({
                event_type: 'approval.reject',
                details: { commit_hash: commitHash, surface: 'web' },
            });
            setResolved('rejected');
            onReject?.();
        } catch (err) {
            console.error('Rejection failed:', err);
        } finally {
            setProcessing(null);
        }
    }

    if (resolved) {
        const resolvedEmoji = resolved === 'approved' ? '✅' : '❌';
        return (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-4 space-y-2 max-w-md">
                <div className="flex items-center gap-2">
                    <span>{resolvedEmoji}</span>
                    <span className="font-medium text-sm text-neutral-200">
                        {resolved === 'approved' ? 'Approved' : 'Rejected'}: {toolName}
                    </span>
                </div>
                <p className="text-sm text-neutral-500">{humanExplanation}</p>
                <code className="text-xs text-neutral-600 font-mono">{commitHash.slice(0, 8)}</code>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-4 space-y-3 max-w-md">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span>{emoji}</span>
                    <span className="font-medium text-sm text-neutral-200">{toolName}</span>
                </div>
                <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
                >
                    {badgeLabel}
                </span>
            </div>

            <p className="text-sm text-neutral-400">{humanExplanation}</p>

            <div className="flex items-center gap-2 text-xs text-neutral-500">
                <code className="font-mono">{commitHash.slice(0, 8)}</code>
                {expiresAt && <span>Expires: {expiresAt}</span>}
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={handleApprove}
                    disabled={processing !== null}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button
                    type="button"
                    onClick={handleReject}
                    disabled={processing !== null}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
                {onAlwaysAllow && (
                    <button
                        type="button"
                        onClick={onAlwaysAllow}
                        disabled={processing !== null}
                        className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                        Always Allow
                    </button>
                )}
            </div>
        </div>
    );
}
