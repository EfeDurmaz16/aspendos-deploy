import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { commitConvexGovernance } from '../convex-governance';

const mocks = vi.hoisted(() => ({
    convexConfigured: vi.fn(),
    convexMutation: vi.fn(),
    convexQuery: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
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

    it('fails loud in production when FIDES authority is missing', async () => {
        process.env.NODE_ENV = 'production';

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
            })
        ).rejects.toThrow('FIDES signature is required for production Convex governance commits');
    });

    it('persists governance commits through Convex with resolved user ownership', async () => {
        mocks.convexConfigured.mockReturnValue(true);
        mocks.convexQuery.mockResolvedValueOnce({ _id: 'convex-user-1' });
        mocks.convexMutation.mockResolvedValueOnce({ commitHash: 'convex-commit-1' });

        await expect(
            commitConvexGovernance({
                userId: 'workos-user-1',
                toolName: 'file.write',
                args: { path: '/tmp/a' },
                metadata,
                fidesSignature: 'fides-sig-1',
                fidesDid: 'did:fides:agent-1',
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
        expect(mocks.convexMutation).toHaveBeenCalledWith('governance.signAndCommit', {
            service_secret: 'convex-service-secret',
            user_id: 'convex-user-1',
            tool_name: 'file.write',
            args: { path: '/tmp/a' },
            reversibility_class: 'undoable',
            rollback_strategy: undefined,
            rollback_deadline: undefined,
            human_explanation: 'Write a file',
            fides_signature: 'fides-sig-1',
            fides_signer_did: 'did:fides:agent-1',
            status: 'executed',
            result: { success: true },
        });
    });
});
