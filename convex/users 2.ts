import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const upsertFromWorkOS = mutation({
    args: {
        workos_id: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatar_url: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                email: args.email,
                name: args.name,
                avatar_url: args.avatar_url,
            });
            return existing._id;
        }

        return await ctx.db.insert('users', {
            workos_id: args.workos_id,
            email: args.email,
            name: args.name,
            avatar_url: args.avatar_url,
            tier: 'free',
            created_at: Date.now(),
        });
    },
});

export const getByWorkOSId = query({
    args: { workos_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workos_id', args.workos_id))
            .first();
    },
});

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .first();
    },
});

export const get = query({
    args: { id: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const updateTier = mutation({
    args: {
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
        await ctx.db.patch(args.id, { tier: args.tier });
    },
});

export const updateStripeCustomerId = mutation({
    args: {
        id: v.id('users'),
        stripe_customer_id: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { stripe_customer_id: args.stripe_customer_id });
    },
});

export const updateFidesDid = mutation({
    args: {
        id: v.id('users'),
        fides_did: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { fides_did: args.fides_did });
    },
});
