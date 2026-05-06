import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { requireAuthenticatedUser } from './lib/auth';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

function requireServiceSecret(serviceSecret: string) {
    const expected = process.env.CONVEX_SERVICE_SECRET;
    if (!expected) {
        throw new Error('CONVEX_SERVICE_SECRET is not configured');
    }
    if (serviceSecret !== expected) {
        throw new Error('Invalid service secret');
    }
}

export const create = mutation({
    args: {
        service_secret: v.string(),
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
        void ctx;
        requireServiceSecret(args.service_secret);
        void args;
        throw new Error('Commit creation is append-only; use governance.signAndCommit');
    },
});

export const getByHash = query({
    args: { service_secret: v.string(), hash: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();
    },
});

export const getCurrentUserByHash = query({
    args: { hash: v.string() },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const commit = await ctx.db
            .query('commits')
            .withIndex('by_hash', (q) => q.eq('hash', args.hash))
            .first();

        if (!commit || commit.user_id !== user._id) {
            return null;
        }

        return commit;
    },
});

export const listByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
        service_secret: v.string(),
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
        void ctx;
        requireServiceSecret(args.service_secret);
        void args.id;
        void args.status;
        void args.result;
        throw new Error('Commit status is append-only; use governance.signAndCommit');
    },
});

export const updateCurrentUserStatus = mutation({
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
        void ctx;
        void args;
        throw new Error('Commit status is append-only; use governance.signAndCommit');
    },
});

export const listAfterTimestamp = query({
    args: {
        service_secret: v.string(),
        user_id: v.id('users'),
        after_timestamp: v.number(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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

export const listCurrentUserAfterTimestamp = query({
    args: {
        after_timestamp: v.number(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const limit = Math.min(Math.max(args.limit ?? 100, 1), 500);
        return await ctx.db
            .query('commits')
            .withIndex('by_user_time', (q) =>
                q.eq('user_id', user._id).gt('timestamp', args.after_timestamp)
            )
            .order('desc')
            .take(limit);
    },
});

export const batchUpdateStatus = mutation({
    args: {
        service_secret: v.string(),
        ids: v.array(v.id('commits')),
        status: v.union(
            v.literal('pending'),
            v.literal('executed'),
            v.literal('reverted'),
            v.literal('failed')
        ),
    },
    handler: async (ctx, args) => {
        void ctx;
        requireServiceSecret(args.service_secret);
        void args.ids;
        void args.status;
        throw new Error('Commit status is append-only; use governance.signAndCommit');
    },
});

export const addCounterSignature = mutation({
    args: {
        service_secret: v.string(),
        id: v.id('commits'),
        counter_signature: v.string(),
        counter_signer_did: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, {
            counter_signature: args.counter_signature,
            counter_signer_did: args.counter_signer_did,
        });
    },
});
