import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const DEFAULT_ACTION_LOG_LIMIT = 100;
const MAX_ACTION_LOG_LIMIT = 500;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_ACTION_LOG_LIMIT, 1), MAX_ACTION_LOG_LIMIT);
}

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
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('action_log')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const listRecent = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = clampLimit(args.limit);
        const q = ctx.db.query('action_log').withIndex('by_timestamp').order('desc');
        return await q.take(limit);
    },
});
