import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('web verify API route', () => {
    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

    beforeEach(() => {
        vi.resetModules();
        process.env.NEXT_PUBLIC_API_URL = 'https://api.yula.dev';
        global.fetch = vi.fn();
    });

    afterEach(() => {
        process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
        vi.restoreAllMocks();
    });

    it('does not mark commits verified when upstream returns verified false', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    hash: 'missing123',
                    verified: false,
                    error: 'Commit verification failed',
                }),
                {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
        );

        const { GET } = await import('../../../src/app/api/verify/[hash]/route');
        const response = await GET(new Request('https://yula.dev/api/verify/missing123'), {
            params: Promise.resolve({ hash: 'missing123' }),
        });

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({
            hash: 'missing123',
            verified: false,
            error: 'Commit verification failed',
        });
    });

    it('treats malformed upstream success as verification failure', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(JSON.stringify({ hash: 'abc12345' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        );

        const { GET } = await import('../../../src/app/api/verify/[hash]/route');
        const response = await GET(new Request('https://yula.dev/api/verify/abc12345'), {
            params: Promise.resolve({ hash: 'abc12345' }),
        });

        expect(response.status).toBe(502);
        await expect(response.json()).resolves.toEqual({
            hash: 'abc12345',
            verified: false,
            error: 'Commit verification failed',
        });
    });

    it('returns verified only when upstream explicitly verifies the commit', async () => {
        vi.mocked(fetch).mockResolvedValueOnce(
            new Response(
                JSON.stringify({
                    hash: 'abc12345',
                    verified: true,
                    did: 'did:yula:agent:user-1',
                    signature: 'sig-1',
                    timestamp: 123,
                    tool_name: 'file.write',
                    reversibility_class: 'undoable',
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            )
        );

        const { GET } = await import('../../../src/app/api/verify/[hash]/route');
        const response = await GET(new Request('https://yula.dev/api/verify/abc12345'), {
            params: Promise.resolve({ hash: 'abc12345' }),
        });

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            hash: 'abc12345',
            verified: true,
            signer_did: 'did:yula:agent:user-1',
        });
    });
});
