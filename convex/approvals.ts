import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const create = mutation({
    args: {
        user_id: v.id('users'),
        commit_hash: v.string(),
        surface: v.string(),
        surface_message_id: v.optional(v.string()),
        expires_at: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('approvals', {
            ...args,
            status: 'pending',
        });
    },
});

export const getByCommitHash = query({
    args: { commit_hash: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('approvals')
            .withIndex('by_commit_hash', (q) => q.eq('commit_hash', args.commit_hash))
            .first();
    },
});

export const listPendingByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
        return await ctx.db
            .query('approvals')
            .withIndex('by_user_and_status', (q) =>
                q.eq('user_id', args.user_id).eq('status', 'pending')
            )
            .take(limit);
    },
});

export const approve = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'approved' });
    },
});

export const reject = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'rejected' });
    },
});

export const expire = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'expired' });
    },
});
