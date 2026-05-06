import { v } from 'convex/values';
import type { QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

function requireServiceSecret(serviceSecret: string) {
    const expected = process.env.CONVEX_SERVICE_SECRET;
    if (!expected) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    if (serviceSecret !== expected) {
        throw new Error('Invalid service secret');
    }
}

async function requireAuthenticatedUser(ctx: QueryCtx) {
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

    return await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', identity.subject))
        .first();
}

export const upsertFromWorkOS = mutation({
    args: {
        service_secret: v.string(),
        workos_id: v.string(),
        auth_token_identifier: v.optional(v.string()),
        email: v.string(),
        name: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const existing = await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                ...(args.auth_token_identifier === undefined
                    ? {}
                    : { auth_token_identifier: args.auth_token_identifier }),
                ...(args.name === undefined ? {} : { name: args.name }),
                ...(args.avatar_url === undefined ? {} : { avatar_url: args.avatar_url }),
            });
            return existing._id;
        }

        return await ctx.db.insert('users', {
            workos_id: args.workos_id,
            ...(args.auth_token_identifier === undefined
                ? {}
                : { auth_token_identifier: args.auth_token_identifier }),
            email: args.email,
            ...(args.name === undefined ? {} : { name: args.name }),
            ...(args.avatar_url === undefined ? {} : { avatar_url: args.avatar_url }),
            tier: 'free',
            created_at: Date.now(),
        });
    },
});

export const getByWorkOSId = query({
    args: { service_secret: v.string(), workos_id: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
            .first();
    },
});

export const getCurrent = query({
    args: {},
    handler: async (ctx) => {
        return await requireAuthenticatedUser(ctx);
    },
});

export const getByEmail = query({
    args: { service_secret: v.string(), email: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .first();
    },
});

export const get = query({
    args: { service_secret: v.string(), id: v.id('users') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db.get(args.id);
    },
});

export const updateTier = mutation({
    args: {
        service_secret: v.string(),
        id: v.id('users'),
        tier: v.union(
            v.literal('free'),
            v.literal('personal'),
            v.literal('pro'),
            v.literal('pro_byok'),
            v.literal('team'),
            v.literal('team_byok')
        ),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { tier: args.tier });
    },
});

export const updateStripeCustomerId = mutation({
    args: {
        service_secret: v.string(),
        id: v.id('users'),
        stripe_customer_id: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { stripe_customer_id: args.stripe_customer_id });
    },
});

export const updateFidesDid = mutation({
    args: {
        service_secret: v.string(),
        id: v.id('users'),
        fides_did: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { fides_did: args.fides_did });
    },
});
