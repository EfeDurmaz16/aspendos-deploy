import { beforeEach, describe, expect, it } from 'vitest';
import { getAgit } from '../audit/agit';
import { getFides } from '../governance/fides';
import { runToolStep } from '../orchestrator/step';
import { registry } from '../tools/registry';

describe('deterministic core action flow', () => {
    beforeEach(() => {
        process.env.ALLOW_IN_MEMORY_GOVERNANCE = 'true';
        delete process.env.AGIT_REPO_PATH;

        registry.register({
            name: 'core.test.write',
            description: 'Deterministic test write tool',
            classify: () => ({
                approval_required: false,
                human_explanation: 'Test write is undoable through snapshot restore.',
                reversibility_class: 'undoable',
                rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'snapshot-test' },
            }),
            execute: async (args, ctx) => ({
                data: {
                    args,
                    commitHash: ctx.commitHash,
                },
                success: true,
            }),
        });
    });

    it('classifies, signs, pre-commits, executes, post-commits, audits, and verifies', async () => {
        const args = { content: 'hello', path: '/tmp/core-flow.txt' };
        const userId = 'core-flow-user';

        const result = await runToolStep('core.test.write', args, { userId });

        expect(result.blocked).toBe(false);
        expect(result.awaitingApproval).toBe(false);
        expect(result.metadata.reversibility_class).toBe('undoable');
        expect(result.result.success).toBe(true);
        expect(result.commitHash).toMatch(/^[a-f0-9]{64}$/);

        const agit = getAgit();
        const history = await agit.historyForUser(userId, 10);
        expect(history).toHaveLength(2);

        const [postCommit, preCommit] = history;
        expect(preCommit.hash).toBe(result.commitHash);
        expect(postCommit.hash).not.toBe(preCommit.hash);
        await expect(agit.verifyCommit(preCommit.hash)).resolves.toBe(true);
        await expect(agit.verifyCommit(postCommit.hash)).resolves.toBe(true);

        const fides = getFides();
        const prePayload = fides.getGovernanceCommitPayload(
            'core.test.write',
            args,
            result.metadata,
            {
                status: 'pending',
            }
        );
        const postPayload = fides.getGovernanceCommitPayload(
            'core.test.write',
            args,
            result.metadata,
            {
                result: result.result,
                status: 'executed',
            }
        );

        await expect(
            fides.verifySignature(prePayload, preCommit.signature, preCommit.did)
        ).resolves.toBe(true);
        await expect(
            fides.verifySignature(postPayload, postCommit.signature, postCommit.did)
        ).resolves.toBe(true);
        expect(postCommit.signature).not.toBe(preCommit.signature);
    });
});
