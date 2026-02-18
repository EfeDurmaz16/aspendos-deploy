/**
 * Feature flags routes - /api/features/*
 */
import { Hono } from 'hono';
import { getAllFlags, getUserFeatures } from '../lib/feature-flags';

const featuresRoutes = new Hono();

// GET / - Get feature flags for current user
featuresRoutes.get('/', (c) => {
    const userId = c.get('userId') as string | null;
    const user = c.get('user') as Record<string, unknown> | null;
    const tier = ((user as unknown as Record<string, unknown>)?.tier as string) || 'FREE';
    return c.json({
        features: getUserFeatures(userId ?? undefined, tier as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA'),
    });
});

// GET /all - Get all feature flags (admin/debug)
featuresRoutes.get('/all', (c) => {
    return c.json({ flags: getAllFlags() });
});

export default featuresRoutes;
