/**
 * Cron job routes - /api/cron/*, /api/scheduler/reengage
 */
import { Hono } from 'hono';
import { enforceRetentionPolicies, getRetentionPolicies } from '../lib/data-retention';
import { verifyTimingSafe } from '../lib/webhook-security';

const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
);

function isAdminUser(userId: string | null): boolean {
    return !!userId && adminUserIds.has(userId);
}

const cronRoutes = new Hono();

// POST /reengage - Trigger re-engagement for churning users (cron job)
cronRoutes.post('/reengage', async (c) => {
    // Verify cron secret (timing-safe comparison to prevent timing attacks)
    const cronSecret = c.req.header('x-cron-secret');
    if (
        !cronSecret ||
        !process.env.CRON_SECRET ||
        !verifyTimingSafe(cronSecret, process.env.CRON_SECRET)
    ) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const { prisma } = await import('../lib/prisma');

        // Find users who haven't sent a message in 7+ days but were active before
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get users with recent activity (30d) but no activity in last 7d
        const activeUsers = await prisma.message.groupBy({
            by: ['userId'],
            where: {
                role: 'user',
                createdAt: { gte: thirtyDaysAgo },
            },
            having: { userId: { _count: { gte: 5 } } },
        });

        let reengaged = 0;
        for (const user of activeUsers) {
            // Check if they have recent activity
            const recentMessage = await prisma.message.findFirst({
                where: { userId: user.userId, role: 'user', createdAt: { gte: sevenDaysAgo } },
            });

            if (recentMessage) continue; // Still active, skip

            // Check if we already sent a re-engagement this week
            const existingNotification = await prisma.notificationLog.findFirst({
                where: {
                    userId: user.userId,
                    type: 'REENGAGEMENT',
                    createdAt: { gte: sevenDaysAgo },
                },
            });

            if (existingNotification) continue; // Already notified

            // Create re-engagement notification
            await prisma.notificationLog.create({
                data: {
                    userId: user.userId,
                    type: 'REENGAGEMENT',
                    title: 'We miss you!',
                    message:
                        "It's been a while since we chatted. I've been thinking about some topics from our last conversation...",
                    channel: 'in_app',
                    status: 'pending',
                },
            });
            reengaged++;
        }

        return c.json({ success: true, reengagedUsers: reengaged });
    } catch (error) {
        console.error('[Reengage] Failed:', error);
        return c.json({ error: 'Re-engagement failed' }, 500);
    }
});

// POST /retention - Enforce data retention policies
cronRoutes.post('/retention', async (c) => {
    // Timing-safe comparison to prevent timing attacks
    const secret = c.req.header('x-cron-secret');
    if (!secret || !process.env.CRON_SECRET || !verifyTimingSafe(secret, process.env.CRON_SECRET)) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const results = await enforceRetentionPolicies();
        const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);
        const errors = results.filter((r) => r.error);

        console.info(
            JSON.stringify({
                event: 'retention_enforced',
                timestamp: new Date().toISOString(),
                totalDeleted,
                results,
            })
        );

        return c.json({ success: true, totalDeleted, results, errors: errors.length });
    } catch (error) {
        console.error('[Retention] Failed:', error);
        return c.json({ error: 'Retention enforcement failed' }, 500);
    }
});

// GET /retention/policies - Get retention policies (admin only)
cronRoutes.get('/retention/policies', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    return c.json({ policies: getRetentionPolicies() });
});

export default cronRoutes;
