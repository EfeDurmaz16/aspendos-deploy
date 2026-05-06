import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireServiceSecret } from './lib/serviceSecret';

const DEFAULT_CONVERSATION_LIMIT = 50;
const MAX_CONVERSATION_LIMIT = 200;

function clampLimit(value: number | undefined) {
    return Math.min(Math.max(value ?? DEFAULT_CONVERSATION_LIMIT, 1), MAX_CONVERSATION_LIMIT);
}

export const create = mutation({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        title: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
    args: { service_secret: v.string(), id: v.id('conversations') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db.get(args.id);
    },
});

export const listByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('conversations')
            .withIndex('by_user_recent', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const updateTitle = mutation({
    args: { service_secret: v.string(), id: v.id('conversations'), title: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { title: args.title });
    },
});

export const touch = mutation({
    args: { service_secret: v.string(), id: v.id('conversations') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { last_message_at: Date.now() });
    },
});

export const remove = mutation({
    args: { service_secret: v.string(), id: v.id('conversations') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.delete(args.id);
    },
});
