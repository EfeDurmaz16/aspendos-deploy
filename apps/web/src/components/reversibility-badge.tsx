import type { ReversibilityClass } from '@aspendos/shared-types';

const STYLES: Record<ReversibilityClass, string> = {
    undoable: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelable_window: 'bg-green-500/20 text-green-400 border-green-500/30',
    compensatable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approval_only: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    irreversible_blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const LABELS: Record<ReversibilityClass, string> = {
    undoable: 'Undoable',
    cancelable_window: 'Cancel Window',
    compensatable: 'Compensatable',
    approval_only: 'Approval Required',
    irreversible_blocked: 'Blocked',
};

export function ReversibilityBadge({ cls }: { cls: ReversibilityClass }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[cls]}`}
        >
            {LABELS[cls]}
        </span>
    );
}
