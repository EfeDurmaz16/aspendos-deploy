/**
 * Deep Health Checks
 * Kubernetes-style readiness and liveness probes
 */

interface HealthCheckResult {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
        database: { status: string; latencyMs?: number; error?: string };
        supermemory: { status: string; latencyMs?: number; error?: string };
        redis: { status: string; latencyMs?: number; error?: string };
    };
    uptime: number;
    timestamp: string;
}

export async function checkReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
        database: { status: 'unknown' as string },
        supermemory: { status: 'unknown' as string },
        redis: { status: 'unknown' as string },
    };

    // Check database with timing
    try {
        const { prisma } = await import('./prisma');
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;
        checks.database = { status: 'healthy', latencyMs: dbLatency };
    } catch (error) {
        checks.database = {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    // Check SuperMemory with timing (graceful)
    try {
        if (!process.env.SUPERMEMORY_API_KEY) {
            checks.supermemory = { status: 'not_configured' };
        } else {
            const smStart = Date.now();
            const { searchMemories } = await import('../services/memory-router.service');
            await searchMemories('health-check-probe', 'system', { limit: 1 });
            const smLatency = Date.now() - smStart;
            checks.supermemory = { status: 'healthy', latencyMs: smLatency };
        }
    } catch (error) {
        checks.supermemory = {
            status: 'degraded',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    // Check Redis with timing (graceful)
    try {
        // Check if Upstash Redis is configured
        const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
        const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

        if (!redisUrl || !redisToken) {
            checks.redis = { status: 'not_configured' };
        } else {
            const redisStart = Date.now();
            const response = await fetch(`${redisUrl}/ping`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${redisToken}`,
                },
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });
            const redisLatency = Date.now() - redisStart;

            if (response.ok) {
                checks.redis = { status: 'healthy', latencyMs: redisLatency };
            } else {
                checks.redis = {
                    status: 'degraded',
                    latencyMs: redisLatency,
                    error: `HTTP ${response.status}`,
                };
            }
        }
    } catch (error) {
        checks.redis = {
            status: 'degraded',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }

    // Determine aggregate status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Database is critical - if down, system is unhealthy
    if (checks.database.status === 'unhealthy') {
        overallStatus = 'unhealthy';
    }
    // SuperMemory or Redis degraded = overall degraded
    else if (
        checks.supermemory.status === 'unhealthy' ||
        checks.supermemory.status === 'degraded' ||
        checks.redis.status === 'unhealthy' ||
        checks.redis.status === 'degraded'
    ) {
        overallStatus = 'degraded';
    }

    return {
        status: overallStatus,
        checks,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    };
}

export function checkLiveness(): { status: string; uptime: number } {
    return { status: 'ok', uptime: process.uptime() };
}
