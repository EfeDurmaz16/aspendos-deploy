import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const create = mutation({
    args: {
        user_id: v.id('users'),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();
        return await ctx.db.insert('conversations', {
            user_id: args.user_id,
            title: args.title,
            created_at: now,
            last_message_at: now,
        });
    },
});

export const get = query({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const listByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const q = ctx.db
            .query('conversations')
            .withIndex('by_user_recent', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return args.limit ? await q.take(args.limit) : await q.collect();
    },
});

export const updateTitle = mutation({
    args: { id: v.id('conversations'), title: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { title: args.title });
    },
});

export const touch = mutation({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { last_message_at: Date.now() });
    },
});

export const remove = mutation({
    args: { id: v.id('conversations') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
