import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const handleAuth = vi.fn((options) => options);
const verify = vi.fn();

vi.mock('@workos-inc/authkit-nextjs', () => ({
    handleAuth,
}));

vi.mock('svix', () => ({
    Webhook: vi.fn(function Webhook() {
        return { verify };
    }),
}));

describe('user provisioning routes', () => {
    const originalEnv = { ...process.env };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        vi.resetModules();
        handleAuth.mockClear();
        verify.mockReset();
        consoleError.mockClear();
        process.env = {
            ...originalEnv,
            CLERK_WEBHOOK_SECRET: 'clerk-secret',
            CONVEX_SERVICE_SECRET: 'convex-service-secret',
            NEXT_PUBLIC_CONVEX_URL: 'https://example.convex.cloud',
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    });

    afterEach(() => {
        process.env = originalEnv;
        vi.unstubAllGlobals();
    });

    it('provisions WorkOS callback users with the Convex service secret', async () => {
        await import('../../../src/app/callback/route');
        const options = handleAuth.mock.calls[0]?.[0];

        await options.onSuccess({
            user: {
                email: 'ada@example.com',
                firstName: 'Ada',
                id: 'workos-user-1',
                lastName: 'Lovelace',
                profilePictureUrl: 'https://example.com/ada.png',
            },
        });

        expect(fetch).toHaveBeenCalledWith('https://example.convex.cloud/api/mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'users:upsertFromWorkOS',
                args: {
                    service_secret: 'convex-service-secret',
                    workos_id: 'workos-user-1',
                    email: 'ada@example.com',
                    name: 'Ada Lovelace',
                    avatar_url: 'https://example.com/ada.png',
                },
            }),
        });
    });

    it('provisions Clerk webhook users with the Convex service secret', async () => {
        verify.mockReturnValueOnce({
            data: {
                email_addresses: [{ email_address: 'ada@example.com' }],
                first_name: 'Ada',
                id: 'clerk-user-1',
                image_url: 'https://example.com/ada.png',
                last_name: 'Lovelace',
            },
            type: 'user.created',
        });

        const { POST } = await import('../../../src/app/api/webhooks/clerk/route');
        const response = await POST(
            new Request('https://yula.dev/api/webhooks/clerk', {
                method: 'POST',
                headers: {
                    'svix-id': 'msg-1',
                    'svix-signature': 'sig-1',
                    'svix-timestamp': '123',
                },
                body: '{}',
            }) as never
        );

        expect(response.status).toBe(200);
        expect(fetch).toHaveBeenCalledWith('https://example.convex.cloud/api/mutation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path: 'users:upsertFromWorkOS',
                args: {
                    service_secret: 'convex-service-secret',
                    workos_id: 'clerk-user-1',
                    email: 'ada@example.com',
                    name: 'Ada Lovelace',
                    avatar_url: 'https://example.com/ada.png',
                },
            }),
        });
    });

    it('logs Convex provisioning failures from Clerk webhooks', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 500 })));
        verify.mockReturnValueOnce({
            data: {
                email_addresses: [{ email_address: 'ada@example.com' }],
                first_name: 'Ada',
                id: 'clerk-user-1',
                last_name: 'Lovelace',
            },
            type: 'user.updated',
        });

        const { POST } = await import('../../../src/app/api/webhooks/clerk/route');
        const response = await POST(
            new Request('https://yula.dev/api/webhooks/clerk', {
                method: 'POST',
                headers: {
                    'svix-id': 'msg-1',
                    'svix-signature': 'sig-1',
                    'svix-timestamp': '123',
                },
                body: '{}',
            }) as never
        );

        expect(response.status).toBe(200);
        expect(consoleError).toHaveBeenCalledWith(
            '[clerk-webhook] Convex upsert failed:',
            expect.any(Error)
        );
    });
});
