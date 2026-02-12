/**
 * Session Management Routes
 *
 * Endpoints for listing, revoking, and managing user sessions.
 * All endpoints require authentication.
 */

import { Hono } from 'hono';
import { prisma } from '../lib/prisma';
import { auditLog } from '../lib/audit-log';
import { requireAuth } from '../middleware/auth';

const sessionRoutes = new Hono();

// All session routes require authentication
sessionRoutes.use('/*', requireAuth);

/**
 * GET /sessions
 *
 * List all active sessions for the current user.
 * The current session is marked with `isCurrent: true`.
 */
sessionRoutes.get('/', async (c) => {
    const userId = c.get('userId')!;
    const session = c.get('session') as { id: string } | null;
    const currentSessionId = session?.id ?? null;

    try {
        const sessions = await prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
            select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
            },
            orderBy: { updatedAt: 'desc' },
        });

        const result = sessions.map((s) => ({
            id: s.id,
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            createdAt: s.createdAt,
            lastActive: s.updatedAt,
            expiresAt: s.expiresAt,
            isCurrent: s.id === currentSessionId,
        }));

        return c.json({ sessions: result });
    } catch (error) {
        console.error('[Sessions] Failed to list sessions:', error);
        return c.json({ error: 'Failed to list sessions' }, 500);
    }
});

/**
 * DELETE /sessions/:id
 *
 * Revoke a specific session by ID.
 * The session must belong to the current user.
 * Cannot revoke the current session (use POST /sessions/logout instead).
 */
sessionRoutes.delete('/:id', async (c) => {
    const userId = c.get('userId')!;
    const session = c.get('session') as { id: string } | null;
    const currentSessionId = session?.id ?? null;
    const targetSessionId = c.req.param('id');

    if (targetSessionId === currentSessionId) {
        return c.json(
            { error: 'Cannot revoke the current session. Use POST /sessions/logout instead.' },
            400
        );
    }

    try {
        // Verify the session belongs to the current user
        const targetSession = await prisma.session.findUnique({
            where: { id: targetSessionId },
            select: { id: true, userId: true, userAgent: true, ipAddress: true },
        });

        if (!targetSession || targetSession.userId !== userId) {
            return c.json({ error: 'Session not found' }, 404);
        }

        await prisma.session.delete({
            where: { id: targetSessionId },
        });

        await auditLog({
            userId,
            action: 'SESSION_REVOKE',
            resource: 'session',
            resourceId: targetSessionId,
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
            metadata: {
                revokedSessionAgent: targetSession.userAgent,
                revokedSessionIp: targetSession.ipAddress,
            },
        });

        return c.json({ success: true, message: 'Session revoked' });
    } catch (error) {
        console.error('[Sessions] Failed to revoke session:', error);
        return c.json({ error: 'Failed to revoke session' }, 500);
    }
});

/**
 * DELETE /sessions
 *
 * Revoke ALL sessions except the current one (sign out all other devices).
 */
sessionRoutes.delete('/', async (c) => {
    const userId = c.get('userId')!;
    const session = c.get('session') as { id: string } | null;
    const currentSessionId = session?.id ?? null;

    try {
        const result = await prisma.session.deleteMany({
            where: {
                userId,
                id: { not: currentSessionId ?? undefined },
            },
        });

        await auditLog({
            userId,
            action: 'SESSION_REVOKE_ALL',
            resource: 'session',
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
            metadata: {
                revokedCount: result.count,
                keptSessionId: currentSessionId,
            },
        });

        return c.json({
            success: true,
            message: `Revoked ${result.count} session(s)`,
            revokedCount: result.count,
        });
    } catch (error) {
        console.error('[Sessions] Failed to revoke all sessions:', error);
        return c.json({ error: 'Failed to revoke sessions' }, 500);
    }
});

/**
 * POST /sessions/logout
 *
 * Logout the current session. Invalidates the session in the database.
 */
sessionRoutes.post('/logout', async (c) => {
    const userId = c.get('userId')!;
    const session = c.get('session') as { id: string } | null;
    const currentSessionId = session?.id ?? null;

    if (!currentSessionId) {
        return c.json({ error: 'No active session' }, 400);
    }

    try {
        await prisma.session.delete({
            where: { id: currentSessionId },
        });

        await auditLog({
            userId,
            action: 'SESSION_LOGOUT',
            resource: 'session',
            resourceId: currentSessionId,
            ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined,
        });

        return c.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('[Sessions] Failed to logout:', error);
        return c.json({ error: 'Failed to logout' }, 500);
    }
});

export default sessionRoutes;
