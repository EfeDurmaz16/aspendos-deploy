import { beforeEach, describe, expect, it, vi } from 'vitest';

const convexQuery = vi.fn();
const convexMutation = vi.fn();
const auth = vi.fn();

vi.mock('convex/browser', () => ({
    ConvexHttpClient: vi.fn(function ConvexHttpClient() {
        return {
            query: convexQuery,
            mutation: convexMutation,
        };
    }),
}));

vi.mock('@/lib/auth', () => ({
    auth,
}));

vi.mock('../../../../convex/_generated/api', () => ({
    api: {
        users: {
            getByWorkOSId: 'users.getByWorkOSId',
        },
        commits: {
            getByHash: 'commits.getByHash',
            updateStatus: 'commits.updateStatus',
            listAfterTimestamp: 'commits.listAfterTimestamp',
        },
        snapshots: {
            getBySnapshotId: 'snapshots.getBySnapshotId',
        },
    },
}));

function undoRequest(body: Record<string, unknown>) {
    return new Request('https://yula.dev/api/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('undo API route authorization', () => {
    beforeEach(() => {
        vi.resetModules();
        auth.mockReset();
        convexQuery.mockReset();
        convexMutation.mockReset();
    });

    it('rejects unauthenticated undo requests before reading commits', async () => {
        auth.mockResolvedValueOnce(null);

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(undoRequest({ commit_hash: 'commit-1' }) as any);

        expect(response.status).toBe(401);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('does not mutate commits owned by another user', async () => {
        auth.mockResolvedValueOnce({ userId: 'workos-user-1' });
        convexQuery
            .mockResolvedValueOnce({ _id: 'user-1' })
            .mockResolvedValueOnce({
                _id: 'commit-doc-1',
                hash: 'commit-1',
                user_id: 'user-2',
                status: 'executed',
                reversibility_class: 'undoable',
            });

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({ commit_hash: 'commit-1', strategy: 'snapshot_restore' }) as any
        );

        expect(response.status).toBe(404);
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('rewinds only after verifying the target commit belongs to the current user', async () => {
        auth.mockResolvedValueOnce({ userId: 'workos-user-1' });
        convexQuery
            .mockResolvedValueOnce({ _id: 'user-1' })
            .mockResolvedValueOnce({
                _id: 'commit-doc-1',
                hash: 'commit-1',
                user_id: 'user-1',
                status: 'executed',
                timestamp: 100,
                reversibility_class: 'undoable',
            })
            .mockResolvedValueOnce([]);

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({ commit_hash: 'commit-1', strategy: 'rewind' }) as any
        );

        expect(response.status).toBe(200);
        expect(convexQuery.mock.calls[2]?.[1]).toEqual({
            user_id: 'user-1',
            after_timestamp: 100,
        });
    });

    it('does not mark compensation reverted without a rollback handler', async () => {
        auth.mockResolvedValueOnce({ userId: 'workos-user-1' });
        convexQuery
            .mockResolvedValueOnce({ _id: 'user-1' })
            .mockResolvedValueOnce({
                _id: 'commit-doc-1',
                hash: 'commit-1',
                user_id: 'user-1',
                status: 'executed',
                tool_name: 'unknown-tool',
                reversibility_class: 'compensatable',
            });

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({
                commit_hash: 'commit-1',
                strategy: 'compensation',
                compensate_tool: 'manual',
                compensate_args: {},
            }) as any
        );

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            message: 'No rollback handler for unknown-tool.',
        });
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('does not generic-revert rewind entries without rollback handlers', async () => {
        auth.mockResolvedValueOnce({ userId: 'workos-user-1' });
        convexQuery
            .mockResolvedValueOnce({ _id: 'user-1' })
            .mockResolvedValueOnce({
                _id: 'target-doc',
                hash: 'target-1',
                user_id: 'user-1',
                status: 'executed',
                timestamp: 100,
                reversibility_class: 'undoable',
            })
            .mockResolvedValueOnce([
                {
                    _id: 'commit-doc-2',
                    hash: 'commit-2',
                    user_id: 'user-1',
                    status: 'executed',
                    timestamp: 101,
                    tool_name: 'unknown-tool',
                    reversibility_class: 'undoable',
                },
            ]);

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({ commit_hash: 'target-1', strategy: 'rewind' }) as any
        );

        expect(response.status).toBe(207);
        await expect(response.json()).resolves.toMatchObject({
            success: false,
            reverted_count: 0,
            reverted_hashes: [],
            failed_hashes: ['commit-2'],
        });
        expect(convexMutation).not.toHaveBeenCalled();
    });
});
