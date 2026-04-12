import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
    args: {
        name: v.string(),
        slug: v.string(),
        owner_id: v.id('users'),
        tier: v.union(v.literal('team'), v.literal('team_byok'), v.literal('enterprise')),
        workos_org_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .first();
        if (existing) throw new Error(`Organization slug "${args.slug}" already taken`);

        const orgId = await ctx.db.insert('organizations', {
            ...args,
            created_at: Date.now(),
        });

        await ctx.db.insert('org_members', {
            org_id: orgId,
            user_id: args.owner_id,
            role: 'owner',
            joined_at: Date.now(),
        });

        return orgId;
    },
});

export const getBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('organizations')
            .withIndex('by_slug', (q) => q.eq('slug', args.slug))
            .first();
    },
});

export const listByUser = query({
    args: { user_id: v.id('users') },
    handler: async (ctx, args) => {
        const memberships = await ctx.db
            .query('org_members')
            .withIndex('by_user', (q) => q.eq('user_id', args.user_id))
            .collect();

        const orgs = await Promise.all(
            memberships.map(async (m) => {
                const org = await ctx.db.get(m.org_id);
                return org ? { ...org, role: m.role } : null;
            }),
        );

        return orgs.filter(Boolean);
    },
});

export const addMember = mutation({
    args: {
        org_id: v.id('organizations'),
        user_id: v.id('users'),
        role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('org_members')
            .withIndex('by_org_user', (q) => q.eq('org_id', args.org_id).eq('user_id', args.user_id))
            .first();
        if (existing) throw new Error('User is already a member');

        return await ctx.db.insert('org_members', {
            ...args,
            joined_at: Date.now(),
        });
    },
});

export const removeMember = mutation({
    args: {
        org_id: v.id('organizations'),
        user_id: v.id('users'),
    },
    handler: async (ctx, args) => {
        const member = await ctx.db
            .query('org_members')
            .withIndex('by_org_user', (q) => q.eq('org_id', args.org_id).eq('user_id', args.user_id))
            .first();
        if (!member) return;
        if (member.role === 'owner') throw new Error('Cannot remove the owner');
        await ctx.db.delete(member._id);
    },
});

export const updateMemberRole = mutation({
    args: {
        org_id: v.id('organizations'),
        user_id: v.id('users'),
        role: v.union(v.literal('admin'), v.literal('member'), v.literal('viewer')),
    },
    handler: async (ctx, args) => {
        const member = await ctx.db
            .query('org_members')
            .withIndex('by_org_user', (q) => q.eq('org_id', args.org_id).eq('user_id', args.user_id))
            .first();
        if (!member) throw new Error('Member not found');
        if (member.role === 'owner') throw new Error('Cannot change owner role');
        await ctx.db.patch(member._id, { role: args.role });
    },
});

export const getMembers = query({
    args: { org_id: v.id('organizations') },
    handler: async (ctx, args) => {
        const members = await ctx.db
            .query('org_members')
            .withIndex('by_org', (q) => q.eq('org_id', args.org_id))
            .collect();

        return Promise.all(
            members.map(async (m) => {
                const user = await ctx.db.get(m.user_id);
                return { ...m, user };
            }),
        );
    },
});
