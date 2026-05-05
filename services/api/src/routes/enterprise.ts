import { Hono } from 'hono';
import { api, getConvexClient } from '../lib/convex';
import { requireAuth } from '../middleware/auth';
import { requireTier } from '../middleware/tier-gate';

const enterprise = new Hono();

enterprise.use('*', requireAuth);
enterprise.use('*', requireTier('team', 'Enterprise features'));

enterprise.post('/organizations', async (c) => {
    const userId = c.get('userId')!;
    const { name, slug } = await c.req.json();

    if (!name || !slug) {
        return c.json({ error: 'name and slug required' }, 400);
    }

    try {
        const client = getConvexClient();
        const orgId = await client.mutation(api.organizations.create, {
            name,
            slug,
            owner_id: userId as any,
            tier: 'team',
        });
        return c.json({ id: orgId, name, slug }, 201);
    } catch (e: any) {
        return c.json({ error: e?.message ?? 'Failed to create organization' }, 400);
    }
});

enterprise.get('/organizations', async (c) => {
    const userId = c.get('userId')!;
    try {
        const client = getConvexClient();
        const orgs = await client.query(api.organizations.listByUser, {
            user_id: userId as any,
        });
        return c.json({ organizations: orgs });
    } catch {
        return c.json({ organizations: [] });
    }
});

enterprise.get('/organizations/:slug', async (c) => {
    const { slug } = c.req.param();
    try {
        const client = getConvexClient();
        const org = await client.query(api.organizations.getBySlug, { slug });
        if (!org) return c.json({ error: 'Not found' }, 404);
        return c.json(org);
    } catch {
        return c.json({ error: 'Failed to fetch organization' }, 500);
    }
});

enterprise.get('/organizations/:slug/members', async (c) => {
    const { slug } = c.req.param();
    try {
        const client = getConvexClient();
        const org = await client.query(api.organizations.getBySlug, { slug });
        if (!org) return c.json({ error: 'Not found' }, 404);
        const members = await client.query(api.organizations.getMembers, {
            org_id: org._id,
        });
        return c.json({ members });
    } catch {
        return c.json({ error: 'Failed to fetch members' }, 500);
    }
});

enterprise.post('/organizations/:slug/members', async (c) => {
    const { slug } = c.req.param();
    const { user_id, role } = await c.req.json();

    try {
        const client = getConvexClient();
        const org = await client.query(api.organizations.getBySlug, { slug });
        if (!org) return c.json({ error: 'Not found' }, 404);

        await client.mutation(api.organizations.addMember, {
            org_id: org._id,
            user_id: user_id as any,
            role: role || 'member',
        });
        return c.json({ success: true }, 201);
    } catch (e: any) {
        return c.json({ error: e?.message ?? 'Failed to add member' }, 400);
    }
});

export default enterprise;
