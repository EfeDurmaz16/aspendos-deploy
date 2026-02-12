/**
 * Cache Control Middleware
 * Sets Cache-Control headers, ETag support, and Vary headers based on endpoint patterns
 */
import type { Context, Next } from 'hono';
import { createHash } from 'node:crypto';

interface CacheRule {
    pattern: RegExp | string;
    cacheControl: string;
    varyHeaders?: string[];
}

// Cache rules by endpoint pattern
const CACHE_RULES: CacheRule[] = [
    // Public, cacheable endpoints (1 hour)
    {
        pattern: /^\/api\/features/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding', 'Authorization'],
    },
    {
        pattern: /^\/api\/errors/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding'],
    },
    {
        pattern: /^\/api\/changelog/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding'],
    },
    {
        pattern: /^\/api\/webhooks\/events/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding'],
    },

    // Legal documents (24 hours)
    {
        pattern: /^\/api\/legal\//,
        cacheControl: 'public, max-age=86400',
        varyHeaders: ['Accept-Encoding'],
    },

    // Health checks (no cache)
    {
        pattern: /^\/(health|ready|status)/,
        cacheControl: 'no-cache, no-store, must-revalidate',
        varyHeaders: [],
    },

    // Chat endpoints (private, no cache)
    {
        pattern: /^\/api\/chat/,
        cacheControl: 'private, no-cache, no-store, must-revalidate',
        varyHeaders: ['Authorization'],
    },

    // Memory endpoints (private, 1 minute)
    {
        pattern: /^\/api\/memory/,
        cacheControl: 'private, max-age=60',
        varyHeaders: ['Authorization', 'Accept-Encoding'],
    },

    // Models endpoint (public, 1 hour)
    {
        pattern: /^\/api\/models/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding'],
    },

    // API docs (public, 1 hour)
    {
        pattern: /^\/api\/docs/,
        cacheControl: 'public, max-age=3600',
        varyHeaders: ['Accept-Encoding'],
    },
];

/**
 * Generate ETag from response body
 */
function generateETag(body: string | ArrayBuffer): string {
    const hash = createHash('sha256');

    if (typeof body === 'string') {
        hash.update(body);
    } else {
        hash.update(Buffer.from(body));
    }

    return `"${hash.digest('hex').substring(0, 16)}"`;
}

/**
 * Find matching cache rule for a path
 */
function findCacheRule(path: string): CacheRule | null {
    for (const rule of CACHE_RULES) {
        if (typeof rule.pattern === 'string') {
            if (path.startsWith(rule.pattern)) {
                return rule;
            }
        } else if (rule.pattern.test(path)) {
            return rule;
        }
    }
    return null;
}

/**
 * Cache middleware - sets Cache-Control, ETag, and Vary headers
 */
export function cacheControl() {
    return async (c: Context, next: Next) => {
        const path = c.req.path;
        const method = c.req.method;

        // Only apply caching to GET and HEAD requests
        if (method !== 'GET' && method !== 'HEAD') {
            // For state-changing methods, ensure no caching
            c.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            c.header('Pragma', 'no-cache');
            c.header('Expires', '0');
            return next();
        }

        // Find matching cache rule
        const rule = findCacheRule(path);

        // Check If-None-Match for ETag validation (before calling next)
        const ifNoneMatch = c.req.header('if-none-match');

        if (rule) {
            // Set Cache-Control header
            c.header('Cache-Control', rule.cacheControl);

            // Set Vary headers
            if (rule.varyHeaders && rule.varyHeaders.length > 0) {
                c.header('Vary', rule.varyHeaders.join(', '));
            }
        } else {
            // Default: no explicit cache rule, use conservative caching
            c.header('Cache-Control', 'private, no-cache');
            c.header('Vary', 'Accept-Encoding, Authorization');
        }

        await next();

        // Generate and set ETag for cacheable responses (only for successful responses)
        if (rule && c.res.status === 200 && rule.cacheControl.includes('max-age')) {
            try {
                // Clone response to read body without consuming it
                const responseClone = c.res.clone();
                const body = await responseClone.text();

                if (body && body.length > 0) {
                    const etag = generateETag(body);

                    // If ETag matches, return 304 Not Modified
                    if (ifNoneMatch === etag) {
                        // Collect existing headers
                        const headers = new Headers(c.res.headers);
                        headers.set('ETag', etag);

                        // Replace response with 304
                        c.res = new Response(null, {
                            status: 304,
                            headers: headers,
                        });
                        return;
                    }

                    c.header('ETag', etag);
                }
            } catch (error) {
                // If we can't read the body (e.g., streaming response), skip ETag
                // This is fine - ETag is optional
            }
        }
    };
}

export default cacheControl;
