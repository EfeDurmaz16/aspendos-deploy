import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_ACTION_LOG_LIMIT = 100;
const MAX_ACTION_LOG_LIMIT = 500;

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
    return Math.min(Math.max(value ?? DEFAULT_ACTION_LOG_LIMIT, 1), MAX_ACTION_LOG_LIMIT);
}

export const log = mutation({
    args: {
        service_secret: v.string(),
        user_id: v.optional(v.id('users')),
        event_type: v.string(),
        details: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const row = {
            event_type: args.event_type,
            timestamp: Date.now(),
            ...(args.user_id === undefined ? {} : { user_id: args.user_id }),
            ...(args.details === undefined ? {} : { details: args.details }),
        };
        return await ctx.db.insert('action_log', {
            ...row,
        });
    },
});

export const listByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('action_log')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const listRecent = query({
    args: { service_secret: v.string(), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db.query('action_log').withIndex('by_timestamp').order('desc');
        return await q.take(limit);
    },
});
