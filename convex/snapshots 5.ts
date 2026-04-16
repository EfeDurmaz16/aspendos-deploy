import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

export const create = mutation({
    args: {
        user_id: v.id('users'),
        snapshot_id: v.string(),
        target_path: v.string(),
        prior_content: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('snapshots', {
            ...args,
            created_at: Date.now(),
        });
    },
});

export const getBySnapshotId = query({
    args: { snapshot_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('snapshots')
            .withIndex('by_snapshot_id', (q) => q.eq('snapshot_id', args.snapshot_id))
            .first();
    },
});

export const listByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const q = ctx.db
            .query('snapshots')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return args.limit ? await q.take(args.limit) : await q.collect();
    },
});

export const remove = mutation({
    args: { id: v.id('snapshots') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
