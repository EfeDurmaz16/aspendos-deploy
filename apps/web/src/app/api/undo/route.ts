import { ConvexHttpClient } from 'convex/browser';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { AgitCommit, RollbackStrategy } from '@/lib/reversibility/types';
import { referenceTools } from '@/lib/tools/reference';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL ?? '');

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

        const currentUser = await convex.query(api.users.getByWorkOSId, {
            workos_id: session.userId,
        });
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Authenticated user is not provisioned.' },
                { status: 403 }
            );
        }

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
            return handleRewind(commit_hash, currentUser._id);
        }

        // ── Single undo ──────────────────────────────────────
        return handleSingleUndo(commit_hash, body, currentUser._id);
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
    commitHash: string,
    body: Record<string, unknown>,
    currentUserId: Id<'users'>
) {
    // Fetch the commit from Convex
    const commit = await convex.query(api.commits.getByHash, { hash: commitHash });

    if (!commit) {
        return NextResponse.json(
            { success: false, message: `Commit ${commitHash.slice(0, 8)} not found.` },
            { status: 404 }
        );
    }

    if (commit.user_id !== currentUserId) {
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
            const snapshot = await convex.query(api.snapshots.getBySnapshotId, {
                snapshot_id: snapshotId,
            });

            if (!snapshot) {
                return NextResponse.json(
                    { success: false, message: 'Snapshot not found.' },
                    { status: 404 }
                );
            }

            if (snapshot.user_id !== currentUserId) {
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

            await convex.mutation(api.commits.updateStatus, {
                id: commit._id,
                status: 'reverted',
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

            await convex.mutation(api.commits.updateStatus, {
                id: commit._id,
                status: 'reverted',
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
                    await convex.mutation(api.commits.updateStatus, {
                        id: commit._id,
                        status: 'reverted',
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

async function handleRewind(targetHash: string, currentUserId: Id<'users'>) {
    // Find the target commit
    const targetCommit = await convex.query(api.commits.getByHash, { hash: targetHash });

    if (!targetCommit) {
        return NextResponse.json(
            { success: false, message: `Target commit ${targetHash.slice(0, 8)} not found.` },
            { status: 404 }
        );
    }

    if (targetCommit.user_id !== currentUserId) {
        return NextResponse.json(
            { success: false, message: `Target commit ${targetHash.slice(0, 8)} not found.` },
            { status: 404 }
        );
    }

    // Get all commits after the target timestamp for this user
    const commitsAfter = await convex.query(api.commits.listAfterTimestamp, {
        user_id: currentUserId,
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
                    await convex.mutation(api.commits.updateStatus, {
                        id: commit._id,
                        status: 'reverted',
                        result: { reverted_at: Date.now(), rewind_target: targetHash },
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
