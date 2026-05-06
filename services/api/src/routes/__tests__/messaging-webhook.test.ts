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
            create: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn(),
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

async function createUserAuthenticatedTestApp() {
    const { default: messagingRoutes } = await import('../messaging');
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'test-user-1');
        c.set('apiKeyId', null);
        c.set('apiKeyPermissions', null);
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
        mockPrisma.platformConnection.create.mockReset();
        mockPrisma.platformConnection.findUnique.mockReset();
        mockPrisma.platformConnection.findMany.mockResolvedValue([]);
        mockPrisma.platformConnection.update.mockReset();
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

    it('returns a service error when a supported platform adapter is disabled', async () => {
        const app = await createTestApp();

        const response = await app.request('/messaging/webhook/discord', {
            method: 'POST',
            body: '{}',
        });

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'Platform not configured: discord',
        });
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

    it('does not reassign a platform identity linked to another user', async () => {
        mockPrisma.platformConnection.findUnique.mockResolvedValueOnce({
            id: 'connection-1',
            userId: 'other-user',
        });
        const app = await createUserAuthenticatedTestApp();

        const response = await app.request('/messaging/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: 'slack',
                platformUserId: 'U123',
            }),
        });

        expect(response.status).toBe(409);
        await expect(response.json()).resolves.toEqual({
            error: 'Platform identity is already linked to another account',
        });
        expect(mockPrisma.platformConnection.update).not.toHaveBeenCalled();
        expect(mockPrisma.platformConnection.create).not.toHaveBeenCalled();
    });

    it('reactivates an existing platform identity for the same user without changing owner', async () => {
        mockPrisma.platformConnection.findUnique.mockResolvedValueOnce({
            id: 'connection-1',
            userId: 'test-user-1',
        });
        mockPrisma.platformConnection.update.mockResolvedValueOnce({
            id: 'connection-1',
            userId: 'test-user-1',
            platform: 'slack',
            platformUserId: 'U123',
            isActive: true,
        });
        const app = await createUserAuthenticatedTestApp();

        const response = await app.request('/messaging/connections', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                platform: 'slack',
                platformUserId: 'U123',
                metadata: { workspace: 'T123' },
            }),
        });

        expect(response.status).toBe(200);
        expect(mockPrisma.platformConnection.update).toHaveBeenCalledWith({
            where: { id: 'connection-1' },
            data: { metadata: { workspace: 'T123' }, isActive: true },
        });
        expect(mockPrisma.platformConnection.create).not.toHaveBeenCalled();
    });
});
