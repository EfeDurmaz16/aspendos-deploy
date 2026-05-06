import { v } from 'convex/values';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

declare const process: { env: { CONVEX_SERVICE_SECRET?: string } };

const DEFAULT_SNAPSHOT_LIMIT = 50;
const MAX_SNAPSHOT_LIMIT = 200;

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
    return Math.min(Math.max(value ?? DEFAULT_SNAPSHOT_LIMIT, 1), MAX_SNAPSHOT_LIMIT);
}

async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
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
        service_secret: v.string(),
        user_id: v.id('users'),
        snapshot_id: v.string(),
        target_path: v.string(),
        prior_content: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db.insert('snapshots', {
            user_id: args.user_id,
            snapshot_id: args.snapshot_id,
            target_path: args.target_path,
            prior_content: args.prior_content,
            created_at: Date.now(),
        });
    },
});

export const getBySnapshotId = query({
    args: { service_secret: v.string(), snapshot_id: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('snapshots')
            .withIndex('by_snapshot_id', (q) => q.eq('snapshot_id', args.snapshot_id))
            .first();
    },
});

export const getCurrentUserBySnapshotId = query({
    args: { snapshot_id: v.string() },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const snapshot = await ctx.db
            .query('snapshots')
            .withIndex('by_snapshot_id', (q) => q.eq('snapshot_id', args.snapshot_id))
            .first();

        if (!snapshot || snapshot.user_id !== user._id) {
            return null;
        }

        return snapshot;
    },
});

export const listByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const limit = clampLimit(args.limit);
        const q = ctx.db
            .query('snapshots')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .order('desc');
        return await q.take(limit);
    },
});

export const remove = mutation({
    args: { service_secret: v.string(), id: v.id('snapshots') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.delete(args.id);
    },
});
