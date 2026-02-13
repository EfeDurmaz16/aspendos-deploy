/**
 * Canary Middleware
 *
 * Adds deployment version headers to all responses and records
 * success/failure metrics for canary comparison.
 */

import type { Context, Next } from 'hono';
import { getDeploymentInfo, getVersionHeaders, recordCanaryResult } from '../lib/canary';

/**
 * Canary middleware that tracks request success/failure
 * and adds version headers to responses
 */
export async function canaryMiddleware(c: Context, next: Next): Promise<void> {
    const deploymentInfo = getDeploymentInfo();
    const isCanary = deploymentInfo.isCanary;

    // Skip health check endpoints
    const path = c.req.path;
    if (path === '/health' || path === '/ready' || path === '/metrics') {
        await next();
        return;
    }

    // Add version headers
    const headers = getVersionHeaders();
    for (const [key, value] of Object.entries(headers)) {
        c.header(key, value);
    }

    // Track request success/failure
    try {
        await next();

        // Record success if status < 500
        const success = c.res.status < 500;
        recordCanaryResult(isCanary, success);
    } catch (error) {
        // Record failure
        recordCanaryResult(isCanary, false);
        throw error;
    }
}
