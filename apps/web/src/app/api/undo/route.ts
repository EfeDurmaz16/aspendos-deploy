import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { signGovernanceCommit } from '@/lib/governance/fides';
import type { AgitCommit, RollbackStrategy } from '@/lib/reversibility/types';
import { referenceTools } from '@/lib/tools/reference';
import { api } from '../../../../../../convex/_generated/api';

function createConvexClient(accessToken: string) {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? '');
    convex.setAuth(accessToken);
    return convex;
}

// ── POST /api/undo ───────────────────────────────────────────
// Handles three strategies:
//   1. Single undo (snapshot_restore, cancel_window, compensation)
//   2. Rewind (revert all commits after a target hash)

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        if (!session.accessToken) {
            return NextResponse.json(
                { success: false, message: 'Missing Convex access token.' },
                { status: 401 }
            );
        }

        const convex = createConvexClient(session.accessToken);
        const body = await req.json();
        const { commit_hash, strategy } = body;

        if (!commit_hash || typeof commit_hash !== 'string') {
            return NextResponse.json(
                { success: false, message: 'Missing or invalid commit_hash.' },
                { status: 400 }
            );
        }

        // ── Rewind mode ──────────────────────────────────────
        if (strategy === 'rewind') {
            return handleRewind(convex, commit_hash);
        }

        // ── Single undo ──────────────────────────────────────
        return handleSingleUndo(convex, commit_hash, body);
    } catch (err) {
        return NextResponse.json(
            {
                success: false,
                message: `Server error: ${err instanceof Error ? err.message : String(err)}`,
            },
            { status: 500 }
        );
    }
}

// ── Single undo handler ──────────────────────────────────────

async function handleSingleUndo(
    convex: ConvexHttpClient,
    commitHash: string,
    body: Record<string, unknown>
) {
    // Fetch the commit from Convex
    const commit = await convex.query(api.commits.getCurrentUserByHash, { hash: commitHash });

    if (!commit) {
        return NextResponse.json(
            { success: false, message: `Commit ${commitHash.slice(0, 8)} not found.` },
            { status: 404 }
        );
    }

    if (commit.status === 'reverted') {
        return NextResponse.json(
            { success: false, message: 'Commit already reverted.' },
            { status: 409 }
        );
    }

    if (commit.status !== 'executed') {
        return NextResponse.json(
            { success: false, message: `Cannot undo a commit with status "${commit.status}".` },
            { status: 400 }
        );
    }

    const { strategy } = body;

    // Dispatch based on strategy kind
    switch (strategy) {
        case 'snapshot_restore': {
            const snapshotId = body.snapshot_id as string;
            if (!snapshotId) {
                return NextResponse.json(
                    { success: false, message: 'Missing snapshot_id for snapshot_restore.' },
                    { status: 400 }
                );
            }

            // Look up snapshot
            const snapshot = await convex.query(api.snapshots.getCurrentUserBySnapshotId, {
                snapshot_id: snapshotId,
            });

            if (!snapshot) {
                return NextResponse.json(
                    { success: false, message: 'Snapshot not found.' },
                    { status: 404 }
                );
            }

            const tool = referenceTools.get(commit.tool_name);
            if (!tool?.rollback) {
                return NextResponse.json(
                    { success: false, message: `No rollback handler for ${commit.tool_name}.` },
                    { status: 501 }
                );
            }

            const result = await tool.rollback(commit as unknown as AgitCommit);
            if (!result.success) {
                return NextResponse.json(result, { status: 409 });
            }

            await appendRevertCommit(convex, commit, {
                strategy: 'snapshot_restore',
                result: {
                    reverted_at: Date.now(),
                    restored_from_snapshot: snapshotId,
                    rollback_message: result.message,
                },
            });

            return NextResponse.json(result);
        }

        case 'cancel_window': {
            const rollbackStrategy = commit.rollback_strategy as RollbackStrategy | undefined;

            if (
                rollbackStrategy?.kind === 'cancel_window' &&
                Date.now() > rollbackStrategy.deadline_ms
            ) {
                return NextResponse.json(
                    { success: false, message: 'Cancel window has expired.' },
                    { status: 410 }
                );
            }

            const tool = referenceTools.get(commit.tool_name);
            if (!tool?.rollback) {
                return NextResponse.json(
                    { success: false, message: `No rollback handler for ${commit.tool_name}.` },
                    { status: 501 }
                );
            }

            const result = await tool.rollback(commit as unknown as AgitCommit);
            if (!result.success) {
                return NextResponse.json(result, { status: 409 });
            }

            await appendRevertCommit(convex, commit, {
                strategy: 'cancel_window',
                result: {
                    reverted_at: Date.now(),
                    cancel_method: 'cancel_window',
                    rollback_message: result.message,
                },
            });

            return NextResponse.json(result);
        }

        case 'compensation': {
            const compensateTool = body.compensate_tool as string;

            // Try to find and execute the compensation tool
            const tool = referenceTools.get(commit.tool_name);
            if (tool?.rollback) {
                const result = await tool.rollback(commit as unknown as AgitCommit);
                if (result.success) {
                    await appendRevertCommit(convex, commit, {
                        strategy: 'compensation',
                        result: {
                            reverted_at: Date.now(),
                            compensation_method: compensateTool,
                        },
                    });
                }
                return NextResponse.json(result);
            }

            return NextResponse.json(
                { success: false, message: `No rollback handler for ${commit.tool_name}.` },
                { status: 501 }
            );
        }

        default:
            return NextResponse.json(
                { success: false, message: `Unknown undo strategy: "${strategy}"` },
                { status: 400 }
            );
    }
}

// ── Rewind handler ───────────────────────────────────────────

async function handleRewind(convex: ConvexHttpClient, targetHash: string) {
    // Find the target commit
    const targetCommit = await convex.query(api.commits.getCurrentUserByHash, { hash: targetHash });

    if (!targetCommit) {
        return NextResponse.json(
            { success: false, message: `Target commit ${targetHash.slice(0, 8)} not found.` },
            { status: 404 }
        );
    }

    // Get all commits after the target timestamp for this user
    const commitsAfter = await convex.query(api.commits.listCurrentUserAfterTimestamp, {
        after_timestamp: targetCommit.timestamp,
    });

    const executed = commitsAfter.filter((c) => c.status === 'executed');

    if (executed.length === 0) {
        return NextResponse.json({
            success: true,
            message: 'No executed commits after this point.',
            reverted_count: 0,
            reverted_hashes: [],
            failed_hashes: [],
        });
    }

    // Revert in reverse chronological order (newest first)
    const sorted = [...executed].sort((a, b) => b.timestamp - a.timestamp);
    const revertedHashes: string[] = [];
    const failedHashes: string[] = [];

    for (const commit of sorted) {
        const spec = commit.reversibility_class;

        // Skip approval_only and irreversible — don't auto-revert
        if (spec === 'approval_only' || spec === 'irreversible_blocked') {
            failedHashes.push(commit.hash);
            continue;
        }

        // Try tool-specific rollback
        const tool = referenceTools.get(commit.tool_name);
        if (tool?.rollback) {
            try {
                const result = await tool.rollback(commit as unknown as AgitCommit);
                if (result.success) {
                    await appendRevertCommit(convex, commit, {
                        strategy: 'rewind',
                        result: {
                            reverted_at: Date.now(),
                            rewind_target: targetHash,
                        },
                    });
                    revertedHashes.push(commit.hash);
                    continue;
                }
                failedHashes.push(commit.hash);
                continue;
            } catch {
                failedHashes.push(commit.hash);
                continue;
            }
        }

        failedHashes.push(commit.hash);
    }

    const success = failedHashes.length === 0;
    return NextResponse.json(
        {
            success,
            message: `Rewound ${revertedHashes.length} commit(s) to ${targetHash.slice(0, 8)}.`,
            reverted_count: revertedHashes.length,
            reverted_hashes: revertedHashes,
            failed_hashes: failedHashes,
        },
        { status: success ? 200 : 207 }
    );
}

async function appendRevertCommit(
    convex: ConvexHttpClient,
    commit: { hash: string; user_id: string; tool_name: string; human_explanation?: string },
    reversal: { strategy: string; result: Record<string, unknown> }
) {
    const args = {
        reverted_hash: commit.hash,
        strategy: reversal.strategy,
    };
    const signature = await signGovernanceCommit({
        args,
        result: reversal.result,
        reversibility_class: 'undoable',
        status: 'executed',
        tool_name: `revert_${commit.tool_name}`,
    });

    await convex.mutation(api.governance.signAndCommit, {
        user_id: commit.user_id as any,
        tool_name: `revert_${commit.tool_name}`,
        args,
        status: 'executed',
        result: reversal.result,
        reversibility_class: 'undoable',
        human_explanation: `Reverted action: ${commit.human_explanation ?? commit.tool_name}`,
        ...signature,
    });
}
