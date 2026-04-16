/**
 * CSRF Protection Middleware
 *
 * Validates Origin/Referer headers on state-changing requests (POST/PATCH/DELETE)
 * to prevent Cross-Site Request Forgery attacks.
 */

import type { Context, Next } from 'hono';

/**
 * Build set of allowed origins from environment
 */
function getAllowedOrigins(): Set<string> {
    const extraOrigins = (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter((o) => {
            if (!o) return false;
            try {
                const url = new URL(o);
                return ['http:', 'https:'].includes(url.protocol);
            } catch {
                return false;
            }
        });

    return new Set([
        'http://localhost:3000',
        'https://yula.dev',
        'https://www.yula.dev',
        ...extraOrigins,
    ]);
}

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * CSRF protection middleware.
 *
 * Validates Origin/Referer headers on state-changing requests.
 * Allows GET/HEAD/OPTIONS without checking.
 * Skips checking for webhooks and auth endpoints (they use their own verification).
 */
export async function csrfProtection(c: Context, next: Next) {
    const method = c.req.method;

    // Only check state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        return next();
    }

    // Skip CSRF check for webhook endpoints (they use signature verification)
    const path = c.req.path;
    if (path.startsWith('/api/auth/') || path.includes('/webhook') || path === '/health') {
        return next();
    }

    // Skip for CRON endpoints (they use secret header)
    if (path.startsWith('/api/scheduler')) {
        return next();
    }

    const origin = c.req.header('origin');
    const referer = c.req.header('referer');

    // Require Origin or Referer on authenticated state-changing requests
    // (prevents CSRF by rejecting requests with no origin info)
    if (!origin && !referer) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    // Validate Origin if present
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    // Validate Referer if Origin not present
    if (!origin && referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (!ALLOWED_ORIGINS.has(refererOrigin)) {
                return c.json({ error: 'Forbidden' }, 403);
            }
        } catch {
            return c.json({ error: 'Forbidden' }, 403);
        }
    }

    return next();
}
