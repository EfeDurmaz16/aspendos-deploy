import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

const DEFAULT_SNAPSHOT_LIMIT = 50;
const MAX_SNAPSHOT_LIMIT = 200;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_SNAPSHOT_LIMIT, 1), MAX_SNAPSHOT_LIMIT);
}

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
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('snapshots')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const remove = mutation({
    args: { id: v.id('snapshots') },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
