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
});
