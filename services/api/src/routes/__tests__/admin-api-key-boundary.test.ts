import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import adminRoutes from '../admin';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
            findMany: vi.fn(),
            count: vi.fn(),
        },
        message: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
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
    app.route('/admin', adminRoutes);
    return app;
}

describe('admin route API-key boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
    });

    it('rejects API-key authenticated access before admin data queries', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/admin/users');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });
});
