import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_TOOL_ALLOWLIST_LIMIT = 100;
const MAX_TOOL_ALLOWLIST_LIMIT = 500;

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
    return Math.min(Math.max(value ?? DEFAULT_TOOL_ALLOWLIST_LIMIT, 1), MAX_TOOL_ALLOWLIST_LIMIT);
}

export const grant = mutation({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        tool_name: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
    args: { service_secret: v.string(), id: v.id('tool_allowlist'), user_id: v.id('users') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const entry = await ctx.db.get(args.id);
        if (!entry || entry.user_id !== args.user_id) {
            throw new Error('Tool allowlist entry not found');
        }
        await ctx.db.delete(args.id);
    },
});

export const isAllowed = query({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        tool_name: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        return await ctx.db
            .query('tool_allowlist')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .take(limit);
    },
});
