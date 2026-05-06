import { describe, expect, it, vi } from 'vitest';
import { createGovernanceCallbacks } from '../step-middleware';

vi.mock('../fides', () => ({
    signGovernanceCommit: vi.fn(async () => ({
        fides_signature: 'test-signature',
        fides_signer_did: 'did:fides:test',
    })),
}));

describe('governance step middleware', () => {
    it('requires approval when metadata sets approval_required even if class is compensatable', async () => {
        vi.stubEnv('CONVEX_SERVICE_SECRET', 'test-secret');
        const approvalSpy = vi.fn(async () => {});
        const convex = {
            mutation: vi.fn(async () => ({ commitHash: 'commit_123' })),
            query: vi.fn(async () => []),
        };

        const gov = createGovernanceCallbacks({
            convex: convex as any,
            userId: 'user_123' as any,
            toolMetadata: {
                'stripe.charge': {
                    reversibility_class: 'compensatable',
                    approval_required: true,
                    rollback_strategy: {
                        kind: 'compensation',
                        compensate_tool: 'stripe.refund',
                        compensate_args: {},
                    },
                    human_explanation: 'Payment requires approval before execution',
                },
            },
            onApprovalRequired: approvalSpy,
        });

        const result = await gov.preStep('stripe.charge', { amount: 2500 }, 'tool-call-1');

        expect(result.requiresApproval).toBe(true);
        expect(result.blocked).toBe(false);
        expect(approvalSpy).toHaveBeenCalledWith('commit_123', 'stripe.charge');
        expect((convex.mutation.mock.calls[0] as any)?.[1]).toMatchObject({
            expected_parent_hash: null,
        });
        vi.unstubAllEnvs();
    });
});
