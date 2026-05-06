/**
 * Audit Trail Middleware
 *
 * Automatically logs all state-changing requests (POST, PUT, PATCH, DELETE)
 * to provide a complete audit trail of mutations.
 *
 * Captures: userId, action, resource, requestId, timestamp, ip, userAgent
 * Fire-and-forget: doesn't block response
 */

import type { Context, Next } from 'hono';
import { auditStore } from '../lib/audit-store';

// HTTP methods that should be audited (state-changing operations)
const AUDITABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Paths to skip (health checks, metrics, docs)
const SKIP_PATHS = [
    '/health',
    '/ready',
    '/metrics',
    '/status',
    '/api/docs',
    '/api/traces',
    '/.well-known',
];

/**
 * Extract resource name from path
 * Examples:
 *   /api/chat/123 -> chat
 *   /api/memory/search -> memory
 *   /api/billing/checkout -> billing
 */
function extractResource(path: string): string {
    const parts = path.split('/').filter(Boolean);
    // Get first segment after 'api' or first segment if no 'api'
    const apiIndex = parts.indexOf('api');
    if (apiIndex !== -1 && parts.length > apiIndex + 1) {
        return parts[apiIndex + 1];
    }
    return parts[0] || 'unknown';
}

/**
 * Check if path should be audited
 */
function shouldAudit(method: string, path: string): boolean {
    // Only audit state-changing methods
    if (!AUDITABLE_METHODS.has(method)) {
        return false;
    }

    // Skip health/metrics/docs endpoints
    for (const skipPath of SKIP_PATHS) {
        if (path.startsWith(skipPath)) {
            return false;
        }
    }

    return true;
}

/**
 * Audit trail middleware
 */
export function auditTrail() {
    return async (c: Context, next: Next) => {
        const method = c.req.method;
        const path = c.req.path;

        // Skip if not auditable
        if (!shouldAudit(method, path)) {
            return next();
        }

        const startTime = Date.now();

        // Extract request metadata
        const userId = c.get('userId') as string | null;
        const requestId = c.get('requestId') as string | undefined;
        const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip');
        const userAgent = c.req.header('user-agent');
        const resource = extractResource(path);
        const action = `${method} ${path}`;

        // Log BEFORE execution (request received)
        auditStore.recordAudit({
            userId,
            action: `${action}:START`,
            resource,
            method,
            path,
            ip,
            userAgent,
            requestId,
        });

        // Execute request
        await next();

        // Log AFTER execution (response sent) - fire and forget
        const duration = Date.now() - startTime;
        const statusCode = c.res.status;

        // Use setImmediate or queueMicrotask to not block response
        queueMicrotask(() => {
            auditStore.recordAudit({
                userId,
                action: `${action}:END`,
                resource,
                method,
                path,
                statusCode,
                duration,
                ip,
                userAgent,
                requestId,
            });
        });
    };
}
