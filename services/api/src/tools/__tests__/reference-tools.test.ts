import { beforeEach, describe, expect, it } from 'vitest';
import type { ToolContext } from '../../reversibility/types';
import { browserTool } from '../browser';
import { calendarCreateEventTool } from '../calendar-create-event';
import { computerUseTool } from '../computer-use';
import { dbMigrateTool } from '../db-migrate';
import { emailSendTool } from '../email-send';
import { fileWriteTool } from '../file-write';
import { registerAllTools } from '../register-all';
import { registry } from '../registry';
import { stripeChargeTool } from '../stripe-charge';

const ctx: ToolContext = { userId: 'test-user-123' };

describe('Tool Registry', () => {
    beforeEach(() => {
        registerAllTools();
    });

    it('registers all 5 reference tools', () => {
        expect(registry.has('file.write')).toBe(true);
        expect(registry.has('email.send')).toBe(true);
        expect(registry.has('calendar.create_event')).toBe(true);
        expect(registry.has('db.migrate')).toBe(true);
        expect(registry.has('stripe.charge')).toBe(true);
    });

    it('returns irreversible_blocked for unknown tools', () => {
        const meta = registry.classify('unknown.tool', {});
        expect(meta.reversibility_class).toBe('irreversible_blocked');
        expect(meta.approval_required).toBe(false);
    });
});

describe('file.write (undoable)', () => {
    it('classifies as undoable', () => {
        const meta = fileWriteTool.classify({});
        expect(meta.reversibility_class).toBe('undoable');
        expect(meta.approval_required).toBe(false);
    });

    it('executes and creates snapshot', async () => {
        const result = await fileWriteTool.execute(
            { path: '/tmp/test.txt', content: 'hello', existing_content: 'old' },
            ctx
        );
        expect(result.success).toBe(true);
        expect((result.data as any).snapshotId).toBeDefined();
    });

    it('fails without path', async () => {
        const result = await fileWriteTool.execute({ content: 'hello' }, ctx);
        expect(result.success).toBe(false);
    });
});

describe('email.send (cancelable_window)', () => {
    it('classifies as cancelable_window', () => {
        const meta = emailSendTool.classify({});
        expect(meta.reversibility_class).toBe('cancelable_window');
        expect(meta.rollback_deadline).toBeDefined();
    });

    it('executes and returns cancel deadline', async () => {
        const result = await emailSendTool.execute(
            { to: 'test@example.com', subject: 'Test', body: 'Hello' },
            ctx
        );
        expect(result.success).toBe(true);
        expect((result.data as any).cancelDeadline).toBeDefined();
    });
});

describe('calendar.create_event (compensatable)', () => {
    it('classifies as compensatable', () => {
        const meta = calendarCreateEventTool.classify({});
        expect(meta.reversibility_class).toBe('compensatable');
    });

    it('executes and returns event ID', async () => {
        const result = await calendarCreateEventTool.execute(
            { title: 'Meeting', start: '2026-04-12T10:00', end: '2026-04-12T11:00' },
            ctx
        );
        expect(result.success).toBe(true);
        expect((result.data as any).eventId).toBeDefined();
    });
});

describe('db.migrate (approval_only)', () => {
    it('classifies as approval_only', () => {
        const meta = dbMigrateTool.classify({});
        expect(meta.reversibility_class).toBe('approval_only');
        expect(meta.approval_required).toBe(true);
    });

    it('executes migration SQL', async () => {
        const result = await dbMigrateTool.execute(
            { migration_sql: 'ALTER TABLE users ADD COLUMN avatar TEXT' },
            ctx
        );
        expect(result.success).toBe(true);
    });
});

describe('stripe.charge (threshold-based)', () => {
    it('classifies small charge as compensatable', () => {
        const meta = stripeChargeTool.classify({ amount: 2500 });
        expect(meta.reversibility_class).toBe('compensatable');
        expect(meta.approval_required).toBe(true);
    });

    it('classifies large charge as irreversible_blocked', () => {
        const meta = stripeChargeTool.classify({ amount: 10000 });
        expect(meta.reversibility_class).toBe('irreversible_blocked');
        expect(meta.approval_required).toBe(false);
    });

    it('blocks execution of large charge', async () => {
        const result = await stripeChargeTool.execute(
            { amount: 10000, customer_id: 'cus_123' },
            ctx
        );
        expect(result.success).toBe(false);
        expect(result.error).toContain('exceeds');
    });

    it('executes small charge', async () => {
        const result = await stripeChargeTool.execute(
            { amount: 2500, customer_id: 'cus_123' },
            ctx
        );
        expect(result.success).toBe(true);
    });
});

describe('computer.use', () => {
    it('requires approval for destructive desktop actions', () => {
        const meta = computerUseTool.classify({ action: 'click' });
        expect(meta.reversibility_class).toBe('approval_only');
        expect(meta.approval_required).toBe(true);
    });

    it('fails loud instead of reporting fake sandbox execution success', async () => {
        const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
        const previousDaytonaKey = process.env.DAYTONA_API_KEY;
        const previousE2BKey = process.env.E2B_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
        process.env.DAYTONA_API_KEY = 'test-daytona-key';
        delete process.env.E2B_API_KEY;

        try {
            const result = await computerUseTool.execute({ action: 'screenshot' }, ctx);
            expect(result.success).toBe(false);
            expect(result.error).toContain('not implemented');
            expect(result.error).toContain('Refusing to report success');
        } finally {
            if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
            else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;

            if (previousDaytonaKey === undefined) delete process.env.DAYTONA_API_KEY;
            else process.env.DAYTONA_API_KEY = previousDaytonaKey;

            if (previousE2BKey === undefined) delete process.env.E2B_API_KEY;
            else process.env.E2B_API_KEY = previousE2BKey;
        }
    });
});

describe('browser.navigate', () => {
    it('fails loud instead of reporting fake browser navigation success', async () => {
        const previousSteelKey = process.env.STEEL_API_KEY;
        process.env.STEEL_API_KEY = 'test-steel-key';

        try {
            const result = await browserTool.execute(
                { url: 'https://example.com', action: 'navigate' },
                ctx
            );
            expect(result.success).toBe(false);
            expect(result.error).toContain('not implemented');
            expect(result.error).toContain('Refusing to report success');
        } finally {
            if (previousSteelKey === undefined) delete process.env.STEEL_API_KEY;
            else process.env.STEEL_API_KEY = previousSteelKey;
        }
    });
});
