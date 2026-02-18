/**
 * Models routes - /api/models/*
 */
import { Hono } from 'hono';
import { getModelsForTier, SUPPORTED_MODELS } from '../lib/ai-providers';
import { getRateLimitStatus } from '../middleware/rate-limit';

const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
);

function isAdminUser(userId: string | null): boolean {
    return !!userId && adminUserIds.has(userId);
}

const modelsRoutes = new Hono();

// GET / - List all models
modelsRoutes.get('/', (c) => {
    return c.json({
        models: SUPPORTED_MODELS.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            tier: m.tier,
        })),
    });
});

// GET /pinned - Pinned/recommended models
modelsRoutes.get('/pinned', (c) => {
    const pinnedModels = [
        SUPPORTED_MODELS.find((m) => m.id === 'openai/gpt-4o-mini'),
        SUPPORTED_MODELS.find((m) => m.id === 'anthropic/claude-3-5-haiku-20241022'),
        SUPPORTED_MODELS.find((m) => m.id === 'google/gemini-2.0-flash'),
    ].filter(Boolean);

    return c.json({
        pinned: pinnedModels.map((m) => ({
            id: m!.id,
            name: m!.name,
            provider: m!.provider,
        })),
    });
});

// GET /tier/:tier - Models for specific tier
modelsRoutes.get('/tier/:tier', (c) => {
    const tier = c.req.param('tier').toUpperCase() as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA';
    const models = getModelsForTier(tier);
    return c.json({
        tier,
        models: models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
        })),
    });
});

// GET /rate-limit - Rate limit status for current user
modelsRoutes.get('/rate-limit', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = c.get('user') as Record<string, unknown> | null;
    const tier =
        ((user as Record<string, unknown>)?.tier as 'FREE' | 'STARTER' | 'PRO' | 'ULTRA') || 'FREE';

    return c.json(await getRateLimitStatus(userId, tier));
});

// GET /analytics/rate-limits - Rate limit analytics dashboard
modelsRoutes.get('/analytics/rate-limits', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const { getRateLimitDashboard, getUserRateLimitHistory, getNearLimitEvents } = await import(
            '../lib/rate-limit-analytics'
        );

        const scope = c.req.query('scope') || 'user';

        if (scope === 'user') {
            const limit = Math.min(parseInt(c.req.query('limit') || '100', 10) || 100, 500);
            const history = getUserRateLimitHistory(userId, limit);

            return c.json({
                scope: 'user',
                userId,
                history,
            });
        } else if (scope === 'dashboard') {
            if (!isAdminUser(userId)) {
                return c.json({ error: 'Forbidden' }, 403);
            }
            const dashboard = getRateLimitDashboard();
            const nearLimits = getNearLimitEvents();

            return c.json({
                scope: 'dashboard',
                ...dashboard,
                nearLimitEvents: nearLimits,
            });
        } else {
            return c.json({ error: 'Invalid scope. Use "user" or "dashboard"' }, 400);
        }
    } catch (error) {
        console.error('[RateLimitAnalytics] Error fetching analytics:', error);
        return c.json({ error: 'Failed to fetch rate limit analytics' }, 500);
    }
});

export default modelsRoutes;
