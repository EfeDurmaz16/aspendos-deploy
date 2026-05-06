import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

const DEFAULT_BYOK_CREDENTIAL_LIMIT = 50;
const MAX_BYOK_CREDENTIAL_LIMIT = 200;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_BYOK_CREDENTIAL_LIMIT, 1), MAX_BYOK_CREDENTIAL_LIMIT);
}

async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
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

    const user = await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', identity.subject))
        .first();

    if (!user) {
        throw new Error('Authenticated user is not provisioned');
    }

    return user;
}

export const store = mutation({
    args: {
        provider: v.string(),
        encrypted_key: v.string(),
        iv: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const existing = await ctx.db
            .query('byok_credentials')
            .withIndex('by_user_provider', (q) =>
                q.eq('user_id', user._id).eq('provider', args.provider)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                encrypted_key: args.encrypted_key,
                iv: args.iv,
                last_rotated_at: Date.now(),
            });
            return existing._id;
        }

        return await ctx.db.insert('byok_credentials', {
            ...args,
            user_id: user._id,
            last_rotated_at: Date.now(),
        });
    },
});

export const getByProvider = query({
    args: {
        provider: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        return await ctx.db
            .query('byok_credentials')
            .withIndex('by_user_provider', (q) =>
                q.eq('user_id', user._id).eq('provider', args.provider)
            )
            .first();
    },
});

export const listByUser = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const limit = clampLimit(args.limit);
        return await ctx.db
            .query('byok_credentials')
            .withIndex('by_user', (q) => q.eq('user_id', user._id))
            .take(limit);
    },
});

export const remove = mutation({
    args: { id: v.id('byok_credentials') },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const credential = await ctx.db.get(args.id);
        if (!credential || credential.user_id !== user._id) {
            throw new Error('BYOK credential not found');
        }

        await ctx.db.delete(args.id);
    },
});
