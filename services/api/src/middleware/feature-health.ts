/**
 * Feature Health Middleware
 *
 * Adds degraded feature information to HTTP responses so clients
 * can adapt their UI when backend features are in a degraded state.
 *
 * - Sets `X-Degraded-Features` header with comma-separated feature names
 * - Injects `degraded_features` into JSON response bodies
 * - Skips health/status/metrics paths to avoid noise
 */

import type { Context, Next } from 'hono';
import { getDegradedFeatures } from '../lib/feature-degradation';

const SKIP_PATHS = new Set(['/health', '/status', '/metrics', '/ready']);

export function featureHealthMiddleware() {
    return async (c: Context, next: Next) => {
        const path = c.req.path;

        if (SKIP_PATHS.has(path)) {
            await next();
            return;
        }

        await next();

        const degraded = getDegradedFeatures();
        if (degraded.length === 0) return;

        c.res.headers.set('X-Degraded-Features', degraded.join(','));

        // Inject into JSON responses
        const contentType = c.res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                const body = await c.res.json();
                const enriched = { ...body, degraded_features: degraded };
                c.res = new Response(JSON.stringify(enriched), {
                    status: c.res.status,
                    headers: c.res.headers,
                });
            } catch {
                // Non-parseable body, skip injection
            }
        }
    };
}

export default featureHealthMiddleware;
