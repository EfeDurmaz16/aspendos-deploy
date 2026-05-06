import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import analyticsRoutes from '../analytics';
import usageRoutes from '../usage';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
    },
}));

vi.mock('../../lib/prisma', () => ({
    prisma: {
        message: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
}));

const mockAuthPrisma = prisma as any;

function createApiKeyAuthenticatedApp(routePath: string, routes: Hono<any>) {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'analytics-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route(routePath, routes);
    return app;
}

describe('analytics and usage route session boundaries', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuthPrisma.user.findUnique.mockResolvedValue({ banned: false });
    });

    it('rejects API-key authenticated analytics access', async () => {
        const app = createApiKeyAuthenticatedApp('/analytics', analyticsRoutes);

        const res = await app.request('/analytics/usage');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });

    it('rejects API-key authenticated usage cost access', async () => {
        const app = createApiKeyAuthenticatedApp('/usage', usageRoutes);

        const res = await app.request('/usage/costs');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});
