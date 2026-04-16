import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const grant = mutation({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('tool_allowlist')
            .withIndex('by_user_tool', (q) =>
                q.eq('user_id', args.user_id).eq('tool_name', args.tool_name)
            )
            .first();
        if (existing) return existing._id;

        return await ctx.db.insert('tool_allowlist', {
            user_id: args.user_id,
            tool_name: args.tool_name,
            granted_at: Date.now(),
        });
    },
});

export const revoke = mutation({
    args: { id: v.id('tool_allowlist') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const isAllowed = query({
    args: {
        user_id: v.id('users'),
        tool_name: v.string(),
    },
    handler: async (ctx, args) => {
        const entry = await ctx.db
            .query('tool_allowlist')
            .withIndex('by_user_tool', (q) =>
                q.eq('user_id', args.user_id).eq('tool_name', args.tool_name)
            )
            .first();
        return !!entry;
    },
});

export const listByUser = query({
    args: { user_id: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('tool_allowlist')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .collect();
    },
});
