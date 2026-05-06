import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_MESSAGE_LIMIT = 200;
const MAX_MESSAGE_LIMIT = 500;

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
    return Math.min(Math.max(value ?? DEFAULT_MESSAGE_LIMIT, 1), MAX_MESSAGE_LIMIT);
}

export const create = mutation({
    args: {
        service_secret: v.string(),
        conversation_id: v.id('conversations'),
        user_id: v.id('users'),
        role: v.union(
            v.literal('user'),
            v.literal('assistant'),
            v.literal('system'),
            v.literal('tool')
        ),
        content: v.string(),
        tool_calls: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const message = {
            conversation_id: args.conversation_id,
            user_id: args.user_id,
            role: args.role,
            content: args.content,
            created_at: Date.now(),
            ...(args.tool_calls === undefined ? {} : { tool_calls: args.tool_calls }),
        };
        const id = await ctx.db.insert('messages', {
            ...message,
        });
        await ctx.db.patch(args.conversation_id, { last_message_at: Date.now() });
        return id;
    },
});

export const listByConversation = query({
    args: {
        service_secret: v.string(),
        conversation_id: v.id('conversations'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('messages')
            .withIndex('by_conversation_time', (q) => q.eq('conversation_id', args.conversation_id))
            .order('asc');
        return await q.take(limit);
    },
});

export const get = query({
    args: { service_secret: v.string(), id: v.id('messages') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db.get(args.id);
    },
});

export const remove = mutation({
    args: { service_secret: v.string(), id: v.id('messages') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.delete(args.id);
    },
});
