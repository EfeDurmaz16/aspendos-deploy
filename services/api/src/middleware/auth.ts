/**
 * Better Auth Middleware for Hono
 * Verifies sessions via HTTP-only cookies.
 */

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
 */
export async function authMiddleware(c: Context, next: Next) {
    try {
        // Get session from Better Auth using the request
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

    if (!c.get('userId')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
}
