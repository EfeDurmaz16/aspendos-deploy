import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

async function requireAuthenticatedUser(ctx: MutationCtx) {
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
        commit_hash: v.string(),
        surface: v.string(),
        surface_message_id: v.optional(v.string()),
        expires_at: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert('approvals', {
            ...args,
            status: 'pending',
        });
    },
});

export const getByCommitHash = query({
    args: { commit_hash: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('approvals')
            .withIndex('by_commit_hash', (q) => q.eq('commit_hash', args.commit_hash))
            .first();
    },
});

export const listPendingByUser = query({
    args: { user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
        return await ctx.db
            .query('approvals')
            .withIndex('by_user_and_status', (q) =>
                q.eq('user_id', args.user_id).eq('status', 'pending')
            )
            .take(limit);
    },
});

export const approve = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'approved' });
    },
});

export const reject = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'rejected' });
    },
});

export const expire = mutation({
    args: { id: v.id('approvals') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: 'expired' });
    },
});

export const decide = mutation({
    args: {
        id: v.id('approvals'),
        action: v.union(v.literal('approve'), v.literal('reject')),
        now: v.number(),
    },
    handler: async (ctx, args) => {
        const approval = await ctx.db.get(args.id);
        if (!approval) {
            return { outcome: 'not_found' as const };
        }

        const requestedStatus = args.action === 'approve' ? 'approved' : 'rejected';
        if (approval.status !== 'pending') {
            return {
                outcome: 'already_decided' as const,
                status: approval.status,
                idempotent: approval.status === requestedStatus,
            };
        }

        if (approval.expires_at < args.now) {
            await ctx.db.patch(args.id, { status: 'expired' });
            return { outcome: 'expired' as const, status: 'expired' as const };
        }

        await ctx.db.patch(args.id, { status: requestedStatus });
        return { outcome: 'updated' as const, status: requestedStatus };
    },
});

export const decideCurrentUser = mutation({
    args: {
        id: v.id('approvals'),
        action: v.union(v.literal('approve'), v.literal('reject')),
        now: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuthenticatedUser(ctx);
        const approval = await ctx.db.get(args.id);
        if (!approval || approval.user_id !== user._id) {
            throw new Error('Approval not found');
        }

        const requestedStatus = args.action === 'approve' ? 'approved' : 'rejected';
        if (approval.status !== 'pending') {
            return {
                outcome: 'already_decided' as const,
                status: approval.status,
                idempotent: approval.status === requestedStatus,
            };
        }

        if (approval.expires_at < args.now) {
            await ctx.db.patch(args.id, { status: 'expired' });
            return { outcome: 'expired' as const, status: 'expired' as const };
        }

        await ctx.db.patch(args.id, { status: requestedStatus });
        await ctx.db.insert('action_log', {
            user_id: user._id,
            event_type: `approval.${args.action}`,
            details: {
                commit_hash: approval.commit_hash,
                surface: 'web',
            },
            timestamp: args.now,
        });

        return { outcome: 'updated' as const, status: requestedStatus };
    },
});
