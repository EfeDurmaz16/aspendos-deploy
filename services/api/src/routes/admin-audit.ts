/**
 * Admin audit & DLQ routes - /api/admin/audit/*, /api/admin/dlq/*
 */
import { Hono } from 'hono';
import { dlq } from '../lib/dead-letter-queue';

const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
);

function isAdminUser(userId: string | null): boolean {
    return !!userId && adminUserIds.has(userId);
}

const adminAuditRoutes = new Hono();

// GET /audit - Query audit log with filters
adminAuditRoutes.get('/audit', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const admin = isAdminUser(userId);

    const { auditStore } = await import('../lib/audit-store');

    // Parse query parameters
    const targetUserId = c.req.query('userId');
    if (!admin && targetUserId && targetUserId !== userId) {
        return c.json({ error: 'Forbidden' }, 403);
    }
    const effectiveUserId = admin ? targetUserId : userId;
    const action = c.req.query('action');
    const resource = c.req.query('resource');
    const fromDate = c.req.query('from') ? new Date(c.req.query('from')!) : undefined;
    const toDate = c.req.query('to') ? new Date(c.req.query('to')!) : undefined;
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 500);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

    try {
        const entries = auditStore.getAuditLog({
            userId: effectiveUserId,
            action,
            resource,
            fromDate,
            toDate,
            limit,
            offset,
        });

        const total = auditStore.getCount({
            userId: effectiveUserId,
            action,
            resource,
            fromDate,
            toDate,
        });

        return c.json({
            entries,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        console.error('[Audit] Query failed:', error);
        return c.json({ error: 'Failed to query audit log' }, 500);
    }
});

// GET /audit/stats - Audit statistics (admin only)
adminAuditRoutes.get('/audit/stats', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    try {
        const { auditStore } = await import('../lib/audit-store');
        const stats = auditStore.getAuditStats();
        return c.json(stats);
    } catch (error) {
        console.error('[Audit] Stats query failed:', error);
        return c.json({ error: 'Failed to get audit stats' }, 500);
    }
});

// GET /dlq - Get DLQ stats (admin only)
adminAuditRoutes.get('/dlq', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    const stats = dlq.getStats();
    return c.json({
        stats,
        timestamp: new Date().toISOString(),
    });
});

// GET /dlq/dead - Get dead entries (admin only)
adminAuditRoutes.get('/dlq/dead', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
    const dead = dlq.getDead().slice(0, limit);

    return c.json({
        entries: dead,
        total: dlq.getDead().length,
        limit,
    });
});

// POST /dlq/:id/replay - Replay a dead entry (admin only)
adminAuditRoutes.post('/dlq/:id/replay', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    const id = c.req.param('id');
    const entry = dlq.replayDead(id);

    if (!entry) {
        return c.json({ error: 'Entry not found or not in dead state' }, 404);
    }

    return c.json({
        success: true,
        entry,
        message: 'Entry moved back to pending queue',
    });
});

export default adminAuditRoutes;
