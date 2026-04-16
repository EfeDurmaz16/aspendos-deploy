import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

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
        const q = ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return args.limit ? await q.take(args.limit) : await q.collect();
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
