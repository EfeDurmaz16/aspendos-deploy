import { describe, expect, it, vi } from 'vitest';
import { createGovernanceCallbacks } from '../../../src/lib/governance/step-middleware';

describe('governance step middleware', () => {
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
        });
    });
});
