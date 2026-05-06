import { beforeEach, describe, expect, it } from 'vitest';
import { getAgit } from '../audit/agit';
import { getFides } from '../governance/fides';
import { runToolStep } from '../orchestrator/step';
import { registry } from '../tools/registry';

describe('deterministic core action flow', () => {
    const ctx = { userId: 'core-flow-user', sessionId: 'core-flow-session' };

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

    it('fails loud when session context is missing', async () => {
        await expect(
            runToolStep('core.test.write', {}, { userId: 'missing-session-user' })
        ).rejects.toThrow(/sessionId is required/);
    });

    it('persists a signed audit commit for blocked tool decisions', async () => {
        const result = await runToolStep(
            'unknown.tool',
            {},
            {
                userId: 'core-block-user',
                sessionId: 'core-block-session',
            }
        );

        expect(result.blocked).toBe(true);
        expect(result.commitHash).toMatch(/^[a-f0-9]{64}$/);

        const agit = getAgit();
        const [blockedCommit] = await agit.historyForUser('core-block-user', 1);
        expect(blockedCommit.hash).toBe(result.commitHash);
        await expect(agit.verifyCommit(blockedCommit.hash)).resolves.toBe(true);

        const fides = getFides();
        const payload = fides.getGovernanceCommitPayload('unknown.tool', {}, result.metadata, {
            result: result.result,
            status: 'failed',
        });
        await expect(
            fides.verifySignature(payload, blockedCommit.signature, blockedCommit.did)
        ).resolves.toBe(true);
    });

    it('blocks dangerous arguments before executing undoable tools', async () => {
        let executed = false;
        registry.register({
            name: 'core.test.secret.write',
            description: 'Secret write tool',
            classify: () => ({
                approval_required: false,
                human_explanation: 'Secret write is undoable.',
                reversibility_class: 'undoable',
                rollback_strategy: { kind: 'snapshot_restore', snapshot_id: 'secret-snapshot' },
            }),
            execute: async () => {
                executed = true;
                return { success: true };
            },
        });

        const result = await runToolStep(
            'core.test.secret.write',
            { path: '/workspace/.env', content: 'SECRET=value' },
            { userId: 'core-danger-user', sessionId: 'core-danger-session' }
        );

        expect(executed).toBe(false);
        expect(result.blocked).toBe(true);
        expect(result.awaitingApproval).toBe(false);
        expect(result.commitHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.metadata.reversibility_class).toBe('irreversible_blocked');
        expect(result.result.error).toContain('Potentially dangerous operation detected');
    });

    it('honors guard-chain approval requirements before tool execution', async () => {
        let executed = false;
        registry.register({
            name: 'documentDelete',
            description: 'Delete a stored document',
            classify: () => ({
                approval_required: false,
                human_explanation: 'Delete a stored document.',
                reversibility_class: 'undoable',
                rollback_strategy: { kind: 'none' },
            }),
            execute: async () => {
                executed = true;
                return { success: true };
            },
        });

        const result = await runToolStep(
            'documentDelete',
            { documentId: 'doc-1' },
            { userId: 'core-approval-user', sessionId: 'core-approval-session' }
        );

        expect(executed).toBe(false);
        expect(result.awaitingApproval).toBe(true);
        expect(result.blocked).toBe(false);
        expect(result.commitHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.metadata.approval_required).toBe(true);
        expect(result.metadata.human_explanation).toContain('high blast radius');
    });

    it('classifies, signs, pre-commits, executes, post-commits, audits, and verifies', async () => {
        const args = { content: 'hello', path: '/tmp/core-flow.txt' };

        const result = await runToolStep('core.test.write', args, ctx);

        expect(result.blocked).toBe(false);
        expect(result.awaitingApproval).toBe(false);
        expect(result.metadata.reversibility_class).toBe('undoable');
        expect(result.result.success).toBe(true);
        expect(result.commitHash).toMatch(/^[a-f0-9]{64}$/);

        const agit = getAgit();
        const history = await agit.historyForUser(ctx.userId, 10);
        expect(history).toHaveLength(2);

        const [postCommit, preCommit] = history;
        expect(preCommit.hash).toBe(result.commitHash);
        expect(preCommit.parentHash).toBeNull();
        expect(postCommit.parentHash).toBe(preCommit.hash);
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
                parentHash: preCommit.hash,
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
