import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const upsertFromStripe = mutation({
    args: {
        user_id: v.id('users'),
        stripe_subscription_id: v.string(),
        tier: v.union(
            v.literal('personal'),
            v.literal('pro'),
            v.literal('pro_byok'),
            v.literal('team'),
            v.literal('team_byok')
        ),
        status: v.union(
            v.literal('active'),
            v.literal('past_due'),
            v.literal('canceled'),
            v.literal('trialing')
        ),
        current_period_end: v.number(),
        seats: v.optional(v.number()),
        byok: v.boolean(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('subscriptions')
            .withIndex('by_stripe_id', (q) =>
                q.eq('stripe_subscription_id', args.stripe_subscription_id)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                tier: args.tier,
                status: args.status,
                current_period_end: args.current_period_end,
                seats: args.seats,
                byok: args.byok,
            });
            return existing._id;
        }

        return await ctx.db.insert('subscriptions', args);
    },
});

export const getByUser = query({
    args: { user_id: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('subscriptions')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .first();
    },
});

export const cancel = mutation({
    args: { id: v.id('subscriptions') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'canceled' });
    },
});
