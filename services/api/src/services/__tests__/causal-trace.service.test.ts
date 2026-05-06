import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getCausalChain,
    getCriticalPath,
    getEffects,
    getSessionSummary,
} from '../causal-trace.service';

const convexQuery = vi.fn();
const originalEnv = { ...process.env };

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            listByUser: 'actionLog.listByUser',
            listRecent: 'actionLog.listRecent',
        },
    },
    getConvexClient: vi.fn(() => ({
        query: convexQuery,
    })),
    getConvexServiceSecret: vi.fn(() => process.env.CONVEX_SERVICE_SECRET),
}));

describe('causal trace service fail-loud behavior', () => {
    beforeEach(() => {
        convexQuery.mockReset();
        process.env = {
            ...originalEnv,
            CONVEX_SERVICE_SECRET: 'convex-service-secret',
        };
    });

    it('loads a causal chain from recent action logs', async () => {
        convexQuery.mockResolvedValueOnce([
            {
                _id: 'root',
                event_type: 'llm_response',
                timestamp: 1000,
                details: { actionId: 'root', latencyMs: 10 },
            },
            {
                _id: 'child',
                event_type: 'tool_call',
                timestamp: 2000,
                details: {
                    actionId: 'child',
                    parentActionId: 'root',
                    toolName: 'file.write',
                    guardDecision: 'allow',
                    latencyMs: 20,
                },
            },
        ]);

        await expect(getCausalChain('child')).resolves.toMatchObject({
            totalLatencyMs: 30,
            depth: 2,
            nodes: [
                { id: 'root', actionType: 'llm_response' },
                { id: 'child', actionType: 'tool_call', toolName: 'file.write' },
            ],
        });
    });

    it('does not fake an empty causal chain when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getCausalChain('action-1')).rejects.toThrow('Failed to load causal chain');
    });

    it('does not fake empty action effects when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getEffects('action-1')).rejects.toThrow('Failed to load action effects');
    });

    it('does not fake an empty critical path when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getCriticalPath('user-1', 'session-1')).rejects.toThrow(
            'Failed to load critical path'
        );
    });

    it('does not fake a zero session summary when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getSessionSummary('user-1', 'session-1')).rejects.toThrow(
            'Failed to load session summary'
        );
    });
});
