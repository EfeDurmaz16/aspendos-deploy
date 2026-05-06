import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGovernanceCallbacks } from '../../../src/lib/governance/step-middleware';

vi.mock('../../../src/lib/governance/fides', () => ({
    signGovernanceCommit: vi.fn(async () => ({
        fides_signature: 'fides-sig-1',
        fides_signer_did: 'did:fides:web-agent-1',
    })),
}));

describe('governance step middleware', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.CONVEX_SERVICE_SECRET = 'convex-service-secret';
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('records tool results by appending a signed commit instead of mutating the pending commit', async () => {
        const convex = {
            mutation: vi
                .fn()
                .mockResolvedValueOnce({ commitHash: 'pending-commit-1' })
                .mockResolvedValueOnce({ commitHash: 'result-commit-1' }),
            query: vi.fn(),
        };

        const governance = createGovernanceCallbacks({
            convex: convex as any,
            userId: 'user-1' as any,
            toolMetadata: {
                'file.write': {
                    reversibility_class: 'undoable',
                    rollback_strategy: { kind: 'none' },
                    human_explanation: 'Write a file',
                },
            },
        });

        await governance.preStep('file.write', { path: '/tmp/x' }, 'tool-call-1');
        await governance.postStep('tool-call-1', { success: true }, true);

        expect(convex.mutation).toHaveBeenCalledTimes(2);
        expect(convex.mutation.mock.calls[1]?.[1]).toMatchObject({
            service_secret: 'convex-service-secret',
            user_id: 'user-1',
            tool_name: 'file.write',
            args: {
                prior_commit_hash: 'pending-commit-1',
                outcome: 'tool_result',
            },
            status: 'executed',
            result: { success: true },
            reversibility_class: 'undoable',
            rollback_strategy: { kind: 'none' },
            fides_signature: 'fides-sig-1',
            fides_signer_did: 'did:fides:web-agent-1',
        });
    });

    it('treats unknown blocked tools as non-approvable audit records', async () => {
        const convex = {
            mutation: vi.fn().mockResolvedValueOnce({ commitHash: 'blocked-commit-1' }),
            query: vi.fn(),
        };
        const onApprovalRequired = vi.fn();

        const governance = createGovernanceCallbacks({
            convex: convex as any,
            userId: 'user-1' as any,
            onApprovalRequired,
        });

        const result = await governance.preStep('unknown.dangerous', { value: true }, 'tool-1');

        expect(result).toEqual({
            commitHash: 'blocked-commit-1',
            blocked: true,
            requiresApproval: false,
        });
        expect(onApprovalRequired).not.toHaveBeenCalled();
        expect(convex.mutation.mock.calls[0]?.[1]).toMatchObject({
            service_secret: 'convex-service-secret',
            tool_name: 'unknown.dangerous',
            reversibility_class: 'irreversible_blocked',
            human_explanation: 'Unknown tool — blocked by default (fail-closed)',
        });
    });
});
