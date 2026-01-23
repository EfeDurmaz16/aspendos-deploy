import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 *
 * Used by:
 * - Docker HEALTHCHECK
 * - Kubernetes liveness/readiness probes
 * - Load balancers
 * - Monitoring systems
 */
export async function GET() {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    };

    return NextResponse.json(health, { status: 200 });
}

// Also respond to HEAD requests (for simpler health checks)
export async function HEAD() {
    return new NextResponse(null, { status: 200 });
}
