/**
 * Tracing routes - /api/traces/*
 */
import { Hono } from 'hono';
import { exportTracesOTLP, getTrace, getTraceStats, getTraces } from '../middleware/tracing';

const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
);

function isAdminUser(userId: string | null): boolean {
    return !!userId && adminUserIds.has(userId);
}

const tracesRoutes = new Hono();

// GET / - List recent traces (paginated, filterable)
tracesRoutes.get('/', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    const status = c.req.query('status') as 'ok' | 'error' | undefined;
    const path = c.req.query('path');
    const minDuration = c.req.query('minDuration')
        ? parseInt(c.req.query('minDuration')!, 10)
        : undefined;
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 100;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0;

    const traces = getTraces({
        status,
        path,
        minDuration,
        limit: Math.min(limit, 500), // Cap at 500
        offset,
    });

    const stats = getTraceStats();

    return c.json({
        traces: traces.map((t) => ({
            traceId: t.traceId,
            startTime: t.startTime,
            endTime: t.endTime,
            duration: t.duration,
            status: t.status,
            method: t.method,
            path: t.path,
            statusCode: t.statusCode,
            userId: t.userId,
            requestId: t.requestId,
            spanCount: t.spans.length,
        })),
        pagination: {
            limit,
            offset,
            total: stats.total,
        },
        stats,
    });
});

// GET /export/otlp - Export traces in OpenTelemetry format
// NOTE: This must be registered before /:traceId to avoid conflict
tracesRoutes.get('/export/otlp', (c) => {
    const traceIds = c.req.query('traceIds')?.split(',');
    const otlp = exportTracesOTLP(traceIds);

    return c.json(otlp, 200, {
        'Content-Type': 'application/json',
    });
});

// GET /:traceId - Get full trace detail with spans
tracesRoutes.get('/:traceId', (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    if (!isAdminUser(userId)) return c.json({ error: 'Forbidden' }, 403);

    const traceId = c.req.param('traceId');
    const trace = getTrace(traceId);

    if (!trace) {
        return c.json({ error: 'Trace not found' }, 404);
    }

    return c.json(trace);
});

// ============================================
// AGENT ACTION LOG TRACES (for /agent-log dashboard)
// ============================================

// GET /traces/recent - Get recent agent actions for the logged-in user
tracesRoutes.get('/recent', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    try {
        const { getRecentActions } = await import('../services/action-log.service');
        const actions = await getRecentActions(userId, { limit: 50 });
        return c.json({ actions });
    } catch {
        return c.json({ actions: [] });
    }
});

// GET /traces/session/:sessionId - Get session summary
tracesRoutes.get('/session/:sessionId', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const sessionId = c.req.param('sessionId');
    try {
        const { getSessionSummary } = await import('../services/causal-trace.service');
        const summary = await getSessionSummary(userId, sessionId);
        return c.json(summary);
    } catch {
        return c.json({ error: 'Session not found' }, 404);
    }
});

// GET /traces/causal/:actionId - Get causal chain for an action
tracesRoutes.get('/causal/:actionId', async (c) => {
    const userId = c.get('userId') as string | null;
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const actionId = c.req.param('actionId');
    try {
        const { getCausalChain } = await import('../services/causal-trace.service');
        const chain = await getCausalChain(actionId);
        return c.json(chain);
    } catch {
        return c.json({ error: 'Action not found' }, 404);
    }
});

export default tracesRoutes;
