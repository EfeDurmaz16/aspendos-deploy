import { v } from 'convex/values';
import { type MutationCtx, mutation, type QueryCtx, query } from './_generated/server';

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

async function getUserByWorkOSId(ctx: MutationCtx | QueryCtx, workosId: string) {
    const user = await ctx.db
        .query('users')
        .withIndex('by_workos_id', (q) => q.eq('workos_id', workosId))
        .first();
    if (!user) {
        throw new Error('Convex user not found for WorkOS id');
    }
    return user;
}

export const scheduleDeletionByWorkOSId = mutation({
    args: {
        service_secret: v.string(),
        workos_id: v.string(),
        scheduled_at: v.number(),
        cancellation_token_hash: v.string(),
        reason: v.optional(v.string()),
        requested_at: v.number(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const user = await getUserByWorkOSId(ctx, args.workos_id);
        const existing = await ctx.db
            .query('pending_deletions')
            .withIndex('by_user_id_and_status', (q) =>
                q.eq('user_id', user._id).eq('status', 'pending')
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                cancellation_token_hash: args.cancellation_token_hash,
                requested_at: args.requested_at,
                ...(args.reason === undefined ? {} : { reason: args.reason }),
            });
            return { scheduled_at: existing.scheduled_at };
        }

        await ctx.db.insert('pending_deletions', {
            user_id: user._id,
            scheduled_at: args.scheduled_at,
            cancellation_token_hash: args.cancellation_token_hash,
            ...(args.reason === undefined ? {} : { reason: args.reason }),
            requested_at: args.requested_at,
            status: 'pending',
        });

        return { scheduled_at: args.scheduled_at };
    },
});

export const cancelDeletionByWorkOSId = mutation({
    args: {
        service_secret: v.string(),
        workos_id: v.string(),
        cancellation_token_hash: v.string(),
        cancelled_at: v.number(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const user = await getUserByWorkOSId(ctx, args.workos_id);
        const existing = await ctx.db
            .query('pending_deletions')
            .withIndex('by_user_id_and_status', (q) =>
                q.eq('user_id', user._id).eq('status', 'pending')
            )
            .first();

        if (!existing || existing.cancellation_token_hash !== args.cancellation_token_hash) {
            return false;
        }

        await ctx.db.patch(existing._id, {
            status: 'cancelled',
            cancelled_at: args.cancelled_at,
        });
        return true;
    },
});

export const getPendingDeletionByWorkOSId = query({
    args: {
        service_secret: v.string(),
        workos_id: v.string(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const user = await getUserByWorkOSId(ctx, args.workos_id);
        const deletion = await ctx.db
            .query('pending_deletions')
            .withIndex('by_user_id_and_status', (q) =>
                q.eq('user_id', user._id).eq('status', 'pending')
            )
            .first();

        if (!deletion) return null;
        return {
            scheduled_at: deletion.scheduled_at,
            reason: deletion.reason ?? null,
            requested_at: deletion.requested_at,
        };
    },
});
