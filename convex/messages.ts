import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
    args: {
        conversation_id: v.id('conversations'),
        user_id: v.id('users'),
        role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system'), v.literal('tool')),
        content: v.string(),
        tool_calls: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('messages', {
            ...args,
            created_at: Date.now(),
        });
        await ctx.db.patch(args.conversation_id, { last_message_at: Date.now() });
        return id;
    },
});

export const listByConversation = query({
    args: {
        conversation_id: v.id('conversations'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const q = ctx.db
            .query('messages')
            .withIndex('by_conversation_time', (q) => q.eq('conversation_id', args.conversation_id))
            .order('asc');
        return args.limit ? await q.take(args.limit) : await q.collect();
    },
});

export const get = query({
    args: { id: v.id('messages') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const remove = mutation({
    args: { id: v.id('messages') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
