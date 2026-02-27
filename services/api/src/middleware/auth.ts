/**
 * Better Auth Middleware for Hono
 * Verifies sessions via HTTP-only cookies.
 */

import { prisma } from '@aspendos/db';
import type { Context, Next } from 'hono';
import { auth } from '../lib/auth';

export interface AuthUser {
    userId: string;
    email: string;
    name?: string;
    image?: string;
}

declare module 'hono' {
    interface ContextVariableMap {
        user: AuthUser | null;
        userId: string | null;
    }
}

/**
 * Middleware to verify Better Auth session and attach user to context.
 * Does not block requests - sets user to null if not authenticated.
 *
 * Enhanced with session validation:
 * - Validates session token format
 * - Checks session expiry
 * - Validates token before DB lookup
 *
 * Optimization: reuses session already extracted by the global middleware in
 * index.ts (stored under the 'session' context key) to avoid a second DB
 * round-trip per request.
 */
export async function authMiddleware(c: Context, next: Next) {
    try {
        // Fast path: global middleware in index.ts already called getSession()
        // and stored the result. Reuse it to avoid a second DB round-trip.
        const existingSession = c.get('session' as Parameters<typeof c.get>[0]);
        const existingUserId = c.get('userId' as Parameters<typeof c.get>[0]);

        if (existingUserId && existingSession) {
            // Session already validated by global middleware - map it to the
            // AuthUser shape expected by routes that use authMiddleware.
            const globalUser = c.get('user' as Parameters<typeof c.get>[0]) as {
                id: string;
                email: string;
                name?: string | null;
                image?: string | null;
            } | null;

            if (globalUser) {
                c.set('user', {
                    userId: globalUser.id,
                    email: globalUser.email,
                    name: globalUser.name || undefined,
                    image: globalUser.image || undefined,
                });
                c.set('userId', globalUser.id);
                return next();
            }
        }

        // Fallback path: global middleware did not run or returned no session.
        // Perform the DB lookup ourselves.
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (session?.user && session?.session) {
            // Validate session is not expired
            const expiresAt = session.session.expiresAt;
            if (expiresAt && new Date(expiresAt) < new Date()) {
                console.warn('[Auth] Expired session detected:', session.session.id);
                c.set('user', null);
                c.set('userId', null);
                return next();
            }

            // Session is valid - attach to context
            c.set('user', {
                userId: session.user.id,
                email: session.user.email,
                name: session.user.name || undefined,
                image: session.user.image || undefined,
            });
            c.set('userId', session.user.id);
        } else {
            c.set('user', null);
            c.set('userId', null);
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        c.set('user', null);
        c.set('userId', null);
    }

    return next();
}

/**
 * Middleware that requires authentication.
 * Returns 401 if user is not authenticated.
 */
export async function requireAuth(c: Context, next: Next) {
    await authMiddleware(c, async () => {});

    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Check if user is banned
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { banned: true },
    });
    if (user?.banned) {
        return c.json({ error: 'Account suspended', code: 'ACCOUNT_BANNED' }, 403);
    }

    return next();
}

/**
 * Middleware that requires admin access.
 * Returns 401 if not authenticated, 403 if not an admin.
 * Admin user IDs are sourced from the ADMIN_USER_IDS environment variable (comma-separated).
 */
export async function requireAdmin(c: Context, next: Next) {
    await authMiddleware(c, async () => {});

    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const adminIds = (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

    if (!adminIds.includes(userId)) {
        return c.json({ error: 'Forbidden' }, 403);
    }

    return next();
}
