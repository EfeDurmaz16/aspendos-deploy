import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const tierValidator = v.union(
    v.literal('personal'),
    v.literal('pro'),
    v.literal('pro_byok'),
    v.literal('team'),
    v.literal('team_byok')
);

const statusValidator = v.union(
    v.literal('active'),
    v.literal('past_due'),
    v.literal('canceled'),
    v.literal('trialing')
);

/**
 * Upsert a subscription from Stripe webhook data.
 * If a subscription with the same stripe_subscription_id exists, update it.
 * Otherwise, insert a new record.
 */
export const upsertFromStripe = mutation({
    args: {
        user_id: v.id('users'),
        stripe_subscription_id: v.string(),
        tier: tierValidator,
        status: statusValidator,
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

/**
 * Get the active subscription for a user.
 */
export const getByUser = query({
    args: { user_id: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('subscriptions')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .first();
    },
});

/**
 * Get a subscription by its Stripe subscription ID.
 */
export const getByStripeId = query({
    args: { stripe_subscription_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('subscriptions')
            .withIndex('by_stripe_id', (q) =>
                q.eq('stripe_subscription_id', args.stripe_subscription_id)
            )
            .first();
    },
});

/**
 * Cancel a subscription (set status to canceled).
 */
export const cancel = mutation({
    args: { id: v.id('subscriptions') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'canceled' });
    },
});

/**
 * Update subscription status only (e.g. past_due from failed payment).
 */
export const updateStatus = mutation({
    args: {
        id: v.id('subscriptions'),
        status: statusValidator,
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

/**
 * Update seats count for team subscriptions.
 */
export const updateSeats = mutation({
    args: {
        id: v.id('subscriptions'),
        seats: v.number(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { seats: args.seats });
    },
});
