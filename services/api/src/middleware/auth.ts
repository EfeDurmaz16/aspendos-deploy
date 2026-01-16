/**
 * Clerk Authentication Middleware for Hono
 * Verifies JWT tokens and attaches user info to context.
 */
import { Context, Next } from 'hono';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Initialize Clerk client
const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY || '',
});

export interface ClerkUser {
    userId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
}

declare module 'hono' {
    interface ContextVariableMap {
        user: ClerkUser | null;
        userId: string | null;
    }
}

/**
 * Middleware to verify Clerk JWT and attach user to context.
 * Does not block requests - sets user to null if not authenticated.
 */
export async function clerkAuth(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        c.set('user', null);
        c.set('userId', null);
        return next();
    }

    const token = authHeader.replace('Bearer ', '');

    try {
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY || '',
        });

        // Get full user details from Clerk
        const user = await clerkClient.users.getUser(payload.sub);

        c.set('user', {
            userId: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            imageUrl: user.imageUrl || undefined,
        });
        c.set('userId', user.id);

    } catch (error) {
        console.error('Clerk auth error:', error);
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
    await clerkAuth(c, async () => { });

    if (!c.get('userId')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    return next();
}
