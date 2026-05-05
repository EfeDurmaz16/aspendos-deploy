import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexQuery = vi.fn();
const convexMutation = vi.fn();

vi.mock('convex/browser', () => ({
    ConvexHttpClient: vi.fn(function ConvexHttpClient() {
        return {
            query: convexQuery,
            mutation: convexMutation,
        };
    }),
}));

vi.mock('../../../../convex/_generated/api', () => ({
    api: {
        approvals: {
            getByCommitHash: 'approvals.getByCommitHash',
            decide: 'approvals.decide',
        },
        actionLog: {
            log: 'actionLog.log',
        },
    },
}));

function signedRequest(body: Record<string, unknown>, secret: string, timestamp = Date.now()) {
    const rawBody = JSON.stringify(body);
    const signature = createHmac('sha256', secret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    return new Request('https://yula.dev/api/bot/approve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-yula-timestamp': timestamp.toString(),
            'x-yula-signature': `sha256=${signature}`,
        },
        body: rawBody,
    });
}

describe('bot approval webhook', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.setSystemTime(new Date('2026-01-20T12:00:00.000Z'));
        convexQuery.mockReset();
        convexMutation.mockReset();
        process.env = {
            ...originalEnv,
            NODE_ENV: 'production',
            NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
            BOT_APPROVAL_WEBHOOK_SECRET: 'test-secret',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.useRealTimers();
    });

    it('rejects missing approval signatures before touching Convex', async () => {
        const { POST } = await import('../../../src/app/api/bot/approve/route');

        const response = await POST(
            new Request('https://yula.dev/api/bot/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    commitHash: 'commit-1',
                    action: 'approve',
                    platform: 'slack',
                    platformUserId: 'user-1',
                }),
            })
        );

        expect(response.status).toBe(401);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('rejects stale approval signatures', async () => {
        const { POST } = await import('../../../src/app/api/bot/approve/route');

        const response = await POST(
            signedRequest(
                {
                    commitHash: 'commit-1',
                    action: 'approve',
                    platform: 'slack',
                    platformUserId: 'user-1',
                },
                'test-secret',
                Date.now() - 6 * 60 * 1000
            )
        );

        expect(response.status).toBe(401);
        expect(convexQuery).not.toHaveBeenCalled();
    });

    it('applies valid signed approvals through Convex', async () => {
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'decided',
            status: 'approved',
        });
        convexMutation.mockResolvedValueOnce({ ok: true });

        const { POST } = await import('../../../src/app/api/bot/approve/route');
        const response = await POST(
            signedRequest(
                {
                    commitHash: 'commit-1',
                    action: 'approve',
                    platform: 'slack',
                    platformUserId: 'user-1',
                },
                'test-secret'
            )
        );

        await expect(response.json()).resolves.toMatchObject({
            success: true,
            action: 'approve',
            commitHash: 'commit-1',
        });
        expect(response.status).toBe(200);
        expect(convexQuery.mock.calls[0]?.[1]).toEqual({
            commit_hash: 'commit-1',
        });
        expect(convexMutation.mock.calls[0]?.[1]).toEqual({
            id: 'approval-1',
            action: 'approve',
            now: Date.now(),
        });
    });
});

describe('inactive messaging platform webhooks', () => {
    it('returns 501 for Teams until the adapter is activated', async () => {
        const { handleTeamsWebhook } = await import('../../../src/lib/messaging/platforms/teams');

        const response = await handleTeamsWebhook(new Request('https://yula.dev/api/teams'));

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toEqual({ status: 'teams_not_activated' });
    });

    it('returns 501 for Google Chat until the adapter is activated', async () => {
        const { handleGChatWebhook } = await import('../../../src/lib/messaging/platforms/gchat');

        const response = await handleGChatWebhook(new Request('https://yula.dev/api/gchat'));

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toEqual({ status: 'gchat_not_activated' });
    });
});
