import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const log = mutation({
    args: {
        user_id: v.optional(v.id('users')),
        event_type: v.string(),
        details: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('action_log', {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const listByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const q = ctx.db
            .query('action_log')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return args.limit ? await q.take(args.limit) : await q.collect();
    },
});

export const listRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const q = ctx.db.query('action_log').withIndex('by_timestamp').order('desc');
        return args.limit ? await q.take(args.limit) : await q.take(100);
    },
});
