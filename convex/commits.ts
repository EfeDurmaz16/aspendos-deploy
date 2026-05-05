import { v } from 'convex/values';
import type { QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

async function requireAuthenticatedUser(ctx: QueryCtx) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new Error('Not authenticated');
    }

    const user = await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', identity.subject))
        .first();

    if (!user) {
        throw new Error('Authenticated user is not provisioned');
    }

    return user;
}

export const create = mutation({
    args: {
        user_id: v.id('users'),
        parent_hash: v.optional(v.string()),
        hash: v.string(),
        ancestor_chain: v.optional(v.array(v.string())),
        tool_name: v.string(),
        args: v.any(),
        status: v.union(
            v.literal('pending'),
            v.literal('executed'),
            v.literal('reverted'),
            v.literal('failed')
        ),
        result: v.optional(v.any()),
        reversibility_class: v.union(
            v.literal('undoable'),
            v.literal('cancelable_window'),
            v.literal('compensatable'),
            v.literal('approval_only'),
            v.literal('irreversible_blocked')
        ),
        rollback_strategy: v.optional(v.any()),
        rollback_deadline: v.optional(v.number()),
        human_explanation: v.optional(v.string()),
        fides_signature: v.optional(v.string()),
        fides_signer_did: v.optional(v.string()),
        counter_signature: v.optional(v.string()),
        counter_signer_did: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('commits', {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const getByHash = query({
    args: { hash: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();
    },
});

export const listByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
        const q = ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const listCurrentUser = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
        return await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', user._id))
            .order('desc')
            .take(limit);
    },
});

export const updateStatus = mutation({
    args: {
        id: v.id('commits'),
        status: v.union(
            v.literal('pending'),
            v.literal('executed'),
            v.literal('reverted'),
            v.literal('failed')
        ),
        result: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: args.status,
            result: args.result,
        });
    },
});

export const listAfterTimestamp = query({
    args: {
        user_id: v.id('users'),
        after_timestamp: v.number(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
        return await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) =>
                q.eq('user_id', args.user_id).gt('timestamp', args.after_timestamp)
            )
            .order('desc')
            .take(limit);
    },
});

export const batchUpdateStatus = mutation({
    args: {
        ids: v.array(v.id('commits')),
        status: v.union(
            v.literal('pending'),
            v.literal('executed'),
            v.literal('reverted'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        for (const id of args.ids) {
            await ctx.db.patch(id, { status: args.status });
        }
    },
});

export const addCounterSignature = mutation({
    args: {
        id: v.id('commits'),
        counter_signature: v.string(),
        counter_signer_did: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            counter_signature: args.counter_signature,
            counter_signer_did: args.counter_signer_did,
        });
    },
});
