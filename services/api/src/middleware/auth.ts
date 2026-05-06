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
        session: { id: string; expiresAt?: Date | string } | null;
    }
}

async function isUserBanned(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { banned: true },
    });
    return user?.banned === true;
}

export function allowsUnverifiedBearerAuth(): boolean {
    return process.env.NODE_ENV !== 'production';
}

export function getUnverifiedBearerUserId(authHeader: string | undefined): string | null {
    if (!allowsUnverifiedBearerAuth()) return null;
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7).trim();
    if (!token || token === 'null' || token === 'undefined') return null;
    return token;
}

export async function authMiddleware(c: Context, next: Next) {
    const existingUserId = c.get('userId' as any);
    if (existingUserId) return next();

    const bearerUserId = getUnverifiedBearerUserId(c.req.header('Authorization'));
    if (bearerUserId) {
        c.set('user', { userId: bearerUserId, email: '' });
        c.set('userId', bearerUserId);
        return next();
    }

    c.set('user', null);
    c.set('userId', null);
    return next();
}

export async function requireAuth(c: Context, next: Next) {
    const userId = c.get('userId');
    if (userId) {
        if (await isUserBanned(userId)) {
            return c.json({ error: 'Account suspended', code: 'ACCOUNT_BANNED' }, 403);
        }
        return next();
    }

    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user?.id) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    if (await isUserBanned(session.user.id)) {
        return c.json({ error: 'Account suspended', code: 'ACCOUNT_BANNED' }, 403);
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
