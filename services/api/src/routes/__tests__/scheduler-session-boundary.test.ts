import { prisma } from '@aspendos/db';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import schedulerRoutes from '../scheduler';

vi.mock('@aspendos/db', () => ({
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

import * as schedulerService from '../../services/scheduler.service';

const mockPrisma = prisma as any;
const mockSchedulerService = schedulerService as any;

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
    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue({ banned: false });
        mockSchedulerService.getUserScheduledTasks.mockResolvedValue([]);
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
});
