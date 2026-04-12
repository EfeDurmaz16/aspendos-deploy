'use client';

import type { ApprovalCardProps, ReversibilityClass } from '@aspendos/shared-types';

const BADGE_STYLES: Record<ReversibilityClass, string> = {
    undoable: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelable_window: 'bg-green-500/20 text-green-400 border-green-500/30',
    compensatable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approval_only: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    irreversible_blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function ApprovalCard({
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
    const badgeStyle = BADGE_STYLES[reversibilityClass] ?? BADGE_STYLES.irreversible_blocked;

    return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-4 space-y-3 max-w-md">
            <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-neutral-200">{toolName}</span>
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

            {(onApprove || onReject) && (
                <div className="flex gap-2 pt-1">
                    {onApprove && (
                        <button
                            type="button"
                            onClick={onApprove}
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-500 transition-colors"
                        >
                            Approve
                        </button>
                    )}
                    {onReject && (
                        <button
                            type="button"
                            onClick={onReject}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors"
                        >
                            Reject
                        </button>
                    )}
                    {onAlwaysAllow && (
                        <button
                            type="button"
                            onClick={onAlwaysAllow}
                            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
                        >
                            Always Allow
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
