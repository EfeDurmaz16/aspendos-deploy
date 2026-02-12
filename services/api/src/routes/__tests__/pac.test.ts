/**
 * PAC Routes Tests
 *
 * Tests for Proactive AI Callback endpoints including commitment detection,
 * reminder management, and settings.
 */

import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the middleware/auth to properly intercept requireAuth
vi.mock('../../middleware/auth', () => ({
    requireAuth: vi.fn((c: any, next: any) => {
        c.set('userId', 'test-user-1');
        c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
        return next();
    }),
    authMiddleware: vi.fn((c: any, next: any) => {
        c.set('userId', 'test-user-1');
        c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
        return next();
    }),
}));

import { requireAuth } from '../../middleware/auth';
const mockRequireAuth = requireAuth as any;

vi.mock('../../services/pac.service', () => ({
    getPACSettings: vi.fn(),
    detectCommitments: vi.fn(),
    createReminder: vi.fn(),
    getPendingReminders: vi.fn(),
    completeReminder: vi.fn(),
    dismissReminder: vi.fn(),
    snoozeReminder: vi.fn(),
    updatePACSettings: vi.fn(),
    getPACStats: vi.fn(),
}));

import * as pacService from '../../services/pac.service';
const mockService = pacService as any;

vi.mock('../../lib/audit-log', () => ({
    auditLog: vi.fn(),
}));

const TEST_USER_ID = 'test-user-1';

async function createTestApp() {
    const app = new Hono();
    // Dynamic import to get fresh route binding with current mock state
    const { default: pacRoutes } = await import('../pac');
    app.route('/pac', pacRoutes);
    return app;
}

const defaultSettings = {
    enabled: true,
    explicitEnabled: true,
    implicitEnabled: true,
    pushEnabled: true,
    emailEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    escalationEnabled: true,
    digestEnabled: false,
    digestTime: '09:00',
};

describe('PAC Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Restore default mock implementation after clearAllMocks
        mockRequireAuth.mockImplementation((c: any, next: any) => {
            c.set('userId', 'test-user-1');
            c.set('user', { userId: 'test-user-1', email: 'test@yula.dev', name: 'Test User' });
            return next();
        });
        mockService.getPACSettings.mockResolvedValue(defaultSettings);
        mockService.detectCommitments.mockReturnValue([]);
    });

    describe('POST /pac/detect - Detect commitments', () => {
        it('should return 401 when user is not authenticated', async () => {
            mockRequireAuth.mockImplementationOnce(async (c: any) => {
                return c.json({ error: 'Unauthorized' }, 401);
            });
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Remind me to call mom' }),
            });

            expect(res.status).toBe(401);
        });

        it('should return 400 when message is missing', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('Validation failed');
        });

        it('should return 400 when message is empty string', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '' }),
            });

            expect(res.status).toBe(400);
        });

        it('should return empty commitments when PAC is disabled', async () => {
            mockService.getPACSettings.mockResolvedValue({ ...defaultSettings, enabled: false });
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Remind me to call mom' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.commitments).toEqual([]);
            expect(body.message).toBe('PAC is disabled');
        });

        it('should detect commitments and create reminders', async () => {
            const mockCommitments = [
                {
                    content: 'call mom',
                    type: 'EXPLICIT',
                    priority: 'MEDIUM',
                    triggerAt: new Date(),
                    confidence: 0.95,
                },
            ];
            mockService.detectCommitments.mockReturnValue(mockCommitments);
            mockService.createReminder.mockResolvedValue({
                id: 'rem-1',
                content: 'call mom',
                type: 'EXPLICIT',
                priority: 50,
                triggerAt: new Date(),
                status: 'PENDING',
            });
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Remind me to call mom' }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.commitments).toHaveLength(1);
            expect(body.reminders).toHaveLength(1);
            expect(body.reminders[0].content).toBe('call mom');
            expect(mockService.createReminder).toHaveBeenCalledTimes(1);
        });

        it('should filter implicit commitments when implicitEnabled is false', async () => {
            mockService.getPACSettings.mockResolvedValue({
                ...defaultSettings,
                implicitEnabled: false,
            });
            const mockCommitments = [
                {
                    content: 'do laundry',
                    type: 'IMPLICIT',
                    priority: 'LOW',
                    triggerAt: new Date(),
                    confidence: 0.7,
                },
            ];
            mockService.detectCommitments.mockReturnValue(mockCommitments);
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "I'm going to do laundry later" }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.commitments).toHaveLength(0);
            expect(mockService.createReminder).not.toHaveBeenCalled();
        });

        it('should accept optional conversationId', async () => {
            mockService.detectCommitments.mockReturnValue([]);
            const app = await createTestApp();

            const res = await app.request('/pac/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'Hello there',
                    conversationId: 'conv-123',
                }),
            });

            expect(res.status).toBe(200);
        });
    });

    describe('GET /pac/reminders - Get pending reminders', () => {
        it('should return pending reminders', async () => {
            mockService.getPendingReminders.mockResolvedValue([
                {
                    id: 'rem-1',
                    content: 'call mom',
                    type: 'EXPLICIT',
                    status: 'PENDING',
                    priority: 50,
                    triggerAt: new Date(),
                    snoozeCount: 0,
                    chatId: null,
                    createdAt: new Date(),
                },
            ]);
            const app = await createTestApp();

            const res = await app.request('/pac/reminders');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.reminders).toHaveLength(1);
            expect(body.reminders[0].id).toBe('rem-1');
        });

        it('should return empty array when no reminders exist', async () => {
            mockService.getPendingReminders.mockResolvedValue([]);
            const app = await createTestApp();

            const res = await app.request('/pac/reminders');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.reminders).toEqual([]);
        });

        it('should respect limit query parameter capped at 50', async () => {
            mockService.getPendingReminders.mockResolvedValue([]);
            const app = await createTestApp();

            await app.request('/pac/reminders?limit=100');

            // The route caps limit to 50
            expect(mockService.getPendingReminders).toHaveBeenCalledWith(TEST_USER_ID, 50);
        });

        it('should default limit to 20', async () => {
            mockService.getPendingReminders.mockResolvedValue([]);
            const app = await createTestApp();

            await app.request('/pac/reminders');

            expect(mockService.getPendingReminders).toHaveBeenCalledWith(TEST_USER_ID, 20);
        });
    });

    describe('PATCH /pac/reminders/:id/complete - Complete reminder', () => {
        it('should complete reminder successfully', async () => {
            mockService.completeReminder.mockResolvedValue({ count: 1 });
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/complete', {
                method: 'PATCH',
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockService.completeReminder).toHaveBeenCalledWith('rem-1', TEST_USER_ID);
        });
    });

    describe('PATCH /pac/reminders/:id/dismiss - Dismiss reminder', () => {
        it('should dismiss reminder successfully', async () => {
            mockService.dismissReminder.mockResolvedValue({ count: 1 });
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/dismiss', {
                method: 'PATCH',
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(mockService.dismissReminder).toHaveBeenCalledWith('rem-1', TEST_USER_ID);
        });
    });

    describe('PATCH /pac/reminders/:id/snooze - Snooze reminder', () => {
        it('should return 400 when minutes is missing', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/snooze', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it('should return 400 when minutes is less than 1', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/snooze', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: 0 }),
            });

            expect(res.status).toBe(400);
        });

        it('should return 400 when minutes exceeds 10080 (7 days)', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/snooze', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: 10081 }),
            });

            expect(res.status).toBe(400);
        });

        it('should snooze reminder successfully', async () => {
            const newTriggerAt = new Date(Date.now() + 30 * 60 * 1000);
            mockService.snoozeReminder.mockResolvedValue({ newTriggerAt });
            const app = await createTestApp();

            const res = await app.request('/pac/reminders/rem-1/snooze', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minutes: 30 }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.newTriggerAt).toBeDefined();
        });
    });

    describe('GET /pac/settings - Get PAC settings', () => {
        it('should return PAC settings', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/settings');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.settings.enabled).toBe(true);
            expect(body.settings.explicitEnabled).toBe(true);
            expect(body.settings.implicitEnabled).toBe(true);
            expect(body.settings.quietHoursStart).toBe('22:00');
        });
    });

    describe('PATCH /pac/settings - Update PAC settings', () => {
        it('should return 400 when no valid settings are provided', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });

            expect(res.status).toBe(400);
        });

        it('should update settings successfully', async () => {
            mockService.updatePACSettings.mockResolvedValue({
                ...defaultSettings,
                enabled: false,
            });
            const app = await createTestApp();

            const res = await app.request('/pac/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: false }),
            });

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.settings.enabled).toBe(false);
        });

        it('should validate quietHoursStart format as HH:MM', async () => {
            const app = await createTestApp();

            const res = await app.request('/pac/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quietHoursStart: 'invalid' }),
            });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /pac/stats - Get PAC statistics', () => {
        it('should return PAC statistics', async () => {
            mockService.getPACStats.mockResolvedValue({
                total: 25,
                pending: 3,
                completed: 15,
                snoozed: 2,
                dismissed: 5,
                completionRate: 60,
                effectiveness: {
                    engagementRate: 72.5,
                    avgResponseTimeMin: 15.3,
                    optimalHour: 10,
                    bestDayOfWeek: 2,
                    implicitAccuracy: 65.0,
                    snoozeRate: 8.0,
                    recommendation: 'Great engagement! PAC is working well for you.',
                },
            });
            const app = await createTestApp();

            const res = await app.request('/pac/stats');

            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.total).toBe(25);
            expect(body.completionRate).toBe(60);
            expect(body.effectiveness.engagementRate).toBe(72.5);
        });
    });
});
