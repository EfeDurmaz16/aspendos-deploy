import { beforeEach, describe, expect, it } from 'vitest';
import { getAgit } from '../../audit/agit';
import { getFides } from '../../governance/fides';
import type { ToolContext } from '../../reversibility/types';
import { registerAllTools } from '../../tools/register-all';
import { runToolStep } from '../step';

const ctx: ToolContext = { userId: 'test-user-123' };

describe('runToolStep', () => {
    beforeEach(() => {
        registerAllTools();
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
        const chainCtx: ToolContext = { userId: 'provable-flow-user' };

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
        const payload = fides.getToolCallPayload('file.write', args, result.metadata);
        await expect(
            fides.verifySignature(payload, preCommit.signature, preCommit.did)
        ).resolves.toBe(true);
        await expect(
            fides.verifySignature(payload, postCommit.signature, postCommit.did)
        ).resolves.toBe(true);
    });
});
