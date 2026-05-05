import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexQuery = vi.fn();
const convexMutation = vi.fn();
const convexSetAuth = vi.fn();
const auth = vi.fn();

vi.mock('convex/browser', () => ({
    ConvexHttpClient: vi.fn(function ConvexHttpClient() {
        return {
            query: convexQuery,
            mutation: convexMutation,
            setAuth: convexSetAuth,
        };
    }),
}));

vi.mock('@/lib/auth', () => ({
    auth,
}));

vi.mock('@/lib/governance/fides', () => ({
    signGovernanceCommit: vi.fn(async () => ({
        fides_signature: 'fides-sig-1',
        fides_signer_did: 'did:fides:web-agent-1',
    })),
}));

vi.mock('../../../../convex/_generated/api', () => ({
    api: {
        commits: {
            getCurrentUserByHash: 'commits.getCurrentUserByHash',
            listCurrentUserAfterTimestamp: 'commits.listCurrentUserAfterTimestamp',
        },
        governance: {
            signAndCommit: 'governance.signAndCommit',
        },
        snapshots: {
            getCurrentUserBySnapshotId: 'snapshots.getCurrentUserBySnapshotId',
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
        convexSetAuth.mockReset();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('rejects unauthenticated undo requests before reading commits', async () => {
        auth.mockResolvedValueOnce(null);

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(undoRequest({ commit_hash: 'commit-1' }) as any);

        expect(response.status).toBe(401);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('rejects requests without a Convex access token before reading commits', async () => {
        auth.mockResolvedValueOnce({ userId: 'workos-user-1' });

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(undoRequest({ commit_hash: 'commit-1' }) as any);

        expect(response.status).toBe(401);
        expect(convexSetAuth).not.toHaveBeenCalled();
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('does not mutate commits owned by another user', async () => {
        auth.mockResolvedValueOnce({ accessToken: 'token-1', userId: 'workos-user-1' });
        convexQuery.mockResolvedValueOnce(null);

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({ commit_hash: 'commit-1', strategy: 'snapshot_restore' }) as any
        );

        expect(response.status).toBe(404);
        expect(convexSetAuth).toHaveBeenCalledWith('token-1');
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('appends a governance revert commit after a successful snapshot rollback', async () => {
        auth.mockResolvedValueOnce({ accessToken: 'token-1', userId: 'workos-user-1' });
        convexQuery
            .mockResolvedValueOnce({
                _id: 'commit-doc-1',
                hash: 'commit-1',
                user_id: 'user-1',
                status: 'executed',
                tool_name: 'file-write',
                reversibility_class: 'undoable',
                rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snap-1' },
                human_explanation: 'Write a file',
            })
            .mockResolvedValueOnce({
                snapshot_id: 'snap-1',
                target_path: '/tmp/x',
                prior_content: 'before',
            });
        vi.stubGlobal(
            'fetch',
            vi.fn(async (input: string | URL | Request) => {
                const url = String(input);
                if (url.startsWith('/api/snapshots')) {
                    return new Response(
                        JSON.stringify({ target_path: '/tmp/x', prior_content: 'before' }),
                        { status: 200 }
                    );
                }
                if (url === '/api/sandbox/write') {
                    return new Response(JSON.stringify({ ok: true }), { status: 200 });
                }
                return new Response(null, { status: 404 });
            })
        );

        const { POST } = await import('../../../src/app/api/undo/route');
        const response = await POST(
            undoRequest({
                commit_hash: 'commit-1',
                strategy: 'snapshot_restore',
                snapshot_id: 'snap-1',
            }) as any
        );

        expect(response.status).toBe(200);
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(convexMutation.mock.calls[0]?.[1]).toMatchObject({
            user_id: 'user-1',
            tool_name: 'revert_file-write',
            args: { reverted_hash: 'commit-1', strategy: 'snapshot_restore' },
            status: 'executed',
            reversibility_class: 'undoable',
            human_explanation: 'Reverted action: Write a file',
            fides_signature: 'fides-sig-1',
            fides_signer_did: 'did:fides:web-agent-1',
        });
        expect(convexMutation.mock.calls[0]?.[1]?.result).toMatchObject({
            restored_from_snapshot: 'snap-1',
        });
    });

    it('rewinds only after verifying the target commit belongs to the current user', async () => {
        auth.mockResolvedValueOnce({ accessToken: 'token-1', userId: 'workos-user-1' });
        convexQuery
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
        expect(convexQuery.mock.calls[1]?.[1]).toEqual({
            after_timestamp: 100,
        });
    });

    it('does not mark compensation reverted without a rollback handler', async () => {
        auth.mockResolvedValueOnce({ accessToken: 'token-1', userId: 'workos-user-1' });
        convexQuery
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
        auth.mockResolvedValueOnce({ accessToken: 'token-1', userId: 'workos-user-1' });
        convexQuery
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
