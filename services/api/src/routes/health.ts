/**
 * Health check routes - /health, /ready, /metrics, /status, /.well-known/security.txt
 */
import { Hono } from 'hono';
import { breakers } from '../lib/circuit-breaker';
import { checkReadiness } from '../lib/health-checks';

const healthRoutes = new Hono();

// Enhanced health check with database connectivity and circuit breaker states
healthRoutes.get('/', async (c) => {
    const _startTime = Date.now();
    const dependencies: Record<string, { status: 'up' | 'down'; latencyMs?: number }> = {};

    // Check database
    let dbStatus: 'up' | 'down' = 'down';
    let dbLatency = 0;
    try {
        const { prisma } = await import('../lib/prisma');
        const dbStart = Date.now();
        await prisma.$queryRawUnsafe('SELECT 1');
        dbLatency = Date.now() - dbStart;
        dbStatus = 'up';
    } catch (error) {
        console.error('[Health] Database check failed:', error);
    }
    dependencies.database = { status: dbStatus, latencyMs: dbLatency };

    // Check Qdrant (via circuit breaker) with actual ping
    let qdrantStatus: 'up' | 'down' = 'down';
    try {
        const qdrantStart = Date.now();
        await breakers.qdrant.execute(async () => {
            const { searchMemories } = await import('../services/openmemory.service');
            // Lightweight probe: search with empty query, limit 1
            await searchMemories('health-check-probe', 'system', { limit: 1 });
        });
        const qdrantLatency = Date.now() - qdrantStart;
        qdrantStatus = 'up';
        dependencies.qdrant = { status: qdrantStatus, latencyMs: qdrantLatency };
    } catch {
        dependencies.qdrant = { status: qdrantStatus };
    }

    // Get circuit breaker states
    const circuitBreakers = {
        openai: breakers.openai.getState(),
        anthropic: breakers.anthropic.getState(),
        groq: breakers.groq.getState(),
        qdrant: breakers.qdrant.getState(),
        google: breakers.google.getState(),
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (dbStatus === 'down') {
        overallStatus = 'unhealthy';
    } else if (
        qdrantStatus === 'down' ||
        Object.values(circuitBreakers).some((cb) => cb.state === 'OPEN')
    ) {
        overallStatus = 'degraded';
    }

    const response = {
        status: overallStatus,
        version: '0.3.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        dependencies,
        circuitBreakers,
    };

    const statusCode: 200 | 503 = overallStatus === 'unhealthy' ? 503 : 200;
    return c.json(response, statusCode);
});

// Kubernetes-style readiness probe
healthRoutes.get('/ready', async (c) => {
    const result = await checkReadiness();
    const status: 200 | 503 = result.status === 'unhealthy' ? 503 : 200;
    return c.json(result, status);
});

// Deep health check with all dependencies
healthRoutes.get('/deep', async (c) => {
    const result = await checkReadiness();
    return c.json(result);
});

export default healthRoutes;
