import type { MutationCtx, QueryCtx } from './_generated/server';

type AuthenticatedCtx = QueryCtx | MutationCtx;

export async function requireAuthenticatedWorkOSId(ctx: AuthenticatedCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error('Not authenticated');
    }
    return identity.subject;
}

export async function requireAuthenticatedUser(ctx: AuthenticatedCtx) {
    const workosId = await requireAuthenticatedWorkOSId(ctx);
    const user = await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', workosId))
        .first();

    if (!user) {
        throw new Error('Authenticated user is not provisioned');
    }

    return user;
}
