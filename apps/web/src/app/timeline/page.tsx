'use client';

import { useState, useEffect } from 'react';

const BADGE_COLORS: Record<string, string> = {
    undoable: 'bg-green-500/20 text-green-400 border-green-500/30',
    cancelable_window: 'bg-green-500/20 text-green-400 border-green-500/30',
    compensatable: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approval_only: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    irreversible_blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function ReversibilityBadge({ cls }: { cls: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[cls] ?? 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30'}`}
        >
            {cls.replace(/_/g, ' ')}
        </span>
    );
}

function TimelineEntry({ commit }: { commit: any }) {
    return (
        <div className="flex items-start gap-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex-shrink-0 mt-1">
                <div className="h-3 w-3 rounded-full bg-neutral-600" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-neutral-200">{commit.tool_name}</span>
                    <ReversibilityBadge cls={commit.reversibility_class} />
                    <span className="text-xs text-neutral-500">
                        {new Date(commit.timestamp).toLocaleString()}
                    </span>
                </div>
                {commit.human_explanation && (
                    <p className="text-sm text-neutral-400 mb-2">{commit.human_explanation}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                    <code className="font-mono">{commit.hash?.slice(0, 8)}</code>
                    <span
                        className={`${commit.status === 'executed' ? 'text-green-400' : commit.status === 'reverted' ? 'text-amber-400' : commit.status === 'failed' ? 'text-red-400' : 'text-neutral-400'}`}
                    >
                        {commit.status}
                    </span>
                    {commit.fides_signer_did && (
                        <span title={commit.fides_signer_did}>signed</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function TimelinePage() {
    const [commits, setCommits] = useState<any[] | null>(null);

    useEffect(() => {
        fetch('/api/timeline')
            .then((r) => (r.ok ? r.json() : { commits: [] }))
            .then((d) => setCommits(d.commits ?? []))
            .catch(() => setCommits([]));
    }, []);

    return (
        <div className="mx-auto max-w-3xl px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-neutral-100">Timeline</h1>
                <p className="text-sm text-neutral-400 mt-1">
                    Every action your agent took — signed, committed, verifiable.
                </p>
            </div>

            <div className="space-y-3">
                {!commits && (
                    <div className="text-center py-12 text-neutral-500">
                        Loading timeline...
                    </div>
                )}
                {commits?.length === 0 && (
                    <div className="text-center py-12 text-neutral-500">
                        No actions yet. Start a conversation to see your timeline.
                    </div>
                )}
                {commits?.map((commit: any) => (
                    <TimelineEntry key={commit._id} commit={commit} />
                ))}
            </div>
        </div>
    );
}
