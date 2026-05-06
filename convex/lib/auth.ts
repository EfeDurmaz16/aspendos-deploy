import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type AuthenticatedCtx = QueryCtx | MutationCtx;

export async function findAuthenticatedUser(ctx: AuthenticatedCtx): Promise<Doc<'users'> | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error('Not authenticated');
    }

    const byTokenIdentifier = await ctx.db
        .query('users')
        .withIndex('by_auth_token_identifier', (q) =>
            q.eq('auth_token_identifier', identity.tokenIdentifier)
        )
        .first();
    if (byTokenIdentifier) {
        return byTokenIdentifier;
    }

    const legacyBySubject = await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', identity.subject))
        .first();
    if (!legacyBySubject) {
        return null;
    }

    if (legacyBySubject.auth_token_identifier) {
        throw new Error('Authenticated tokenIdentifier does not match provisioned user');
    }

    return legacyBySubject;
}

export async function requireAuthenticatedUser(ctx: AuthenticatedCtx): Promise<Doc<'users'>> {
    const user = await findAuthenticatedUser(ctx);
    if (!user) {
        throw new Error('Authenticated user is not provisioned');
    }
    return user;
}
