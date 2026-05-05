import { beforeEach, describe, expect, it } from 'vitest';
import type { ToolContext } from '../../reversibility/types';
import { calendarCreateEventTool } from '../calendar-create-event';
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
        expect(meta.approval_required).toBe(true);
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
    });

    it('classifies large charge as irreversible_blocked', () => {
        const meta = stripeChargeTool.classify({ amount: 10000 });
        expect(meta.reversibility_class).toBe('irreversible_blocked');
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
