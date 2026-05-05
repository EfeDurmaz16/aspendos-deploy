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
        session: { id: string; expiresAt?: Date | string } | null;
    }
}

export async function authMiddleware(c: Context, next: Next) {
    const existingUserId = c.get('userId' as any);
    if (existingUserId) return next();

    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        if (token && token !== 'null') {
            c.set('user', { userId: token, email: '' });
            c.set('userId', token);
            return next();
        }
    }

    c.set('user', null);
    c.set('userId', null);
    return next();
}

export async function requireAuth(c: Context, next: Next) {
    const userId = c.get('userId');
    if (userId) {
        return next();
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user?.id) {
        return c.json({ error: 'Authentication required' }, 401);
    }

    c.set('user', {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name ?? undefined,
        image: session.user.image ?? undefined,
    });
    c.set('userId', session.user.id);
    c.set('session', session.session);
    return next();
}

export function optionalAuth(c: Context, next: Next) {
    return authMiddleware(c, next);
}

export async function requireAdmin(c: Context, next: Next) {
    const userId = c.get('userId');
    if (!userId) {
        return c.json({ error: 'Authentication required' }, 401);
    }
    return next();
}
