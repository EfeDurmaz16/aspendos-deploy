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

async function createTestApp() {
    const { default: messagingRoutes } = await import('../messaging');
    const app = new Hono();
    app.route('/messaging', messagingRoutes);
    return app;
}

describe('messaging webhook route allowlist', () => {
    beforeEach(() => {
        vi.resetModules();
        slackHandler.mockReset();
        experimentalHandler.mockReset();
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
});
