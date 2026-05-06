import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireServiceSecret } from './lib/serviceSecret';

const DEFAULT_MEMORY_LIMIT = 100;
const MAX_MEMORY_LIMIT = 500;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_MEMORY_LIMIT, 1), MAX_MEMORY_LIMIT);
}

export const create = mutation({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        supermemory_id: v.optional(v.string()),
        content_preview: v.optional(v.string()),
        source: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const memory = {
            user_id: args.user_id,
            created_at: Date.now(),
            ...(args.supermemory_id === undefined ? {} : { supermemory_id: args.supermemory_id }),
            ...(args.content_preview === undefined
                ? {}
                : { content_preview: args.content_preview }),
            ...(args.source === undefined ? {} : { source: args.source }),
        };
        return await ctx.db.insert('memories', {
            ...memory,
        });
    },
});

export const listByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('memories')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const remove = mutation({
    args: { service_secret: v.string(), id: v.id('memories') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.delete(args.id);
    },
});
