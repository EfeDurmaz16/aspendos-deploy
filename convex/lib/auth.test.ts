import { describe, expect, it } from 'vitest';
import { findAuthenticatedUser } from './auth';

type MockIdentity = {
    subject: string;
    tokenIdentifier: string;
};

function user(overrides: Record<string, unknown> = {}) {
    return {
        _id: 'users:1',
        _creationTime: 1,
        workos_id: 'workos-user-1',
        email: 'efe@example.com',
        tier: 'free',
        created_at: 1,
        ...overrides,
    };
}

function mockCtx(identity: MockIdentity | null, firstResults: unknown[]) {
    const calls: Array<{ index: string; field: string; value: unknown }> = [];

    return {
        calls,
        ctx: {
            auth: {
                getUserIdentity: async () => identity,
            },
            db: {
                query: (table: string) => {
                    expect(table).toBe('users');
                    return {
                        withIndex: (
                            index: string,
                            build: (q: {
                                eq: (field: string, value: unknown) => unknown;
                            }) => unknown
                        ) => {
                            build({
                                eq: (field, value) => {
                                    calls.push({ index, field, value });
                                    return {};
                                },
                            });

                            return {
                                first: async () => firstResults.shift() ?? null,
                            };
                        },
                    };
                },
            },
        } as unknown as Parameters<typeof findAuthenticatedUser>[0],
    };
}

describe('Convex authenticated user lookup', () => {
    it('prefers the canonical tokenIdentifier index', async () => {
        const tokenUser = user({ auth_token_identifier: 'issuer|user-1' });
        const { ctx, calls } = mockCtx(
            { subject: 'workos-user-1', tokenIdentifier: 'issuer|user-1' },
            [tokenUser]
        );

        await expect(findAuthenticatedUser(ctx)).resolves.toBe(tokenUser);
        expect(calls).toEqual([
            {
                index: 'by_auth_token_identifier',
                field: 'auth_token_identifier',
                value: 'issuer|user-1',
            },
        ]);
    });

    it('allows subject lookup only for legacy users without tokenIdentifier binding', async () => {
        const legacyUser = user();
        const { ctx } = mockCtx({ subject: 'workos-user-1', tokenIdentifier: 'issuer|user-1' }, [
            null,
            legacyUser,
        ]);

        await expect(findAuthenticatedUser(ctx)).resolves.toBe(legacyUser);
    });

    it('fails closed when subject fallback finds a user bound to another tokenIdentifier', async () => {
        const mismatchedUser = user({ auth_token_identifier: 'issuer|other-user' });
        const { ctx } = mockCtx({ subject: 'workos-user-1', tokenIdentifier: 'issuer|user-1' }, [
            null,
            mismatchedUser,
        ]);

        await expect(findAuthenticatedUser(ctx)).rejects.toThrow(/tokenIdentifier does not match/);
    });
});
