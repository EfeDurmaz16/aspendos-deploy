/**
 * Usage API Routes
 *
 * Track and analyze AI operation costs per user and system-wide.
 * Provides cost breakdowns, burn rate projections, and budget monitoring.
 */

import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { auditLog } from '../lib/audit-log';
import { usageLedger } from '../lib/usage-ledger';
import { requireAuth } from '../middleware/auth';

type Variables = {
    userId?: string;
    user?: {
        userId: string;
        email: string;
        name?: string;
        image?: string;
        tier?: string;
    };
};

const app = new Hono<{ Variables: Variables }>();

// Admin user IDs or emails
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean);

/**
 * Middleware to check if user is an admin
 */
async function requireAdmin(c: any, next: any) {
    await requireAuth(c, async () => {});

    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is in admin list
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, tier: true },
    });

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    const isAdmin =
        ADMIN_USER_IDS.includes(user.id) ||
        ADMIN_EMAILS.includes(user.email) ||
        user.tier === 'ULTRA'; // ULTRA tier users have admin access

    if (!isAdmin) {
        await auditLog({
            userId,
            action: 'ADMIN_ACCESS_DENIED',
            resource: 'admin',
            ip: c.req.header('x-forwarded-for') || 'unknown',
        });
        return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }

    return next();
}

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * GET /api/usage/costs - Get authenticated user's cost breakdown
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'all' (default: 'month')
 *
 * Returns:
 * - totalCost: Total cost in USD
 * - byModel: Cost breakdown by model with tokens and request count
 * - byDay: Daily cost breakdown
 */
app.get('/costs', requireAuth, async (c) => {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const period = (c.req.query('period') || 'month') as 'day' | 'week' | 'month' | 'all';

    if (!['day', 'week', 'month', 'all'].includes(period)) {
        return c.json({ error: 'Invalid period. Must be day, week, month, or all' }, 400);
    }

    try {
        const breakdown = usageLedger.getUserCosts(userId, period);

        return c.json({
            userId,
            period,
            totalCost: breakdown.totalCost,
            byModel: breakdown.byModel,
            byDay: breakdown.byDay,
        });
    } catch (error) {
        console.error('Error getting user costs:', error);
        return c.json({ error: 'Failed to retrieve cost data' }, 500);
    }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/usage/admin/costs - Admin view of system costs + top spenders
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'all' (default: 'month')
 * - limit: Max number of top spenders to return (default: 10)
 *
 * Returns:
 * - system: Total platform costs grouped by provider
 * - topSpenders: Ranked list of users by cost
 */
app.get('/admin/costs', requireAdmin, async (c) => {
    const period = (c.req.query('period') || 'month') as 'day' | 'week' | 'month' | 'all';
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '10', 10)));

    if (!['day', 'week', 'month', 'all'].includes(period)) {
        return c.json({ error: 'Invalid period. Must be day, week, month, or all' }, 400);
    }

    try {
        const systemCosts = usageLedger.getSystemCosts(period);
        const topSpenders = usageLedger.getTopSpenders(limit);

        // Enrich top spenders with user details
        const userIds = topSpenders.map((s) => s.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                name: true,
                tier: true,
            },
        });

        const userMap = new Map(users.map((u) => [u.id, u]));

        const enrichedSpenders = topSpenders.map((spender) => {
            const user = userMap.get(spender.userId);
            return {
                ...spender,
                email: user?.email || 'unknown',
                name: user?.name || null,
                tier: user?.tier || 'FREE',
            };
        });

        return c.json({
            period,
            system: {
                totalCost: systemCosts.totalCost,
                byProvider: systemCosts.byProvider,
            },
            topSpenders: enrichedSpenders,
        });
    } catch (error) {
        console.error('Error getting system costs:', error);
        return c.json({ error: 'Failed to retrieve cost data' }, 500);
    }
});

/**
 * GET /api/usage/admin/burn-rate - Monthly burn rate projection
 *
 * Returns:
 * - estimatedMonthlyBurn: Projected monthly cost in USD based on recent usage
 * - basedOnPeriod: Which period the estimate is based on (day or week)
 */
app.get('/admin/burn-rate', requireAdmin, async (c) => {
    try {
        const estimatedMonthlyBurn = usageLedger.estimateMonthlyBurn();

        // Determine which period was used for estimation
        const dayEntries = usageLedger.getSystemCosts('day');
        const weekEntries = usageLedger.getSystemCosts('week');

        const basedOnPeriod = weekEntries.totalCost > 0 ? 'week' : 'day';

        return c.json({
            estimatedMonthlyBurn,
            basedOnPeriod,
            currentDailyCost: dayEntries.totalCost,
            currentWeeklyCost: weekEntries.totalCost,
        });
    } catch (error) {
        console.error('Error estimating burn rate:', error);
        return c.json({ error: 'Failed to estimate burn rate' }, 500);
    }
});

export default app;
