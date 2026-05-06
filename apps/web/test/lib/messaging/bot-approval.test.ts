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
    },
}));

function signedRequest(body: Record<string, unknown>, secret: string, timestamp = Date.now()) {
    const rawBody = JSON.stringify(body);
    return signedRawRequest(rawBody, secret, timestamp);
}

function signedRawRequest(rawBody: string, secret: string, timestamp = Date.now()) {
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
            CONVEX_SERVICE_SECRET: 'convex-service-secret',
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 202 })));
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.useRealTimers();
        vi.unstubAllGlobals();
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
        convexMutation.mockResolvedValueOnce({
            outcome: 'updated',
            status: 'approved',
            commit_hash: 'commit-1',
        });

        const { POST } = await import('../../../src/app/api/bot/approve/route');
        const response = await POST(
            signedRequest(
                {
                    approvalId: 'approval-1',
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
            approvalId: 'approval-1',
            commitHash: 'commit-1',
        });
        expect(response.status).toBe(200);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(convexMutation.mock.calls[0]?.[1]).toEqual({
            service_secret: 'convex-service-secret',
            id: 'approval-1',
            action: 'approve',
            now: Date.now(),
            audit: {
                platform: 'slack',
                platform_user_id: 'user-1',
            },
        });
    });

    it('supports legacy commit-hash approval callbacks', async () => {
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'updated',
            status: 'approved',
        });

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
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(convexQuery.mock.calls[0]?.[1]).toEqual({
            service_secret: 'convex-service-secret',
            commit_hash: 'commit-1',
        });
        expect(convexMutation.mock.calls[0]?.[1]).toEqual({
            service_secret: 'convex-service-secret',
            id: 'approval-1',
            action: 'approve',
            now: Date.now(),
            audit: {
                platform: 'slack',
                platform_user_id: 'user-1',
            },
        });
    });

    it('signs the agent resume callback for first-time approvals', async () => {
        process.env.AGENT_RESUME_URL = 'https://agent.example/resume';
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'updated',
            status: 'approved',
        });

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

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledOnce();
        const [url, init] = (fetch as any).mock.calls[0];
        expect(url).toBe('https://agent.example/resume');
        expect(init.body).toBe(JSON.stringify({ approvalId: 'approval-1', commitHash: 'commit-1' }));
        expect(init.headers['x-yula-timestamp']).toBe(Date.now().toString());
        const expectedSignature = createHmac('sha256', 'test-secret')
            .update(`${Date.now()}.${init.body}`)
            .digest('hex');
        expect(init.headers['x-yula-signature']).toBe(`sha256=${expectedSignature}`);
    });

    it('rejects tampered signed approval bodies before touching Convex', async () => {
        const { POST } = await import('../../../src/app/api/bot/approve/route');

        const signedBody = JSON.stringify({
            commitHash: 'commit-1',
            action: 'approve',
            platform: 'slack',
            platformUserId: 'user-1',
        });
        const tamperedBody = JSON.stringify({
            commitHash: 'commit-1',
            action: 'reject',
            platform: 'slack',
            platformUserId: 'user-1',
        });
        const signed = signedRawRequest(signedBody, 'test-secret');
        const response = await POST(
            new Request('https://yula.dev/api/bot/approve', {
                method: 'POST',
                headers: signed.headers,
                body: tamperedBody,
            })
        );

        expect(response.status).toBe(401);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('rejects signed malformed JSON before touching Convex', async () => {
        const { POST } = await import('../../../src/app/api/bot/approve/route');

        const response = await POST(signedRawRequest('{"commitHash":', 'test-secret'));

        await expect(response.json()).resolves.toEqual({ error: 'Invalid JSON body' });
        expect(response.status).toBe(400);
        expect(convexQuery).not.toHaveBeenCalled();
        expect(convexMutation).not.toHaveBeenCalled();
    });

    it('accepts idempotent approval replays without resuming the agent again', async () => {
        process.env.AGENT_RESUME_URL = 'https://agent.example/resume';
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'already_decided',
            status: 'approved',
            idempotent: true,
        });

        const { POST } = await import('../../../src/app/api/bot/approve/route');
        const response = await POST(
            signedRequest(
                {
                    commitHash: 'commit-1',
                    action: 'approve',
                    platform: 'slack',
                    platformUserId: 'user-1',
                    surfaceMessageId: 'surface-1',
                },
                'test-secret'
            )
        );

        await expect(response.json()).resolves.toMatchObject({
            success: true,
            action: 'approve',
            commitHash: 'commit-1',
            idempotent: true,
        });
        expect(response.status).toBe(200);
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(convexMutation.mock.calls[0]?.[1]).toMatchObject({
            audit: {
                platform: 'slack',
                platform_user_id: 'user-1',
                surface_message_id: 'surface-1',
            },
        });
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects conflicting approval replays without audit logging or resuming', async () => {
        process.env.AGENT_RESUME_URL = 'https://agent.example/resume';
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'already_decided',
            status: 'rejected',
            idempotent: false,
        });

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

        await expect(response.json()).resolves.toEqual({ error: 'Approval already rejected' });
        expect(response.status).toBe(409);
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects expired approvals without audit logging or resuming', async () => {
        process.env.AGENT_RESUME_URL = 'https://agent.example/resume';
        convexQuery.mockResolvedValueOnce({
            _id: 'approval-1',
            user_id: 'user-1',
        });
        convexMutation.mockResolvedValueOnce({
            outcome: 'expired',
        });

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

        await expect(response.json()).resolves.toEqual({ error: 'Approval has expired' });
        expect(response.status).toBe(410);
        expect(convexMutation).toHaveBeenCalledTimes(1);
        expect(fetch).not.toHaveBeenCalled();
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
