/**
 * Tests for webhook idempotency and billing atomic saves (Commits 4.2, 4.3, 7.1)
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Prisma
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
vi.mock('@aspendos/db', () => ({
    prisma: {
        processedWebhookEvent: {
            findUnique: (...args: unknown[]) => mockFindUnique(...args),
            create: (...args: unknown[]) => mockCreate(...args),
        },
    },
}));

// Mock polar service
const mockHandleWebhook = vi.fn();
const mockVerifyWebhookSignature = vi.fn();
vi.mock('../../services/polar.service', () => ({
    handleWebhook: (...args: unknown[]) => mockHandleWebhook(...args),
    verifyWebhookSignature: (...args: unknown[]) => mockVerifyWebhookSignature(...args),
}));

// Mock billing service
vi.mock('../../services/billing.service', () => ({
    getBillingStatus: vi.fn().mockResolvedValue({ tier: 'FREE' }),
    getOrCreateBillingAccount: vi.fn().mockResolvedValue({ id: 'ba-1' }),
    getUsageHistory: vi.fn().mockResolvedValue([]),
    getTierComparison: vi.fn().mockReturnValue([]),
    checkCostCeiling: vi.fn().mockResolvedValue({ allowed: true }),
    getCostSummary: vi.fn().mockResolvedValue({}),
    getSpendingAlerts: vi.fn().mockResolvedValue([]),
    getUnitEconomics: vi.fn().mockResolvedValue({}),
    getCostProjection: vi.fn().mockResolvedValue({}),
    recordChatUsage: vi.fn(),
    recordTokenUsage: vi.fn(),
}));

// Mock auth middleware
vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

// Mock validate middleware
vi.mock('../../middleware/validate', () => ({
    validateBody: () => vi.fn((_c: unknown, next: () => Promise<void>) => next()),
    validateQuery: () => vi.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

// Mock audit log
vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
}));

// Mock logger
vi.mock('../../lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    }),
}));

import { Hono } from 'hono';

describe('Webhook Idempotency', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.POLAR_WEBHOOK_SECRET = 'test-secret';
        mockVerifyWebhookSignature.mockReturnValue(true);
    });

    async function createWebhookRequest(body: Record<string, unknown>, signature = 'valid-sig') {
        // Dynamically import billing route to get the Hono app
        const { default: billingApp } = await import('../billing');
        const app = new Hono();
        app.route('/billing', billingApp);

        return app.request('/billing/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'polar-signature': signature,
            },
            body: JSON.stringify(body),
        });
    }

    it('should skip duplicate webhook events', async () => {
        const eventId = 'evt-123';
        mockFindUnique.mockResolvedValue({ id: eventId, type: 'subscription.created' });

        const res = await createWebhookRequest({
            id: eventId,
            type: 'subscription.created',
            data: {},
        });

        const json = await res.json();
        expect(json.duplicate).toBe(true);
        expect(mockHandleWebhook).not.toHaveBeenCalled();
    });

    it('should process new webhook events and record them', async () => {
        const eventId = 'evt-456';
        mockFindUnique.mockResolvedValue(null);
        mockHandleWebhook.mockResolvedValue(undefined);
        mockCreate.mockResolvedValue({ id: eventId });

        const res = await createWebhookRequest({
            id: eventId,
            type: 'subscription.updated',
            data: {},
        });

        const json = await res.json();
        expect(json.received).toBe(true);
        expect(json.duplicate).toBeUndefined();
        expect(mockHandleWebhook).toHaveBeenCalledTimes(1);
        expect(mockCreate).toHaveBeenCalledWith({
            data: { id: eventId, type: 'subscription.updated' },
        });
    });

    it('should process events without id (no idempotency check)', async () => {
        mockHandleWebhook.mockResolvedValue(undefined);

        const res = await createWebhookRequest({
            type: 'ping',
            data: {},
        });

        const json = await res.json();
        expect(json.received).toBe(true);
        expect(mockFindUnique).not.toHaveBeenCalled();
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should reject webhooks with invalid signature', async () => {
        mockVerifyWebhookSignature.mockReturnValue(false);

        const res = await createWebhookRequest(
            { id: 'evt-789', type: 'test', data: {} },
            'bad-sig'
        );

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.error).toContain('Invalid signature');
    });

    it('should reject webhooks when secret is not configured', async () => {
        delete process.env.POLAR_WEBHOOK_SECRET;

        // Need to re-import to pick up env change — but since the module
        // is already cached, we test the existing route which reads env at runtime
        const res = await createWebhookRequest({ id: 'evt-000', type: 'test', data: {} });

        // The module reads POLAR_WEBHOOK_SECRET at request time
        expect(res.status).toBe(500);
    });

    it('should handle concurrent duplicate events gracefully', async () => {
        mockFindUnique.mockResolvedValue(null);
        mockHandleWebhook.mockResolvedValue(undefined);
        // Simulate unique constraint violation on concurrent insert
        mockCreate.mockRejectedValue(new Error('Unique constraint failed'));

        const res = await createWebhookRequest({
            id: 'evt-concurrent',
            type: 'subscription.created',
            data: {},
        });

        // Should still return success — the catch handler logs but doesn't fail
        const json = await res.json();
        expect(json.received).toBe(true);
    });
});

describe('Billing Atomic Save', () => {
    it('should defer chat usage decrement to after message save (design verification)', async () => {
        // Verify code structure: recordChatUsage must be inside onFinish, not before streaming.
        const fs = await import('node:fs');
        const path = await import('node:path');
        // Resolve relative to this test file's directory
        const chatPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../chat.ts');
        const chatSource = fs.readFileSync(chatPath, 'utf-8');

        // recordChatUsage should NOT appear before streamText
        const preStreamSection = chatSource.split('streamText')[0];
        expect(preStreamSection).not.toContain('recordChatUsage');

        // recordChatUsage SHOULD appear after onFinish
        const onFinishMatch = chatSource.match(/onFinish[\s\S]*?recordChatUsage/);
        expect(onFinishMatch).not.toBeNull();
    });

    it('should wrap onFinish critical path in try/catch (design verification)', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const chatPath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../chat.ts');
        const chatSource = fs.readFileSync(chatPath, 'utf-8');

        // Extract the onFinish handler block (from "onFinish:" to the end of the file)
        const onFinishIdx = chatSource.indexOf('onFinish: async');
        expect(onFinishIdx).toBeGreaterThan(-1);
        const onFinishBlock = chatSource.slice(onFinishIdx, onFinishIdx + 2000);

        expect(onFinishBlock).toContain('try');
        expect(onFinishBlock).toContain('catch');
        expect(onFinishBlock).toContain('requestId');
    });
});
