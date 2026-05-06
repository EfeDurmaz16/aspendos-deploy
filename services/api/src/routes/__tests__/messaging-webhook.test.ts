import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const slackHandler = vi.fn();
const experimentalHandler = vi.fn();

vi.mock('../../bot', () => ({
    bot: {
        webhooks: {
            slack: slackHandler,
            experimental: experimentalHandler,
        },
    },
}));

vi.mock('@aspendos/db', () => ({
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
        platformConnection: {
            findMany: vi.fn(),
            upsert: vi.fn(),
            updateMany: vi.fn(),
        },
    },
}));

import { prisma } from '@aspendos/db';

const mockPrisma = prisma as any;

async function createTestApp() {
    const { default: messagingRoutes } = await import('../messaging');
    const app = new Hono();
    app.route('/messaging', messagingRoutes);
    return app;
}

async function createApiKeyAuthenticatedTestApp() {
    const { default: messagingRoutes } = await import('../messaging');
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'test-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route('/messaging', messagingRoutes);
    return app;
}

describe('messaging webhook route allowlist', () => {
    beforeEach(() => {
        vi.resetModules();
        slackHandler.mockReset();
        experimentalHandler.mockReset();
        mockPrisma.platformConnection.findMany.mockResolvedValue([]);
    });

    it('routes explicitly supported POST webhooks to their adapter handler', async () => {
        slackHandler.mockResolvedValueOnce(new Response('ok', { status: 202 }));
        const app = await createTestApp();

        const response = await app.request('/messaging/webhook/slack', {
            method: 'POST',
            body: '{}',
        });

        expect(response.status).toBe(202);
        expect(slackHandler).toHaveBeenCalledOnce();
    });

    it('does not expose unallowlisted POST webhook handlers', async () => {
        const app = await createTestApp();

        const response = await app.request('/messaging/webhook/experimental', {
            method: 'POST',
            body: '{}',
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: 'Unknown platform: experimental',
        });
        expect(experimentalHandler).not.toHaveBeenCalled();
    });

    it('does not expose unallowlisted GET verification handlers', async () => {
        const app = await createTestApp();

        const response = await app.request('/messaging/webhook/experimental', {
            method: 'GET',
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            error: 'Unknown platform: experimental',
        });
        expect(experimentalHandler).not.toHaveBeenCalled();
    });

    it('rejects API-key authenticated platform connection management', async () => {
        const app = await createApiKeyAuthenticatedTestApp();

        const response = await app.request('/messaging/connections');

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockPrisma.platformConnection.findMany).not.toHaveBeenCalled();
    });
});
