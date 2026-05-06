import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import tracesRoutes from '../traces';

vi.mock('../../services/causal-trace.service', () => ({
    getCausalChain: vi.fn(),
    getSessionSummary: vi.fn(),
}));

import * as causalTraceService from '../../services/causal-trace.service';

const mockCausalTraceService = causalTraceService as any;

function createApp(userId: string | null = 'user-1') {
    const app = new Hono();
    app.use('*', async (c, next) => {
        c.set('userId', userId);
        return next();
    });
    app.route('/traces', tracesRoutes);
    return app;
}

describe('traces causal routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCausalTraceService.getCausalChain.mockResolvedValue({
            nodes: [],
            totalLatencyMs: 0,
            depth: 0,
        });
        mockCausalTraceService.getSessionSummary.mockResolvedValue({
            totalActions: 0,
            toolCalls: 0,
            blockedActions: 0,
            approvalRequests: 0,
            totalLatencyMs: 0,
            avgLatencyMs: 0,
            toolUsage: {},
        });
    });

    it('fails loud when causal chain reads fail', async () => {
        mockCausalTraceService.getCausalChain.mockRejectedValueOnce(new Error('convex offline'));
        const app = createApp();

        const response = await app.request('/traces/causal/action-1');

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'Failed to load causal trace',
            cause: 'convex offline',
        });
    });

    it('fails loud when session summary reads fail', async () => {
        mockCausalTraceService.getSessionSummary.mockRejectedValueOnce(new Error('convex offline'));
        const app = createApp();

        const response = await app.request('/traces/session/session-1');

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: 'Failed to load session trace summary',
            cause: 'convex offline',
        });
    });

    it('requires authentication before causal trace reads', async () => {
        const app = createApp(null);

        const response = await app.request('/traces/causal/action-1');

        expect(response.status).toBe(401);
        expect(mockCausalTraceService.getCausalChain).not.toHaveBeenCalled();
    });
});
