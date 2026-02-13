/**
 * Payload Size Limiting Middleware
 *
 * Enforces per-endpoint and global payload size limits.
 * Returns 413 Payload Too Large for oversized requests.
 */

import type { Context, Next } from 'hono';

// ============================================
// SIZE CONSTANTS
// ============================================

const KB = 1024;
const MB = 1024 * KB;

const GLOBAL_MAX_PAYLOAD = 50 * MB;

// ============================================
// PER-ENDPOINT LIMIT CONFIG
// ============================================

interface EndpointLimit {
    pattern: string;
    method: string;
    maxBytes: number;
    label: string;
}

const ENDPOINT_LIMITS: EndpointLimit[] = [
    { pattern: '/api/chat', method: 'POST', maxBytes: 64 * KB, label: '64kb' },
    { pattern: '/api/import', method: 'POST', maxBytes: 100 * MB, label: '100mb' },
    { pattern: '/api/council', method: 'POST', maxBytes: 32 * KB, label: '32kb' },
];

const DEFAULT_BODY_LIMIT = 1 * MB;
const DEFAULT_BODY_LABEL = '1mb';

const SKIP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SKIP_PATHS = new Set(['/health', '/status', '/ready', '/metrics']);

// ============================================
// MATCHING HELPERS
// ============================================

function findEndpointLimit(method: string, path: string): EndpointLimit | null {
    for (const limit of ENDPOINT_LIMITS) {
        if (limit.method !== method) continue;
        if (path === limit.pattern || path.startsWith(`${limit.pattern}/`)) {
            return limit;
        }
    }
    return null;
}

function formatLabel(bytes: number): string {
    if (bytes >= MB) return `${bytes / MB}mb`;
    if (bytes >= KB) return `${bytes / KB}kb`;
    return `${bytes}b`;
}

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Payload size limiting middleware.
 * Checks Content-Length header first for a fast rejection,
 * then verifies the actual body size as a safeguard.
 */
export function payloadLimits() {
    return async (c: Context, next: Next) => {
        const method = c.req.method.toUpperCase();

        // Skip methods without a body
        if (SKIP_METHODS.has(method)) {
            return next();
        }

        // Skip health/status/ready/metrics paths
        const path = c.req.path;
        if (SKIP_PATHS.has(path)) {
            return next();
        }

        // Determine the limit for this endpoint
        const endpointLimit = findEndpointLimit(method, path);
        const maxBytes = endpointLimit?.maxBytes ?? DEFAULT_BODY_LIMIT;
        const label = endpointLimit?.label ?? DEFAULT_BODY_LABEL;

        // Enforce global ceiling
        const effectiveMax = Math.min(maxBytes, GLOBAL_MAX_PAYLOAD);

        // Quick check via Content-Length header
        const contentLength = c.req.header('content-length');
        if (contentLength) {
            const declared = Number.parseInt(contentLength, 10);
            if (!Number.isNaN(declared) && declared > effectiveMax) {
                return c.json(
                    {
                        error: 'Payload too large',
                        maxSize: label,
                        endpoint: path,
                    },
                    413
                );
            }
        }

        // Verify actual body size for requests that may omit Content-Length
        try {
            const body = await c.req.arrayBuffer();
            if (body.byteLength > effectiveMax) {
                return c.json(
                    {
                        error: 'Payload too large',
                        maxSize: label,
                        endpoint: path,
                    },
                    413
                );
            }
        } catch {
            // No body or unreadable body - allow through
        }

        return next();
    };
}

/**
 * Clear limits state (for testing).
 * Currently stateless, but exported for API consistency.
 */
export function clearLimits_forTesting(): void {
    // No runtime state to clear; provided for test teardown compatibility
}
