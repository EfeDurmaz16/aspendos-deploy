import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@aspendos/db', () => ({
    prisma: {
        promptTemplate: {
            findMany: vi.fn(),
            create: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
    },
}));

vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn(async (c: any, next: any) => {
        c.set('userId', 'template-user-1');
        return next();
    }),
    rejectApiKeyAuth: vi.fn(async (c: any, next: any) => {
        if (c.get('apiKeyId')) {
            return c.json({ error: 'API key authentication is not allowed for this route' }, 403);
        }
        return next();
    }),
}));

import { requireAuth } from '../../middleware/auth';

const mockPrisma = prisma as any;
const mockRequireAuth = requireAuth as any;

async function createApp() {
    const { default: promptTemplateRoutes } = await import('../prompt-templates');
    const app = new Hono();
    app.route('/templates', promptTemplateRoutes);
    return app;
}

describe('prompt template routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockRequireAuth.mockImplementation(async (c: any, next: any) => {
            c.set('userId', 'template-user-1');
            return next();
        });
    });

    it('lists templates from persistent storage for the authenticated user', async () => {
        mockPrisma.promptTemplate.findMany.mockResolvedValue([
            {
                id: 'tpl-1',
                title: 'Review',
                category: 'engineering',
                usageCount: 4,
            },
        ]);
        const app = await createApp();

        const res = await app.request('/templates');

        expect(res.status).toBe(200);
        expect(mockPrisma.promptTemplate.findMany).toHaveBeenCalledWith({
            where: { userId: 'template-user-1' },
            orderBy: { usageCount: 'desc' },
        });
        await expect(res.json()).resolves.toEqual({
            templates: [
                {
                    id: 'tpl-1',
                    title: 'Review',
                    category: 'engineering',
                    usageCount: 4,
                },
            ],
        });
    });

    it('rejects API-key authenticated prompt template access', async () => {
        mockRequireAuth.mockImplementationOnce(async (c: any, next: any) => {
            c.set('userId', 'template-user-1');
            c.set('apiKeyId', 'key-1');
            c.set('apiKeyPermissions', ['chat:read']);
            return next();
        });
        mockPrisma.promptTemplate.findMany.mockResolvedValue([]);
        const app = await createApp();

        const res = await app.request('/templates');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockPrisma.promptTemplate.findMany).not.toHaveBeenCalled();
    });
});
