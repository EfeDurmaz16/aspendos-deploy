import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const DEFAULT_MEMORY_LIMIT = 100;
const MAX_MEMORY_LIMIT = 500;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_MEMORY_LIMIT, 1), MAX_MEMORY_LIMIT);
}

export const create = mutation({
    args: {
        user_id: v.id('users'),
        supermemory_id: v.optional(v.string()),
        content_preview: v.optional(v.string()),
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('memories', {
            ...args,
            created_at: Date.now(),
        });
    },
});

export const listByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('memories')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const remove = mutation({
    args: { id: v.id('memories') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
