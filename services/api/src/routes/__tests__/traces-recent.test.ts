import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import tracesRoutes from '../traces';

vi.mock('../../services/action-log.service', () => ({
    getRecentActions: vi.fn(),
}));

import * as actionLogService from '../../services/action-log.service';

const mockActionLogService = actionLogService as any;

function createApp(userId: string | null = 'user-1') {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', userId);
        return next();
    });
    app.route('/traces', tracesRoutes);
    return app;
}

describe('traces recent action log route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockActionLogService.getRecentActions.mockResolvedValue([
            { _id: 'action-1', event_type: 'tool_call' },
        ]);
    });

    it('routes /recent to the action log dashboard endpoint instead of trace detail', async () => {
        const app = createApp();

        const response = await app.request('/traces/recent');

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({
            actions: [{ _id: 'action-1', event_type: 'tool_call' }],
        });
        expect(mockActionLogService.getRecentActions).toHaveBeenCalledWith('user-1', {
            limit: 50,
        });
    });

    it('fails loud when recent action log reads fail', async () => {
        mockActionLogService.getRecentActions.mockRejectedValueOnce(new Error('convex offline'));
        const app = createApp();

        const response = await app.request('/traces/recent');

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'Failed to load recent agent actions',
            cause: 'convex offline',
        });
    });

    it('requires authentication for recent action logs', async () => {
        const app = createApp(null);

        const response = await app.request('/traces/recent');

        expect(response.status).toBe(401);
        expect(mockActionLogService.getRecentActions).not.toHaveBeenCalled();
    });
});
