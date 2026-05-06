import { v } from 'convex/values';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';

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
        service_secret: v.string(),
        user_id: v.id('users'),
        commit_hash: v.string(),
        surface: v.string(),
        surface_message_id: v.optional(v.string()),
        expires_at: v.number(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db.insert('approvals', {
            user_id: args.user_id,
            commit_hash: args.commit_hash,
            surface: args.surface,
            surface_message_id: args.surface_message_id,
            expires_at: args.expires_at,
            status: 'pending',
        });
    },
});

export const getByCommitHash = query({
    args: { service_secret: v.string(), commit_hash: v.string() },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        return await ctx.db
            .query('approvals')
            .withIndex('by_commit_hash', (q) => q.eq('commit_hash', args.commit_hash))
            .first();
    },
});

export const getByIdForUser = query({
    args: { service_secret: v.string(), id: v.id('approvals'), user_id: v.id('users') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const approval = await ctx.db.get(args.id);
        if (!approval || approval.user_id !== args.user_id) {
            return null;
        }
        return approval;
    },
});

export const listPendingByUser = query({
    args: { service_secret: v.string(), user_id: v.id('users'), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
    args: { service_secret: v.string(), id: v.id('approvals'), user_id: v.id('users') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const approval = await ctx.db.get(args.id);
        if (!approval || approval.user_id !== args.user_id) {
            throw new Error('Approval not found');
        }
        await ctx.db.patch(args.id, { status: 'approved' });
    },
});

export const reject = mutation({
    args: { service_secret: v.string(), id: v.id('approvals'), user_id: v.id('users') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        const approval = await ctx.db.get(args.id);
        if (!approval || approval.user_id !== args.user_id) {
            throw new Error('Approval not found');
        }
        await ctx.db.patch(args.id, { status: 'rejected' });
    },
});

export const expire = mutation({
    args: { service_secret: v.string(), id: v.id('approvals') },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
        await ctx.db.patch(args.id, { status: 'expired' });
    },
});

export const decide = mutation({
    args: {
        service_secret: v.string(),
        id: v.id('approvals'),
        action: v.union(v.literal('approve'), v.literal('reject')),
        now: v.number(),
    },
    handler: async (ctx, args) => {
        requireServiceSecret(args.service_secret);
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
