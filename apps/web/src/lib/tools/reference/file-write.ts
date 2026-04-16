/**
 * file-write — Undoable tool
 *
 * Writes a file in an E2B sandbox. Before writing, snapshots the prior
 * content so it can be restored instantly via snapshot_restore.
 *
 * Reversibility: undoable (green badge)
 * Rollback: snapshot_restore — restores the file to its prior content
 */

import type { ReversibleToolDef, AgitCommit, RollbackStrategy } from '@/lib/reversibility/types';

export const fileWrite: ReversibleToolDef = {
    name: 'file-write',
    description: 'Write a file in the sandbox. Fully undoable via snapshot.',
    reversibility_class: 'undoable',

    classify(args: Record<string, unknown>) {
        return {
            reversibility_class: 'undoable' as const,
            rollback_strategy: {
                kind: 'snapshot_restore' as const,
                // snapshot_id gets filled after execution captures the prior state
                snapshot_id: (args.snapshot_id as string) ?? 'pending',
            },
            human_explanation: `Write file at ${args.path ?? 'unknown path'}. Prior content is snapshotted for instant restore.`,
        };
    },

    async execute(args: Record<string, unknown>) {
        const path = args.path as string;
        const content = args.content as string;

        if (!path || content === undefined) {
            return { success: false, error: 'Missing required args: path, content' };
        }

        // 1. Read prior content for snapshot
        const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        let priorContent = '';

        try {
            const readRes = await fetch('/api/sandbox/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path }),
            });
            if (readRes.ok) {
                const readData = await readRes.json();
                priorContent = readData.content ?? '';
            }
        } catch {
            // File doesn't exist yet — that's fine, prior content is empty
        }

        // 2. Store snapshot in Convex
        try {
            await fetch('/api/snapshots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    snapshot_id: snapshotId,
                    target_path: path,
                    prior_content: priorContent,
                }),
            });
        } catch (err) {
            return {
                success: false,
                error: `Failed to create snapshot: ${err instanceof Error ? err.message : String(err)}`,
            };
        }

        // 3. Write the file
        try {
            const writeRes = await fetch('/api/sandbox/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, content }),
            });

            if (!writeRes.ok) {
                return { success: false, error: `Write failed: ${writeRes.statusText}` };
            }

            return {
                success: true,
                data: { path, bytes: content.length },
                snapshot_id: snapshotId,
            };
        } catch (err) {
            return {
                success: false,
                error: `Write error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },

    async rollback(commit: AgitCommit) {
        const strategy = commit.rollback_strategy;
        if (!strategy || strategy.kind !== 'snapshot_restore') {
            return { success: false, message: 'No snapshot to restore.' };
        }

        try {
            // Fetch the snapshot
            const snapRes = await fetch(`/api/snapshots?id=${strategy.snapshot_id}`);
            if (!snapRes.ok) {
                return { success: false, message: 'Snapshot not found.' };
            }
            const snapshot = await snapRes.json();

            // Restore file content
            const writeRes = await fetch('/api/sandbox/write', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: snapshot.target_path,
                    content: snapshot.prior_content,
                }),
            });

            if (!writeRes.ok) {
                return { success: false, message: 'Failed to restore file.' };
            }

            return {
                success: true,
                message: `File restored to snapshot ${strategy.snapshot_id.slice(0, 8)}...`,
                reverted_commit_hash: commit.hash,
            };
        } catch (err) {
            return {
                success: false,
                message: `Restore error: ${err instanceof Error ? err.message : String(err)}`,
            };
        }
    },
};
