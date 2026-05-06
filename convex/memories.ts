import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_MEMORY_LIMIT = 100;
const MAX_MEMORY_LIMIT = 500;

function requireServiceSecret(serviceSecret: string) {
    const expected = process.env.CONVEX_SERVICE_SECRET;
    if (!expected) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    if (serviceSecret !== expected) {
        throw new Error('Invalid service secret');
    }
}

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
