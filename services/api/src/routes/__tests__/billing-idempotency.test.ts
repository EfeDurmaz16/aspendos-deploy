/**
 * Tests for retired billing webhooks and billing atomic saves.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Prisma
vi.mock('@aspendos/db', () => ({
    prisma: {},
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
    requireAuth: vi.fn((c: any, next: () => Promise<void>) => {
        c.set('userId', 'billing-user-1');
        return next();
    }),
    rejectApiKeyAuth: vi.fn((c: any, next: () => Promise<void>) => {
        if (c.get('apiKeyId')) {
            return c.json({ error: 'API key authentication is not allowed for this route' }, 403);
        }
        return next();
    }),
}));

import { requireAuth } from '../../middleware/auth';

const mockRequireAuth = requireAuth as any;

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

describe('Retired API billing webhook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    async function createWebhookRequest(body: Record<string, unknown>) {
        // Dynamically import billing route to get the Hono app
        const { default: billingApp } = await import('../billing');
        const app = new Hono();
        app.route('/billing', billingApp);

        return app.request('/billing/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'stripe-signature': 'sig',
            },
            body: JSON.stringify(body),
        });
    }

    it('should fail loudly instead of processing legacy provider events', async () => {
        const res = await createWebhookRequest({
            id: 'evt-legacy',
            type: 'subscription.created',
            data: {},
        });

        expect(res.status).toBe(410);
        const json = await res.json();
        expect(json).toMatchObject({
            code: 'BILLING_WEBHOOK_RETIRED',
            provider: 'stripe',
            owner: 'apps/web/src/app/api/billing/webhook/route.ts',
        });
    });
});

describe('Billing session boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockImplementation((c: any, next: () => Promise<void>) => {
            c.set('userId', 'billing-user-1');
            return next();
        });
    });

    it('rejects API-key authenticated access to billing routes', async () => {
        mockRequireAuth.mockImplementationOnce((c: any, next: () => Promise<void>) => {
            c.set('userId', 'billing-user-1');
            c.set('apiKeyId', 'key-1');
            c.set('apiKeyPermissions', ['chat:read']);
            return next();
        });
        const { default: billingApp } = await import('../billing');
        const app = new Hono();
        app.route('/billing', billingApp);

        const res = await app.request('/billing');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});

describe('Billing Atomic Save', () => {
    it('should defer chat usage decrement to after message save (design verification)', async () => {
        // Verify code structure: recordChatUsage must be inside onFinish, not before streaming.
        const fs = await import('node:fs');
        const path = await import('node:path');
        // Resolve relative to this test file's directory
        const chatPath = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            '../chat.ts'
        );
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
        const chatPath = path.resolve(
            path.dirname(new URL(import.meta.url).pathname),
            '../chat.ts'
        );
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
