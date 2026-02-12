/**
 * Notification Routes Tests
 *
 * Tests for push subscription management, notification preferences, and SSE stream.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the auth middleware
vi.mock('../../middleware/auth', () => ({
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('userId', 'test-user-1');
        c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
        return next();
    }),
    requireAuth: vi.fn((c: any, next: any) => {
        c.set('userId', 'test-user-1');
        c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
        return next();
    }),
}));

import { requireAuth } from '../../middleware/auth';
const mockRequireAuth = requireAuth as any;

vi.mock('@aspendos/db', () => ({
    prisma: {
        pushSubscription: {
            deleteMany: vi.fn(),
        },
        notificationLog: {
            findMany: vi.fn(),
            update: vi.fn(),
        },
    },
}));

import { prisma } from '@aspendos/db';
const mockPrisma = prisma as any;

vi.mock('../../services/notification.service', () => ({
    registerPushSubscription: vi.fn(),
    getUserNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
}));

import {
    getUserNotificationPreferences,
    registerPushSubscription,
    updateNotificationPreferences,
} from '../../services/notification.service';
const mockRegisterPush = registerPushSubscription as any;
const mockGetPrefs = getUserNotificationPreferences as any;
const mockUpdatePrefs = updateNotificationPreferences as any;

const TEST_USER_ID = 'test-user-1';

async function createTestApp() {
    const app = new Hono();
    // Dynamic import to get fresh route binding with current mock state
    const { default: notificationRoutes } = await import('../notifications');
    app.route('/notifications', notificationRoutes);
    return app;
}

describe('Notification Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset auth middleware to default authenticated state
        mockRequireAuth.mockImplementation((c: any, next: any) => {
            c.set('userId', 'test-user-1');
            c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
            return next();
        });
    });

    describe('POST /notifications/subscribe - Register push subscription', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockRequireAuth.mockImplementationOnce((c: any) => {
                return c.json({ error: 'Unauthorized' }, 401);
            });
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                    keys: { p256dh: 'key1', auth: 'key2' },
                }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 400 when endpoint is missing', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keys: { p256dh: 'key1', auth: 'key2' },
                }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('endpoint is required');
        });

        it('should return 400 when endpoint is not HTTPS', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'http://push.example.com/send/abc',
                    keys: { p256dh: 'key1', auth: 'key2' },
                }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('endpoint must be HTTPS');
        });

        it('should return 400 when endpoint is not a valid URL', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'not-a-url',
                    keys: { p256dh: 'key1', auth: 'key2' },
                }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('endpoint must be a valid URL');
        });

        it('should return 400 when keys are missing', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('keys.p256dh');
        });

        it('should return 400 when keys.auth is missing', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                    keys: { p256dh: 'key1' },
                }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('keys');
        });

        it('should register push subscription successfully and return 201', async () => {
            mockRegisterPush.mockResolvedValue(undefined);
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                    keys: { p256dh: 'key1', auth: 'key2' },
                    deviceType: 'web',
                }),
            });

            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockRegisterPush).toHaveBeenCalledWith(TEST_USER_ID, {
                endpoint: 'https://push.example.com/send/abc',
                keys: { p256dh: 'key1', auth: 'key2' },
                deviceType: 'web',
            });
        });

        it('should default deviceType to web for unknown values', async () => {
            mockRegisterPush.mockResolvedValue(undefined);
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                    keys: { p256dh: 'key1', auth: 'key2' },
                    deviceType: 'unknown-device',
                }),
            });

            expect(res.status).toBe(201);
            expect(mockRegisterPush).toHaveBeenCalledWith(TEST_USER_ID, {
                endpoint: 'https://push.example.com/send/abc',
                keys: { p256dh: 'key1', auth: 'key2' },
                deviceType: 'web',
            });
        });

        it('should return 500 when registration service fails', async () => {
            mockRegisterPush.mockRejectedValue(new Error('DB error'));
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: 'https://push.example.com/send/abc',
                    keys: { p256dh: 'key1', auth: 'key2' },
                }),
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to register push subscription');
        });
    });

    describe('DELETE /notifications/subscribe - Unsubscribe from push', () => {
        it('should unsubscribe successfully', async () => {
            mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: 'https://push.example.com/send/abc' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockPrisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
                where: {
                    userId: TEST_USER_ID,
                    endpoint: 'https://push.example.com/send/abc',
                },
            });
        });

        it('should return 500 when unsubscribe fails', async () => {
            mockPrisma.pushSubscription.deleteMany.mockRejectedValue(new Error('DB error'));
            const app = await createTestApp();

            const res = await app.request('/notifications/subscribe', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: 'https://push.example.com/send/abc' }),
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to unsubscribe');
        });
    });

    describe('GET /notifications/preferences - Get preferences', () => {
        it('should return user notification preferences', async () => {
            const mockPrefs = {
                pushEnabled: true,
                emailEnabled: false,
                inAppEnabled: true,
                quietHoursEnabled: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
            };
            mockGetPrefs.mockResolvedValue(mockPrefs);
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.pushEnabled).toBe(true);
            expect(body.quietHoursEnabled).toBe(true);
        });

        it('should return 500 when preferences fetch fails', async () => {
            mockGetPrefs.mockRejectedValue(new Error('DB error'));
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences');

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to get preferences');
        });
    });

    describe('PATCH /notifications/preferences - Update preferences', () => {
        it('should return 400 when no valid fields are provided', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invalidField: 'value' }),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('No valid preference fields');
        });

        it('should update boolean preference fields', async () => {
            mockUpdatePrefs.mockResolvedValue(undefined);
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pushEnabled: false,
                    emailEnabled: true,
                }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockUpdatePrefs).toHaveBeenCalledWith(TEST_USER_ID, {
                pushEnabled: false,
                emailEnabled: true,
            });
        });

        it('should update time fields in HH:MM format', async () => {
            mockUpdatePrefs.mockResolvedValue(undefined);
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quietHoursStart: '23:00',
                    quietHoursEnd: '07:30',
                }),
            });

            expect(res.status).toBe(200);
            expect(mockUpdatePrefs).toHaveBeenCalledWith(TEST_USER_ID, {
                quietHoursStart: '23:00',
                quietHoursEnd: '07:30',
            });
        });

        it('should reject invalid time format', async () => {
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    quietHoursStart: 'ten pm',
                }),
            });

            expect(res.status).toBe(400);
        });

        it('should sanitize input and only pass whitelisted fields', async () => {
            mockUpdatePrefs.mockResolvedValue(undefined);
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pushEnabled: true,
                    hackerField: 'malicious',
                    __proto__: { isAdmin: true },
                }),
            });

            expect(res.status).toBe(200);
            // Only pushEnabled should be passed through
            expect(mockUpdatePrefs).toHaveBeenCalledWith(TEST_USER_ID, {
                pushEnabled: true,
            });
        });

        it('should return 500 when update fails', async () => {
            mockUpdatePrefs.mockRejectedValue(new Error('DB error'));
            const app = await createTestApp();

            const res = await app.request('/notifications/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pushEnabled: false }),
            });

            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toBe('Failed to update preferences');
        });
    });

    describe('GET /notifications/stream - SSE stream', () => {
        it('should return SSE headers', async () => {
            mockPrisma.notificationLog.findMany.mockResolvedValue([]);
            const app = await createTestApp();

            const controller = new AbortController();
            const res = await app.request('/notifications/stream', {
                signal: controller.signal,
            });

            expect(res.headers.get('Content-Type')).toBe('text/event-stream');
            expect(res.headers.get('Cache-Control')).toBe('no-cache');

            // Abort to clean up the stream
            controller.abort();
        });

        it('should return 401 for unauthenticated SSE stream request', async () => {
            mockRequireAuth.mockImplementationOnce((c: any) => {
                return c.json({ error: 'Unauthorized' }, 401);
            });
            const app = await createTestApp();

            const res = await app.request('/notifications/stream');

            expect(res.status).toBe(401);
        });
    });
});
