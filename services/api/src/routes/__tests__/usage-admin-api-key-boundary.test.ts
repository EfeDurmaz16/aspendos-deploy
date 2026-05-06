import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usageRoutes from '../usage';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
}));

vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn(async (_c, next) => {
        await next();
    }),
}));

const mockPrisma = prisma as any;

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'admin-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['admin:read']);
        return next();
    });
    app.route('/usage', usageRoutes);
    return app;
}

describe('usage admin route API-key boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 'admin-user-1',
            email: 'admin@yula.dev',
            tier: 'ULTRA',
        });
    });

    it('rejects API-key authenticated admin usage access', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/usage/admin/costs');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
});
