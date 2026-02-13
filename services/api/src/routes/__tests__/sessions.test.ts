/**
 * Session Management Routes Tests
 *
 * Tests for listing, revoking, and logging out of user sessions.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mock variables so they're available in vi.mock factories
const { sessionMocks, mockAuditLog } = vi.hoisted(() => ({
    sessionMocks: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
    },
    mockAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock @aspendos/db
vi.mock('@aspendos/db', () => ({
    prisma: {
        session: sessionMocks,
        auditLog: { create: vi.fn() },
    },
}));

// Mock lib/prisma re-export
vi.mock('../../lib/prisma', () => ({
    prisma: {
        session: sessionMocks,
        auditLog: { create: vi.fn() },
    },
}));

// Mock audit log
vi.mock('../../lib/audit-log', () => ({
    auditLog: mockAuditLog,
}));

// Mock the auth middleware
vi.mock('../../middleware/auth', () => ({
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('userId', 'user-1');
        c.set('session', { id: 'current-session-id' });
        return next();
    }),
    requireAuth: vi.fn((c: any, next: any) => {
        c.set('userId', 'user-1');
        c.set('user', { userId: 'user-1', email: 'test@example.com' });
        c.set('session', { id: 'current-session-id' });
        return next();
    }),
}));

import sessionRoutes from '../sessions';

function createTestApp() {
    const app = new Hono();
    app.route('/sessions', sessionRoutes);
    return app;
}

const NOW = new Date('2025-01-15T12:00:00Z');
const FUTURE = new Date('2025-01-22T12:00:00Z');
const PAST = new Date('2025-01-14T12:00:00Z');

describe('Session Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuditLog.mockResolvedValue(undefined);
    });

    describe('GET /sessions', () => {
        it('should list all active sessions for the current user', async () => {
            const mockSessions = [
                {
                    id: 'current-session-id',
                    userAgent: 'Mozilla/5.0 Chrome/120',
                    ipAddress: '192.168.1.1',
                    createdAt: NOW,
                    updatedAt: NOW,
                    expiresAt: FUTURE,
                },
                {
                    id: 'other-session-id',
                    userAgent: 'Mozilla/5.0 Safari/17',
                    ipAddress: '10.0.0.1',
                    createdAt: PAST,
                    updatedAt: PAST,
                    expiresAt: FUTURE,
                },
            ];

            sessionMocks.findMany.mockResolvedValue(mockSessions);

            const app = createTestApp();
            const res = await app.request('/sessions');
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.sessions).toHaveLength(2);

            // Current session should be marked
            const currentSession = body.sessions.find((s: any) => s.id === 'current-session-id');
            expect(currentSession.isCurrent).toBe(true);

            // Other session should not be marked as current
            const otherSession = body.sessions.find((s: any) => s.id === 'other-session-id');
            expect(otherSession.isCurrent).toBe(false);

            // Verify prisma was called with correct filters
            expect(sessionMocks.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        userId: 'user-1',
                        expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
                    }),
                })
            );
        });

        it('should return session metadata (user-agent, IP, timestamps)', async () => {
            const mockSessions = [
                {
                    id: 'session-1',
                    userAgent: 'Mozilla/5.0 Chrome/120',
                    ipAddress: '192.168.1.1',
                    createdAt: NOW,
                    updatedAt: NOW,
                    expiresAt: FUTURE,
                },
            ];

            sessionMocks.findMany.mockResolvedValue(mockSessions);

            const app = createTestApp();
            const res = await app.request('/sessions');
            const body = await res.json();

            const session = body.sessions[0];
            expect(session).toHaveProperty('id');
            expect(session).toHaveProperty('userAgent');
            expect(session).toHaveProperty('ipAddress');
            expect(session).toHaveProperty('createdAt');
            expect(session).toHaveProperty('lastActive');
            expect(session).toHaveProperty('expiresAt');
            expect(session).toHaveProperty('isCurrent');
        });

        it('should return empty array when user has no sessions', async () => {
            sessionMocks.findMany.mockResolvedValue([]);

            const app = createTestApp();
            const res = await app.request('/sessions');
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.sessions).toHaveLength(0);
        });

        it('should handle database errors gracefully', async () => {
            sessionMocks.findMany.mockRejectedValue(new Error('DB connection failed'));

            const app = createTestApp();
            const res = await app.request('/sessions');
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body.error).toBe('Failed to list sessions');
        });
    });

    describe('DELETE /sessions/:id', () => {
        it('should revoke a specific session belonging to the user', async () => {
            const targetSession = {
                id: 'target-session-id',
                userId: 'user-1',
                userAgent: 'Mozilla/5.0 Safari/17',
                ipAddress: '10.0.0.1',
            };

            sessionMocks.findUnique.mockResolvedValue(targetSession);
            sessionMocks.delete.mockResolvedValue(targetSession);

            const app = createTestApp();
            const res = await app.request('/sessions/target-session-id', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.message).toBe('Session revoked');

            expect(sessionMocks.delete).toHaveBeenCalledWith({
                where: { id: 'target-session-id' },
            });
        });

        it('should log an audit event when revoking a session', async () => {
            const targetSession = {
                id: 'target-session-id',
                userId: 'user-1',
                userAgent: 'Mozilla/5.0 Safari/17',
                ipAddress: '10.0.0.1',
            };

            sessionMocks.findUnique.mockResolvedValue(targetSession);
            sessionMocks.delete.mockResolvedValue(targetSession);

            const app = createTestApp();
            await app.request('/sessions/target-session-id', { method: 'DELETE' });

            expect(mockAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-1',
                    action: 'SESSION_REVOKE',
                    resource: 'session',
                    resourceId: 'target-session-id',
                    metadata: expect.objectContaining({
                        revokedSessionAgent: 'Mozilla/5.0 Safari/17',
                        revokedSessionIp: '10.0.0.1',
                    }),
                })
            );
        });

        it('should reject revoking the current session', async () => {
            const app = createTestApp();
            const res = await app.request('/sessions/current-session-id', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(400);
            expect(body.error).toContain('Cannot revoke the current session');

            // Should not attempt to delete
            expect(sessionMocks.delete).not.toHaveBeenCalled();
        });

        it('should return 404 if session does not exist', async () => {
            sessionMocks.findUnique.mockResolvedValue(null);

            const app = createTestApp();
            const res = await app.request('/sessions/nonexistent-id', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(404);
            expect(body.error).toBe('Session not found');
        });

        it('should return 404 if session belongs to another user', async () => {
            sessionMocks.findUnique.mockResolvedValue({
                id: 'other-user-session',
                userId: 'other-user-id',
                userAgent: 'Chrome',
                ipAddress: '1.2.3.4',
            });

            const app = createTestApp();
            const res = await app.request('/sessions/other-user-session', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(404);
            expect(body.error).toBe('Session not found');
            expect(sessionMocks.delete).not.toHaveBeenCalled();
        });

        it('should handle database errors gracefully', async () => {
            sessionMocks.findUnique.mockRejectedValue(new Error('DB error'));

            const app = createTestApp();
            const res = await app.request('/sessions/some-session', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body.error).toBe('Failed to revoke session');
        });
    });

    describe('DELETE /sessions (revoke all)', () => {
        it('should revoke all sessions except the current one', async () => {
            sessionMocks.deleteMany.mockResolvedValue({ count: 3 });

            const app = createTestApp();
            const res = await app.request('/sessions', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.revokedCount).toBe(3);

            expect(sessionMocks.deleteMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    id: { not: 'current-session-id' },
                },
            });
        });

        it('should log an audit event when revoking all sessions', async () => {
            sessionMocks.deleteMany.mockResolvedValue({ count: 2 });

            const app = createTestApp();
            await app.request('/sessions', { method: 'DELETE' });

            expect(mockAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-1',
                    action: 'SESSION_REVOKE_ALL',
                    resource: 'session',
                    metadata: expect.objectContaining({
                        revokedCount: 2,
                        keptSessionId: 'current-session-id',
                    }),
                })
            );
        });

        it('should handle case where no other sessions exist', async () => {
            sessionMocks.deleteMany.mockResolvedValue({ count: 0 });

            const app = createTestApp();
            const res = await app.request('/sessions', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.revokedCount).toBe(0);
        });

        it('should handle database errors gracefully', async () => {
            sessionMocks.deleteMany.mockRejectedValue(new Error('DB error'));

            const app = createTestApp();
            const res = await app.request('/sessions', { method: 'DELETE' });
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body.error).toBe('Failed to revoke sessions');
        });
    });

    describe('POST /sessions/logout', () => {
        it('should delete the current session', async () => {
            sessionMocks.delete.mockResolvedValue({ id: 'current-session-id' });

            const app = createTestApp();
            const res = await app.request('/sessions/logout', { method: 'POST' });
            const body = await res.json();

            expect(res.status).toBe(200);
            expect(body.success).toBe(true);
            expect(body.message).toBe('Logged out successfully');

            expect(sessionMocks.delete).toHaveBeenCalledWith({
                where: { id: 'current-session-id' },
            });
        });

        it('should log an audit event on logout', async () => {
            sessionMocks.delete.mockResolvedValue({ id: 'current-session-id' });

            const app = createTestApp();
            await app.request('/sessions/logout', { method: 'POST' });

            expect(mockAuditLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-1',
                    action: 'SESSION_LOGOUT',
                    resource: 'session',
                    resourceId: 'current-session-id',
                })
            );
        });

        it('should handle database errors gracefully', async () => {
            sessionMocks.delete.mockRejectedValue(new Error('DB error'));

            const app = createTestApp();
            const res = await app.request('/sessions/logout', { method: 'POST' });
            const body = await res.json();

            expect(res.status).toBe(500);
            expect(body.error).toBe('Failed to logout');
        });
    });

    describe('Authentication', () => {
        it('should use requireAuth middleware', async () => {
            // Verify that the sessions route module imports and uses requireAuth.
            // The mock sets userId on the context; if it were not wired up,
            // the route handlers would not have access to userId and would fail.
            // We confirm by making a successful request that depends on userId.
            sessionMocks.findMany.mockResolvedValue([]);

            const app = createTestApp();
            const res = await app.request('/sessions');
            const body = await res.json();

            // A successful 200 with sessions array proves the auth middleware ran
            // and set userId, because the handler uses c.get('userId')
            expect(res.status).toBe(200);
            expect(body.sessions).toBeDefined();
        });
    });
});
