import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import chatRoutes from '../chat';

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
    },
}));

vi.mock('../../services/chat.service', () => ({
    getSharedChat: vi.fn(),
    getOrCreateUser: vi.fn(),
    listChats: vi.fn(),
}));

const mockPrisma = prisma as any;

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'chat-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read', 'chat:write']);
        return next();
    });
    app.route('/chat', chatRoutes);
    return app;
}

describe('chat route session boundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
    });

    it('rejects API-key authenticated chat route access', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/chat');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
    });
});
