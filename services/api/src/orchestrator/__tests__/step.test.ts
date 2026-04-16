import { describe, expect, it, beforeEach } from 'vitest';
import { runToolStep } from '../step';
import { registerAllTools } from '../../tools/register-all';
import type { ToolContext } from '../../reversibility/types';

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
});
