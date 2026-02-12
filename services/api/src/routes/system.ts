/**
 * System management routes - circuit breakers, job queue, diagnostics
 */
import { Hono } from 'hono';
import { breakers } from '../lib/circuit-breaker';
import { jobQueue } from '../lib/job-queue';

const systemRoutes = new Hono();

// ─── Circuit Breaker Status ───────────────────────────────────────────────────

// GET /system/circuit-breakers - View all circuit breaker states
systemRoutes.get('/circuit-breakers', (c) => {
    return c.json({
        breakers: {
            openai: breakers.openai.getDetailedState(),
            anthropic: breakers.anthropic.getDetailedState(),
            groq: breakers.groq.getDetailedState(),
            qdrant: breakers.qdrant.getDetailedState(),
            google: breakers.google.getDetailedState(),
        },
        summary: {
            openCircuits: Object.values(breakers).filter((b) => b.getState().state === 'OPEN')
                .length,
            totalRequests: Object.values(breakers).reduce(
                (sum, b) => sum + b.getDetailedState().totalRequests,
                0
            ),
            avgSuccessRate: (() => {
                const rates = Object.values(breakers).map((b) => b.getSuccessRate());
                return Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100;
            })(),
        },
    });
});

// POST /system/circuit-breakers/:name/reset - Manual reset
systemRoutes.post('/circuit-breakers/:name/reset', (c) => {
    const name = c.req.param('name') as keyof typeof breakers;
    const breaker = breakers[name];
    if (!breaker) {
        return c.json({ error: `Unknown circuit breaker: ${name}` }, 404);
    }

    breaker.reset();
    return c.json({ success: true, state: breaker.getState() });
});

// ─── Job Queue Management ─────────────────────────────────────────────────────

// GET /system/jobs/stats - Queue statistics
systemRoutes.get('/jobs/stats', (c) => {
    const queue = c.req.query('queue');
    return c.json({
        stats: jobQueue.getStats(queue || undefined),
        deadLetterQueue: jobQueue.getDeadLetterQueue().length,
    });
});

// GET /system/jobs/dead-letter - View dead letter queue
systemRoutes.get('/jobs/dead-letter', (c) => {
    return c.json({ jobs: jobQueue.getDeadLetterQueue().slice(0, 100) });
});

// POST /system/jobs/retry/:jobId - Retry a dead letter job
systemRoutes.post('/jobs/retry/:jobId', (c) => {
    const jobId = c.req.param('jobId');
    const success = jobQueue.retryDead(jobId);
    return c.json({ success });
});

// POST /system/jobs/cleanup - Clean old completed jobs
systemRoutes.post('/jobs/cleanup', (c) => {
    const maxAgeMs = parseInt(c.req.query('maxAgeMs') || '3600000', 10);
    const cleaned = jobQueue.cleanup(maxAgeMs);
    return c.json({ cleaned });
});

// ─── System Diagnostics ───────────────────────────────────────────────────────

// GET /system/info - Runtime info
systemRoutes.get('/info', (c) => {
    return c.json({
        runtime: {
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
            uptime: process.uptime(),
            memoryUsage: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024),
                unit: 'MB',
            },
        },
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

export default systemRoutes;
