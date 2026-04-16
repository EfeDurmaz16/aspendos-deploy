import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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
        const q = ctx.db
            .query('memories')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return args.limit ? await q.take(args.limit) : await q.collect();
    },
});

export const remove = mutation({
    args: { id: v.id('memories') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
