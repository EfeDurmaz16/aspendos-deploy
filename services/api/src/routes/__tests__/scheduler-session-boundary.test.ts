import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import schedulerRoutes from '../scheduler';

vi.mock('@aspendos/db', () => ({
    ScheduledTaskStatus: {
        PENDING: 'PENDING',
        PROCESSING: 'PROCESSING',
        COMPLETED: 'COMPLETED',
        FAILED: 'FAILED',
        CANCELED: 'CANCELED',
    },
    prisma: {
        user: {
            findUnique: vi.fn().mockResolvedValue({ banned: false }),
        },
    },
}));

vi.mock('../../services/scheduler.service', () => ({
    getUserScheduledTasks: vi.fn(),
    formatScheduledTime: vi.fn(),
    parseTimeExpression: vi.fn(),
    createScheduledTask: vi.fn(),
    getTaskById: vi.fn(),
    cancelScheduledTask: vi.fn(),
    rescheduleTask: vi.fn(),
    markTaskProcessing: vi.fn(),
    markTaskCompleted: vi.fn(),
    markTaskFailed: vi.fn(),
}));

vi.mock('../../services/billing.service', () => ({
    recordTokenUsage: vi.fn(),
}));

vi.mock('../../services/commitment-detector.service', () => ({
    generateReengagementMessage: vi.fn(),
}));

vi.mock('../../services/memory-agent', () => ({
    consolidateMemories: vi.fn(),
}));

vi.mock('../../services/memory-router.service', () => ({
    searchMemories: vi.fn(),
}));

vi.mock('../../services/notification.service', () => ({
    sendNotification: vi.fn(),
}));

import { recordTokenUsage } from '../../services/billing.service';
import { generateReengagementMessage } from '../../services/commitment-detector.service';
import { sendNotification } from '../../services/notification.service';
import * as schedulerService from '../../services/scheduler.service';

const mockPrisma = prisma as any;
const mockSchedulerService = schedulerService as any;
const mockRecordTokenUsage = recordTokenUsage as any;
const mockGenerateReengagementMessage = generateReengagementMessage as any;
const mockSendNotification = sendNotification as any;

function createApiKeyAuthenticatedApp() {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', 'scheduler-user-1');
        c.set('apiKeyId', 'key-1');
        c.set('apiKeyPermissions', ['chat:read']);
        return next();
    });
    app.route('/scheduler', schedulerRoutes);
    return app;
}

describe('scheduler route session boundary', () => {
    const originalCronSecret = process.env.CRON_SECRET;

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.CRON_SECRET = 'test-cron-secret';
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
        mockSchedulerService.getUserScheduledTasks.mockResolvedValue([]);
        mockSchedulerService.markTaskProcessing.mockResolvedValue(undefined);
        mockSchedulerService.markTaskCompleted.mockResolvedValue(undefined);
        mockSchedulerService.markTaskFailed.mockResolvedValue(undefined);
        mockRecordTokenUsage.mockResolvedValue(undefined);
        mockGenerateReengagementMessage.mockResolvedValue('Follow up now');
        mockSendNotification.mockResolvedValue([{ channel: 'in_app', status: 'sent' }]);
    });

    afterEach(() => {
        if (originalCronSecret === undefined) {
            delete process.env.CRON_SECRET;
            return;
        }
        process.env.CRON_SECRET = originalCronSecret;
    });

    it('rejects API-key authenticated scheduled task management', async () => {
        const app = createApiKeyAuthenticatedApp();

        const res = await app.request('/scheduler/tasks');

        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({
            error: 'API key authentication is not allowed for this route',
        });
        expect(mockSchedulerService.getUserScheduledTasks).not.toHaveBeenCalled();
    });

    it('does not execute non-pending tasks', async () => {
        mockSchedulerService.getTaskById.mockResolvedValue({
            id: 'task-1',
            userId: 'scheduler-user-1',
            chatId: 'chat-1',
            status: 'COMPLETED',
        });
        const app = new Hono();
        app.route('/scheduler', schedulerRoutes);

        const res = await app.request('/scheduler/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': 'test-cron-secret',
            },
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toEqual({
            error: 'Task is not pending',
            status: 'COMPLETED',
        });
        expect(mockSchedulerService.markTaskProcessing).not.toHaveBeenCalled();
        expect(mockGenerateReengagementMessage).not.toHaveBeenCalled();
    });

    it('executes pending tasks using the real scheduled task status value', async () => {
        const task = {
            id: 'task-1',
            userId: 'scheduler-user-1',
            chatId: 'chat-1',
            status: 'PENDING',
            intent: 'follow_up',
            topic: 'Status',
            channelPref: 'in_app',
        };
        mockSchedulerService.getTaskById.mockResolvedValue(task);
        const app = new Hono();
        app.route('/scheduler', schedulerRoutes);

        const res = await app.request('/scheduler/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': 'test-cron-secret',
            },
            body: JSON.stringify({ taskId: 'task-1' }),
        });

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            success: true,
            taskId: 'task-1',
            message: 'Follow up now',
        });
        expect(mockSchedulerService.markTaskProcessing).toHaveBeenCalledWith('task-1');
        expect(mockGenerateReengagementMessage).toHaveBeenCalledWith(task);
        expect(mockSchedulerService.markTaskCompleted).toHaveBeenCalledWith(
            'task-1',
            'Follow up now',
            'pending_delivery'
        );
    });
});
