'use client';

import { useState, useCallback, useTransition } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { ReversibilityBadge } from '@/components/reversibility-badge';
import type { ReversibilityClass } from '@/lib/reversibility/types';
import { REVERSIBILITY_SPECS } from '@/lib/reversibility/types';
import { dispatchRollback } from '@/lib/reversibility/dispatch';
import type { AgitCommit } from '@/lib/reversibility/types';
import { useAuth } from '@/hooks/use-auth';

// ── Status indicator dot ─────────────────────────────────────

function StatusDot({ status }: { status: string }) {
    const colors: Record<string, string> = {
        executed: 'bg-green-400',
        pending: 'bg-yellow-400 animate-pulse',
        reverted: 'bg-amber-400',
        failed: 'bg-red-400',
    };
    return <div className={`h-2.5 w-2.5 rounded-full ${colors[status] ?? 'bg-neutral-600'}`} />;
}

// ── Timeline connector line ──────────────────────────────────

function TimelineConnector() {
    return <div className="absolute left-[5px] top-7 bottom-0 w-px bg-neutral-800" />;
}

// ── Single timeline entry ────────────────────────────────────

interface TimelineEntryProps {
    commit: AgitCommit;
    isLast: boolean;
    onUndo: (commit: AgitCommit) => void;
    onRewindHere: (commit: AgitCommit) => void;
    undoingHash: string | null;
    rewindingTo: string | null;
}

function TimelineEntry({
    commit,
    isLast,
    onUndo,
    onRewindHere,
    undoingHash,
    rewindingTo,
}: TimelineEntryProps) {
    const spec = REVERSIBILITY_SPECS[commit.reversibility_class];
    const canUndo = spec.canUndo && commit.status === 'executed';
    const isUndoing = undoingHash === commit.hash;
    const isRewinding = rewindingTo === commit.hash;

    return (
        <div className="relative flex items-start gap-4 pl-6">
            {/* Timeline dot + connector */}
            <div className="absolute left-0 top-1.5">
                <StatusDot status={commit.status} />
                {!isLast && <TimelineConnector />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-medium text-sm text-neutral-200 font-mono">
                        {commit.tool_name}
                    </span>
                    <ReversibilityBadge cls={commit.reversibility_class} />
                    <span className="text-xs text-neutral-500 ml-auto">
                        {new Date(commit.timestamp).toLocaleString()}
                    </span>
                </div>

                {commit.human_explanation && (
                    <p className="text-sm text-neutral-400 mb-2">{commit.human_explanation}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <code className="font-mono bg-neutral-800/50 px-1.5 py-0.5 rounded">
                        {commit.hash.slice(0, 8)}
                    </code>
                    <span
                        className={
                            commit.status === 'executed'
                                ? 'text-green-400'
                                : commit.status === 'reverted'
                                  ? 'text-amber-400'
                                  : commit.status === 'failed'
                                    ? 'text-red-400'
                                    : 'text-neutral-400'
                        }
                    >
                        {commit.status}
                    </span>
                    {commit.fides_signer_did && (
                        <span className="text-blue-400" title={commit.fides_signer_did}>
                            signed
                        </span>
                    )}
                    {commit.rollback_deadline && commit.status === 'executed' && (
                        <CancelCountdown deadline={commit.rollback_deadline} />
                    )}
                </div>

                {/* Action buttons */}
                {commit.status === 'executed' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-800/50">
                        {canUndo && (
                            <button
                                type="button"
                                onClick={() => onUndo(commit)}
                                disabled={isUndoing}
                                className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-700 transition-colors disabled:opacity-50"
                            >
                                {isUndoing ? 'Undoing...' : 'Undo'}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onRewindHere(commit)}
                            disabled={isRewinding}
                            className="rounded-md border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-900/40 transition-colors disabled:opacity-50"
                        >
                            {isRewinding ? 'Rewinding...' : 'Rewind here'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Cancel window countdown ──────────────────────────────────

function CancelCountdown({ deadline }: { deadline: number }) {
    const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
    if (remaining <= 0) return null;
    return <span className="text-yellow-400 font-medium">{remaining}s to cancel</span>;
}

// ── Filter bar ───────────────────────────────────────────────

const ALL_CLASSES: ReversibilityClass[] = [
    'undoable',
    'cancelable_window',
    'compensatable',
    'approval_only',
    'irreversible_blocked',
];

function FilterBar({
    active,
    onToggle,
}: {
    active: Set<ReversibilityClass>;
    onToggle: (cls: ReversibilityClass) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {ALL_CLASSES.map((cls) => {
                const spec = REVERSIBILITY_SPECS[cls];
                const isActive = active.has(cls);
                return (
                    <button
                        key={cls}
                        type="button"
                        onClick={() => onToggle(cls)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                            isActive
                                ? `${spec.color} ${spec.textColor} ${spec.borderColor}`
                                : 'bg-neutral-900 text-neutral-500 border-neutral-800 opacity-50'
                        }`}
                    >
                        <span>{spec.emoji}</span>
                        <span>{spec.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Main page ────────────────────────────────────────────────

export default function TimelinePage() {
    const { isLoaded, isSignedIn, userId: workosUserId } = useAuth();

    // Resolve Convex user id from the authenticated WorkOS id
    const convexUser = useQuery(
        api.users.getByWorkOSId,
        workosUserId ? { workos_id: workosUserId } : 'skip'
    );

    // Real-time Convex subscription for commits, scoped to the authenticated user
    const commits = useQuery(
        api.commits.listByUser,
        convexUser?._id ? { user_id: convexUser._id, limit: 200 } : 'skip'
    );

    const [activeFilters, setActiveFilters] = useState<Set<ReversibilityClass>>(
        new Set(ALL_CLASSES)
    );
    const [undoingHash, setUndoingHash] = useState<string | null>(null);
    const [rewindingTo, setRewindingTo] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
        null
    );
    const [isPending, startTransition] = useTransition();

    const toggleFilter = useCallback((cls: ReversibilityClass) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(cls)) next.delete(cls);
            else next.add(cls);
            return next;
        });
    }, []);

    const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback(null), 4000);
    }, []);

    const handleUndo = useCallback(
        async (commit: AgitCommit) => {
            setUndoingHash(commit.hash);
            try {
                const result = await dispatchRollback(commit);
                showFeedback(result.success ? 'success' : 'error', result.message);
            } catch (err) {
                showFeedback(
                    'error',
                    `Undo failed: ${err instanceof Error ? err.message : String(err)}`
                );
            } finally {
                setUndoingHash(null);
            }
        },
        [showFeedback]
    );

    const handleRewind = useCallback(
        async (targetCommit: AgitCommit) => {
            if (!commits) return;

            const commitsAfter = commits.filter(
                (c: any) => c.timestamp > targetCommit.timestamp && c.status === 'executed'
            );

            if (commitsAfter.length === 0) {
                showFeedback('error', 'No commits after this point to rewind.');
                return;
            }

            const confirmed = window.confirm(
                `Rewind will attempt to undo ${commitsAfter.length} commit(s) after ${targetCommit.hash.slice(0, 8)}. Continue?`
            );
            if (!confirmed) return;

            setRewindingTo(targetCommit.hash);

            try {
                const res = await fetch('/api/undo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        commit_hash: targetCommit.hash,
                        strategy: 'rewind',
                    }),
                });
                const data = await res.json();

                if (data.success) {
                    showFeedback(
                        'success',
                        `Rewound ${data.reverted_count ?? 0} commit(s). ${data.failed_hashes?.length ? `${data.failed_hashes.length} could not be reverted.` : ''}`
                    );
                } else {
                    showFeedback('error', data.message ?? 'Rewind failed.');
                }
            } catch (err) {
                showFeedback(
                    'error',
                    `Rewind error: ${err instanceof Error ? err.message : String(err)}`
                );
            } finally {
                setRewindingTo(null);
            }
        },
        [commits, showFeedback]
    );

    const filteredCommits =
        commits?.filter((c: any) => activeFilters.has(c.reversibility_class)) ?? [];

    // Auth gates — loading and signed-out states
    if (!isLoaded) {
        return (
            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="text-center py-12 text-neutral-500">Loading...</div>
            </div>
        );
    }

    if (!isSignedIn) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        return (
            <div className="mx-auto max-w-3xl px-4 py-8">
                <div className="text-center py-12 text-neutral-500">Redirecting to sign in...</div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-neutral-100">Timeline</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Every agent action — classified, signed, rewindable.
                </p>
            </div>

            {/* Feedback toast */}
            {feedback && (
                <div
                    className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
                        feedback.type === 'success'
                            ? 'border-green-700/50 bg-green-900/20 text-green-400'
                            : 'border-red-700/50 bg-red-900/20 text-red-400'
                    }`}
                >
                    {feedback.message}
                </div>
            )}

            {/* Filters */}
            <div className="mb-6">
                <FilterBar active={activeFilters} onToggle={toggleFilter} />
            </div>

            {/* Legend */}
            <div className="mb-6 flex items-center gap-4 text-[10px] text-neutral-500">
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400" /> executed
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" /> pending
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> reverted
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-400" /> failed
                </span>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
                {commits === undefined && (
                    <div className="text-center py-12 text-neutral-500">Loading timeline...</div>
                )}
                {commits !== undefined && filteredCommits.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                        {commits.length === 0
                            ? 'No actions yet. Start a conversation to see your timeline.'
                            : 'No commits match the current filters.'}
                    </div>
                )}
                {filteredCommits.map((commit: any, i: number) => (
                    <TimelineEntry
                        key={commit._id}
                        commit={commit as AgitCommit}
                        isLast={i === filteredCommits.length - 1}
                        onUndo={handleUndo}
                        onRewindHere={handleRewind}
                        undoingHash={undoingHash}
                        rewindingTo={rewindingTo}
                    />
                ))}
            </div>
        </div>
    );
}
