import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/auth', () => ({
    auth: vi.fn(),
}));

import { DELETE } from '../../../src/app/api/account/route';
import { auth } from '../../../src/lib/auth';

const mockAuth = vi.mocked(auth);

describe('account deletion route safety', () => {
    beforeEach(() => {
        mockAuth.mockReset();
    });

    it('rejects unauthenticated account deletion', async () => {
        mockAuth.mockResolvedValueOnce(null);

        const response = await DELETE();

        expect(response.status).toBe(401);
    });

    it('fails loud instead of reporting GDPR erasure while external memory deletion is disconnected', async () => {
        mockAuth.mockResolvedValueOnce({ userId: 'workos-user-1' } as any);

        const response = await DELETE();

        expect(response.status).toBe(501);
        await expect(response.json()).resolves.toMatchObject({
            error: 'Account deletion is not wired to external memory erasure',
        });
    });
});
