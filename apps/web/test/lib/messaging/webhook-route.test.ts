import { beforeEach, describe, expect, it, vi } from 'vitest';

const slackHandler = vi.fn();
const experimentalHandler = vi.fn();
const getBot = vi.fn();

vi.mock('@/lib/messaging/bot', () => ({
    getBot,
}));

describe('messaging webhook catch-all route', () => {
    beforeEach(() => {
        vi.resetModules();
        slackHandler.mockReset();
        experimentalHandler.mockReset();
        getBot.mockReset();
    });

    it('routes explicitly supported platforms to their adapter handler', async () => {
        getBot.mockResolvedValueOnce({
            webhooks: {
                slack: slackHandler.mockResolvedValueOnce(new Response('ok', { status: 202 })),
            },
        });

        const { POST } = await import('../../../src/app/api/webhooks/[platform]/route');
        const response = await POST(new Request('https://yula.dev/api/webhooks/slack'), {
            params: Promise.resolve({ platform: 'slack' }),
        });

        expect(response.status).toBe(202);
        expect(slackHandler).toHaveBeenCalledOnce();
    });

    it('does not expose unallowlisted bot webhook handlers', async () => {
        getBot.mockResolvedValueOnce({
            webhooks: {
                experimental: experimentalHandler,
            },
        });

        const { POST } = await import('../../../src/app/api/webhooks/[platform]/route');
        const response = await POST(new Request('https://yula.dev/api/webhooks/experimental'), {
            params: Promise.resolve({ platform: 'experimental' }),
        });

        expect(response.status).toBe(404);
        expect(getBot).not.toHaveBeenCalled();
        expect(experimentalHandler).not.toHaveBeenCalled();
    });

    it('returns service unavailable when a supported catch-all platform is disabled', async () => {
        getBot.mockResolvedValueOnce({ webhooks: {} });

        const { POST } = await import('../../../src/app/api/webhooks/[platform]/route');
        const response = await POST(new Request('https://yula.dev/api/webhooks/slack'), {
            params: Promise.resolve({ platform: 'slack' }),
        });

        expect(response.status).toBe(503);
        await expect(response.text()).resolves.toBe('Platform not configured: slack');
    });

    it('returns service unavailable when a direct platform route is disabled', async () => {
        getBot.mockResolvedValueOnce({ webhooks: {} });

        const { POST } = await import('../../../src/app/api/webhooks/slack/route');
        const response = await POST(new Request('https://yula.dev/api/webhooks/slack'));

        expect(response.status).toBe(503);
        await expect(response.text()).resolves.toBe('Platform not configured: slack');
    });
});
