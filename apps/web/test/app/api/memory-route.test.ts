import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/auth', () => ({
    auth: vi.fn(),
}));

import { DELETE, GET, POST } from '../../../src/app/api/memory/route';
import { auth } from '../../../src/lib/auth';

const mockAuth = vi.mocked(auth);

describe('web memory route safety', () => {
    beforeEach(() => {
        mockAuth.mockReset();
        mockAuth.mockResolvedValue({
            userId: 'workos-user-1',
        } as any);
    });

    it('rejects unauthenticated memory search requests', async () => {
        mockAuth.mockResolvedValueOnce(null);

        const response = await GET(new Request('https://yula.dev/api/memory?q=test') as any);

        expect(response.status).toBe(401);
    });

    it('requires a query before reporting the route as unavailable', async () => {
        const response = await GET(new Request('https://yula.dev/api/memory') as any);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: 'Query parameter "q" is required',
        });
    });

    it('fails loud instead of returning fake empty memory search results', async () => {
        const response = await GET(new Request('https://yula.dev/api/memory?q=travel') as any);

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toMatchObject({
            error: 'Web memory route is not wired to Convex/SuperMemory',
        });
    });

    it('fails loud instead of reporting fake memory writes', async () => {
        const response = await POST(
            new Request('https://yula.dev/api/memory', {
                method: 'POST',
                body: JSON.stringify({ content: 'remember this' }),
            }) as any
        );

        expect(response.status).toBe(501);
    });

    it('fails loud instead of reporting fake memory deletion', async () => {
        const response = await DELETE();

        expect(response.status).toBe(501);
    });
});
