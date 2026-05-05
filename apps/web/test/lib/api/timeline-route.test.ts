import { describe, expect, it } from 'vitest';

describe('timeline API route', () => {
    it('does not fake an empty timeline when backend wiring is missing', async () => {
        const { GET } = await import('../../../src/app/api/timeline/route');

        const response = await GET();

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toEqual({
            error: 'Timeline API is not wired to authenticated Convex commit history yet',
            commits: null,
        });
    });
});
