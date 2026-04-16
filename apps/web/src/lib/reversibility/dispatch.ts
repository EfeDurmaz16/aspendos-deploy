/**
 * Rollback Dispatcher
 *
 * Given an AGIT commit, determines how to reverse it based on the
 * reversibility_class and rollback_strategy, then executes the rollback.
 */

import type { AgitCommit, RollbackResult, RollbackStrategy } from './types';

// ── Main dispatcher ──────────────────────────────────────────

export async function dispatchRollback(commit: AgitCommit): Promise<RollbackResult> {
    if (commit.status === 'reverted') {
        return { success: false, message: 'Commit already reverted.' };
    }

    if (commit.status === 'pending') {
        return { success: false, message: 'Commit still pending — nothing to revert.' };
    }

    if (commit.status === 'failed') {
        return { success: true, message: 'Commit failed during execution — no rollback needed.' };
    }

    const strategy = commit.rollback_strategy;
    if (!strategy || strategy.kind === 'none') {
        return {
            success: false,
            message: `No rollback strategy defined for ${commit.tool_name}.`,
        };
    }

    switch (commit.reversibility_class) {
        case 'undoable':
            return handleSnapshotRestore(commit, strategy);

        case 'cancelable_window':
            return handleCancelWindow(commit, strategy);

        case 'compensatable':
            return handleCompensation(commit, strategy);

        case 'approval_only':
            return {
                success: false,
                message:
                    'Approval-only actions require manual reversal. ' +
                    'Check the action log for details.',
            };

        case 'irreversible_blocked':
            return {
                success: false,
                message: 'This action was blocked and never executed — nothing to reverse.',
            };

        default:
            return {
                success: false,
                message: `Unknown reversibility class: ${commit.reversibility_class}`,
            };
    }
}

// ── Strategy handlers ────────────────────────────────────────

async function handleSnapshotRestore(
    commit: AgitCommit,
    strategy: RollbackStrategy
): Promise<RollbackResult> {
    if (strategy.kind !== 'snapshot_restore') {
        return {
            success: false,
            message: `Expected snapshot_restore strategy for undoable commit, got ${strategy.kind}`,
        };
    }

    try {
        const res = await fetch('/api/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commit_hash: commit.hash,
                strategy: 'snapshot_restore',
                snapshot_id: strategy.snapshot_id,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.message ?? 'Snapshot restore failed.' };
        }

        return {
            success: true,
            message: `Restored snapshot ${strategy.snapshot_id.slice(0, 8)}... — file reverted to prior state.`,
            reverted_commit_hash: commit.hash,
        };
    } catch (err) {
        return {
            success: false,
            message: `Snapshot restore error: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

async function handleCancelWindow(
    commit: AgitCommit,
    strategy: RollbackStrategy
): Promise<RollbackResult> {
    if (strategy.kind !== 'cancel_window') {
        return {
            success: false,
            message: `Expected cancel_window strategy, got ${strategy.kind}`,
        };
    }

    const now = Date.now();
    if (now > strategy.deadline_ms) {
        const expiredAgo = Math.round((now - strategy.deadline_ms) / 1000);
        return {
            success: false,
            message: `Cancel window expired ${expiredAgo}s ago. Action has already been dispatched.`,
        };
    }

    try {
        const res = await fetch('/api/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commit_hash: commit.hash,
                strategy: 'cancel_window',
                cancel_endpoint: strategy.cancel_endpoint,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.message ?? 'Cancellation failed.' };
        }

        const remainingSeconds = Math.round((strategy.deadline_ms - now) / 1000);
        return {
            success: true,
            message: `Cancelled with ${remainingSeconds}s remaining in the window.`,
            reverted_commit_hash: commit.hash,
        };
    } catch (err) {
        return {
            success: false,
            message: `Cancel error: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

async function handleCompensation(
    commit: AgitCommit,
    strategy: RollbackStrategy
): Promise<RollbackResult> {
    if (strategy.kind !== 'compensation') {
        return {
            success: false,
            message: `Expected compensation strategy, got ${strategy.kind}`,
        };
    }

    try {
        const res = await fetch('/api/undo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                commit_hash: commit.hash,
                strategy: 'compensation',
                compensate_tool: strategy.compensate_tool,
                compensate_args: strategy.compensate_args,
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            return { success: false, message: data.message ?? 'Compensation action failed.' };
        }

        return {
            success: true,
            message: `Compensation executed via ${strategy.compensate_tool}. Effect reversed.`,
            reverted_commit_hash: commit.hash,
        };
    } catch (err) {
        return {
            success: false,
            message: `Compensation error: ${err instanceof Error ? err.message : String(err)}`,
        };
    }
}

// ── Batch rewind (revert multiple commits in reverse-chronological order) ────

export async function dispatchRewind(
    commits: AgitCommit[]
): Promise<{ reverted: string[]; failed: Array<{ hash: string; reason: string }> }> {
    const sorted = [...commits].sort((a, b) => b.timestamp - a.timestamp);
    const reverted: string[] = [];
    const failed: Array<{ hash: string; reason: string }> = [];

    for (const commit of sorted) {
        if (commit.status !== 'executed') {
            continue;
        }

        const result = await dispatchRollback(commit);
        if (result.success) {
            reverted.push(commit.hash);
        } else {
            failed.push({ hash: commit.hash, reason: result.message });
        }
    }

    return { reverted, failed };
}
