import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import accountRoutes from '../account';

vi.mock('../../lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({
                id: 'user-1',
                email: 'user@yula.dev',
                name: 'Test User',
                tier: 'PRO',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }),
        },
        chat: { findMany: vi.fn().mockResolvedValue([]) },
        memory: { findMany: vi.fn().mockResolvedValue([]) },
        billingAccount: { findUnique: vi.fn().mockResolvedValue(null) },
        pACReminder: { findMany: vi.fn().mockResolvedValue([]) },
        pACSettings: { findUnique: vi.fn().mockResolvedValue(null) },
        councilSession: { findMany: vi.fn().mockResolvedValue([]) },
        gamificationProfile: { findUnique: vi.fn().mockResolvedValue(null) },
        notificationPreferences: { findUnique: vi.fn().mockResolvedValue(null) },
    },
}));

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['memory:read']);
        return next();
    });
    app.route('/account', accountRoutes);
    return app;
}

describe('account route session boundaries', () => {
    it('rejects API-key authenticated account export access', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/account/export');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});
