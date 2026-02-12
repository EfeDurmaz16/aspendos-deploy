/**
 * Metrics Middleware
 * Automatically tracks HTTP request metrics
 */

import type { Context, Next } from 'hono';
import {
    HTTP_DURATION_BUCKETS,
    SIZE_BUCKETS,
    incrementCounter,
    observeHistogram,
} from '../lib/metrics';

/**
 * Normalize path by replacing UUIDs and numeric IDs with placeholders
 */
function normalizePath(path: string): string {
    // Replace UUIDs (8-4-4-4-12 format)
    let normalized = path.replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id'
    );

    // Replace numeric IDs
    normalized = normalized.replace(/\/\d+\b/g, '/:id');

    // Replace other common patterns
    normalized = normalized.replace(/\/[0-9a-f]{24}\b/g, '/:id'); // MongoDB ObjectId
    normalized = normalized.replace(/\/[0-9a-z]{20,}\b/g, '/:token'); // Long tokens

    return normalized;
}

/**
 * Middleware that tracks HTTP request metrics
 */
export function metricsMiddleware() {
    return async (c: Context, next: Next) => {
        const path = c.req.path;

        // Skip metrics collection for these endpoints
        if (path === '/metrics' || path === '/health' || path === '/ready') {
            await next();
            return;
        }

        const start = Date.now();
        const method = c.req.method;
        const normalizedPath = normalizePath(path);

        // Track request body size if available
        const contentLength = c.req.header('content-length');
        if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (!isNaN(size)) {
                observeHistogram(
                    'http_request_size_bytes',
                    size,
                    { method, path: normalizedPath },
                    SIZE_BUCKETS
                );
            }
        }

        try {
            await next();
        } finally {
            const duration = (Date.now() - start) / 1000; // Convert to seconds
            const status = String(c.res.status);

            // Track request count
            incrementCounter('http_requests_total', {
                method,
                path: normalizedPath,
                status,
            });

            // Track request duration
            observeHistogram(
                'http_request_duration_seconds',
                duration,
                { method, path: normalizedPath },
                HTTP_DURATION_BUCKETS
            );

            // Track response size if available
            const responseSize = c.res.headers.get('content-length');
            if (responseSize) {
                const size = parseInt(responseSize, 10);
                if (!isNaN(size)) {
                    observeHistogram(
                        'http_response_size_bytes',
                        size,
                        { method, path: normalizedPath },
                        SIZE_BUCKETS
                    );
                }
            }
        }
    };
}

export default metricsMiddleware;
