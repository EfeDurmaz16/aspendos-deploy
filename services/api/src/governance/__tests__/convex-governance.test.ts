import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitConvexGovernance } from '../convex-governance';

const mocks = vi.hoisted(() => ({
    convexConfigured: vi.fn(),
    convexMutation: vi.fn(),
    convexQuery: vi.fn(),
    signGovernanceCommit: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        commits: {
            listByUser: 'commits.listByUser',
        },
        governance: {
            signAndCommit: 'governance.signAndCommit',
        },
        users: {
            getByWorkOSId: 'users.getByWorkOSId',
        },
    },
    getConvexClient: vi.fn(() => ({
        mutation: mocks.convexMutation,
        query: mocks.convexQuery,
    })),
    getConvexServiceSecret: vi.fn(() => 'convex-service-secret'),
    isConvexConfigured: mocks.convexConfigured,
}));

vi.mock('../fides', () => ({
    getFides: vi.fn(() => ({
        signGovernanceCommit: mocks.signGovernanceCommit,
    })),
}));

const metadata = {
    reversibility_class: 'undoable' as const,
    human_explanation: 'Write a file',
};

describe('commitConvexGovernance', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        mocks.convexConfigured.mockReset();
        mocks.convexQuery.mockReset();
        mocks.convexMutation.mockReset();
        mocks.signGovernanceCommit.mockReset();
        mocks.signGovernanceCommit.mockResolvedValue({
            signature: 'signed-parent-bound-fides-sig',
            did: 'did:fides:agent-1',
            timestamp: 123,
        });
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it('returns null outside production when Convex is not configured', async () => {
        mocks.convexConfigured.mockReturnValue(false);

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
            })
        ).resolves.toBeNull();
    });

    it('does not silently fall back when configured Convex governance fails outside explicit local fallback', async () => {
        process.env.NODE_ENV = 'development';
        process.env.VITEST = 'false';
        mocks.convexConfigured.mockReturnValue(true);
        mocks.convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
            })
        ).rejects.toThrow('convex unavailable');
    });

    it('fails loud in production when Convex governance is unavailable', async () => {
        process.env.NODE_ENV = 'production';
        mocks.convexConfigured.mockReturnValue(false);

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
                fidesSignature: 'fides-sig-1',
                fidesDid: 'did:fides:agent-1',
            })
        ).rejects.toThrow('Convex governance is required in production');
    });

    it('fails loud in production when FIDES authority signing is unavailable', async () => {
        process.env.NODE_ENV = 'production';
        mocks.convexConfigured.mockReturnValue(true);
        mocks.convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' }).mockResolvedValueOnce([]);
        mocks.signGovernanceCommit.mockRejectedValueOnce(new Error('fides unavailable'));

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
            })
        ).rejects.toThrow('fides unavailable');
    });

    it('persists governance commits through Convex with resolved user ownership', async () => {
        mocks.convexConfigured.mockReturnValue(true);
        mocks.convexQuery
            .mockResolvedValueOnce({ _id: 'convex-user-1' })
            .mockResolvedValueOnce([{ hash: 'parent-commit-1' }]);
        mocks.convexMutation.mockResolvedValueOnce({ commitHash: 'convex-commit-1' });

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
                status: 'executed',
                result: { success: true },
            })
        ).resolves.toEqual({
            commitHash: 'convex-commit-1',
            source: 'convex',
        });

        expect(mocks.convexQuery).toHaveBeenCalledWith('users.getByWorkOSId', {
            service_secret: 'convex-service-secret',
            workos_id: 'workos-user-1',
        });
        expect(mocks.convexQuery).toHaveBeenCalledWith('commits.listByUser', {
            service_secret: 'convex-service-secret',
            user_id: 'convex-user-1',
            limit: 1,
        });
        expect(mocks.signGovernanceCommit).toHaveBeenCalledWith(
            'file.write',
            { path: '/tmp/a' },
            metadata,
            {
                parentHash: 'parent-commit-1',
                result: { success: true },
                status: 'executed',
            }
        );
        expect(mocks.convexMutation).toHaveBeenCalledWith('governance.signAndCommit', {
            service_secret: 'convex-service-secret',
            user_id: 'convex-user-1',
            expected_parent_hash: 'parent-commit-1',
            tool_name: 'file.write',
            args: { path: '/tmp/a' },
            reversibility_class: 'undoable',
            rollback_strategy: undefined,
            rollback_deadline: undefined,
            human_explanation: 'Write a file',
            fides_signature: 'signed-parent-bound-fides-sig',
            fides_signer_did: 'did:fides:agent-1',
            status: 'executed',
            result: { success: true },
        });
    });
});
