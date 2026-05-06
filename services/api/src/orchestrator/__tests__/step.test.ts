import { beforeEach, describe, expect, it } from 'vitest';
import { getAgit } from '../../audit/agit';
import { getFides } from '../../governance/fides';
import type { ToolContext } from '../../reversibility/types';
import { registerAllTools } from '../../tools/register-all';
import { runToolStep } from '../step';

const ctx: ToolContext = { userId: 'test-user-123', sessionId: 'test-session-123' };

describe('runToolStep', () => {
    beforeEach(() => {
        registerAllTools();
    });

    it('fails loud when session context is missing', async () => {
        await expect(runToolStep('file.write', {}, { userId: 'test-user-123' })).rejects.toThrow(
            /sessionId is required/
        );
    });

    it('blocks unknown tools (fail-closed)', async () => {
        const result = await runToolStep('unknown.tool', {}, ctx);
        expect(result.blocked).toBe(true);
        expect(result.result.success).toBe(false);
        expect(result.metadata.reversibility_class).toBe('irreversible_blocked');
    });

    it('blocks irreversible_blocked tools', async () => {
        const result = await runToolStep(
            'stripe.charge',
            { amount: 10000, customer_id: 'cus_123' },
            ctx
        );
        expect(result.blocked).toBe(true);
        expect(result.result.success).toBe(false);
    });

    it('blocks dangerous arguments before execution even for otherwise undoable tools', async () => {
        const result = await runToolStep(
            'file.write',
            { path: '/workspace/.env', content: 'SECRET=value', existing_content: '' },
            ctx
        );

        expect(result.blocked).toBe(true);
        expect(result.awaitingApproval).toBe(false);
        expect(result.commitHash).toBeTruthy();
        expect(result.metadata.reversibility_class).toBe('irreversible_blocked');
        expect(result.result.error).toContain('Potentially dangerous operation detected');
    });

    it('persists a signed audit commit for blocked tool decisions', async () => {
        const blockCtx: ToolContext = {
            userId: 'blocked-flow-user',
            sessionId: 'blocked-flow-session',
        };
        const result = await runToolStep('unknown.tool', {}, blockCtx);

        expect(result.blocked).toBe(true);
        expect(result.commitHash).toBeTruthy();

        const agit = getAgit();
        const [blockedCommit] = await agit.historyForUser(blockCtx.userId, 1);
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

    it('pauses approval_only tools', async () => {
        const result = await runToolStep(
            'db.migrate',
            { migration_sql: 'ALTER TABLE t ADD c TEXT' },
            ctx
        );
        expect(result.awaitingApproval).toBe(true);
        expect(result.blocked).toBe(false);
        expect(result.commitHash).toBeTruthy();
    });

    it('pauses payment tools even when the action is compensatable', async () => {
        const result = await runToolStep(
            'stripe.charge',
            { amount: 2500, customer_id: 'cus_123' },
            ctx
        );
        expect(result.awaitingApproval).toBe(true);
        expect(result.blocked).toBe(false);
        expect(result.result.success).toBe(false);
        expect(result.metadata.reversibility_class).toBe('compensatable');
        expect(result.metadata.approval_required).toBe(true);
    });

    it('executes undoable tools end-to-end', async () => {
        const result = await runToolStep(
            'file.write',
            { path: '/tmp/test.txt', content: 'hello', existing_content: 'old' },
            ctx
        );
        expect(result.blocked).toBe(false);
        expect(result.awaitingApproval).toBe(false);
        expect(result.result.success).toBe(true);
        expect(result.commitHash).toBeTruthy();
    });

    it('executes compensatable tools end-to-end', async () => {
        const result = await runToolStep(
            'calendar.create_event',
            { title: 'Meeting', start: '2026-04-12T10:00', end: '2026-04-12T11:00' },
            ctx
        );
        expect(result.blocked).toBe(false);
        expect(result.result.success).toBe(true);
    });

    it('includes FIDES signature in commit', async () => {
        const result = await runToolStep(
            'email.send',
            { to: 'test@example.com', subject: 'Test', body: 'Hello' },
            ctx
        );
        expect(result.commitHash).toBeTruthy();
        expect(result.metadata.reversibility_class).toBe('cancelable_window');
    });

    it('persists a verifiable pre/post action chain with a valid FIDES signature', async () => {
        const args = { path: '/tmp/provable.txt', content: 'hello', existing_content: 'old' };
        const chainCtx: ToolContext = {
            userId: 'provable-flow-user',
            sessionId: 'provable-flow-session',
        };

        const result = await runToolStep('file.write', args, chainCtx);

        expect(result.blocked).toBe(false);
        expect(result.awaitingApproval).toBe(false);
        expect(result.result.success).toBe(true);

        const agit = getAgit();
        const history = await agit.historyForUser(chainCtx.userId, 5);
        expect(history).toHaveLength(2);

        const [postCommit, preCommit] = history;
        expect(preCommit.hash).toBe(result.commitHash);
        expect(postCommit.hash).not.toBe(preCommit.hash);
        await expect(agit.verifyCommit(preCommit.hash)).resolves.toBe(true);
        await expect(agit.verifyCommit(postCommit.hash)).resolves.toBe(true);

        const fides = getFides();
        const prePayload = fides.getGovernanceCommitPayload('file.write', args, result.metadata, {
            status: 'pending',
        });
        const postPayload = fides.getGovernanceCommitPayload('file.write', args, result.metadata, {
            result: result.result,
            status: 'executed',
        });
        await expect(
            fides.verifySignature(prePayload, preCommit.signature, preCommit.did)
        ).resolves.toBe(true);
        await expect(
            fides.verifySignature(postPayload, postCommit.signature, postCommit.did)
        ).resolves.toBe(true);
        expect(postCommit.signature).not.toBe(preCommit.signature);
    });
});
