import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getActionEffects,
    getCausalChain,
    getRecentActions,
    getSessionActions,
    logAction,
} from '../action-log.service';

const convexMutation = vi.fn();
const convexQuery = vi.fn();
const originalEnv = { ...process.env };

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            listByUser: 'actionLog.listByUser',
            listRecent: 'actionLog.listRecent',
            log: 'actionLog.log',
        },
    },
    getConvexClient: vi.fn(() => ({
        mutation: convexMutation,
        query: convexQuery,
    })),
    getConvexServiceSecret: vi.fn(() => process.env.CONVEX_SERVICE_SECRET),
}));

describe('action log service persistence', () => {
    beforeEach(() => {
        convexMutation.mockReset();
        convexQuery.mockReset();
        process.env = {
            ...originalEnv,
            CONVEX_SERVICE_SECRET: 'convex-service-secret',
        };
    });

    it('persists action logs through Convex', async () => {
        convexMutation.mockResolvedValueOnce('action-1');

        await expect(
            logAction({
                userId: 'user-1',
                sessionId: 'session-1',
                actionType: 'tool_call',
                toolName: 'file.write',
                toolArgs: { path: 'README.md' },
                tokenCost: 3,
            })
        ).resolves.toBe('action-1');

        expect(convexMutation).toHaveBeenCalledWith('actionLog.log', {
            service_secret: 'convex-service-secret',
            user_id: 'user-1',
            event_type: 'tool_call',
            details: expect.objectContaining({
                sessionId: 'session-1',
                toolName: 'file.write',
                toolArgs: { path: 'README.md' },
                tokenCost: 3,
            }),
        });
    });

    it('does not fake persisted action logs when Convex writes fail', async () => {
        convexMutation.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(
            logAction({
                userId: 'user-1',
                sessionId: 'session-1',
                actionType: 'tool_call',
            })
        ).rejects.toThrow('Failed to persist action log');
    });

    it('does not fake an empty session action list when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getSessionActions('user-1', 'session-1')).rejects.toThrow(
            'Failed to load session actions'
        );
    });

    it('does not fake an empty session action list when Convex returns null', async () => {
        convexQuery.mockResolvedValueOnce(null);

        await expect(getSessionActions('user-1', 'session-1')).rejects.toThrow(
            'Failed to load session actions'
        );
    });

    it('does not fake an empty causal chain when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getCausalChain('action-1')).rejects.toThrow('Failed to load causal chain');
    });

    it('does not fake an empty causal chain when Convex returns null', async () => {
        convexQuery.mockResolvedValueOnce(null);

        await expect(getCausalChain('action-1')).rejects.toThrow('Failed to load causal chain');
    });

    it('does not fake empty action effects when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getActionEffects('action-1')).rejects.toThrow('Failed to load action effects');
    });

    it('does not fake empty action effects when Convex returns null', async () => {
        convexQuery.mockResolvedValueOnce(null);

        await expect(getActionEffects('action-1')).rejects.toThrow('Failed to load action effects');
    });

    it('does not fake recent actions when Convex reads fail', async () => {
        convexQuery.mockRejectedValueOnce(new Error('convex unavailable'));

        await expect(getRecentActions('user-1')).rejects.toThrow('Failed to load recent actions');
    });

    it('does not fake recent actions when Convex returns null', async () => {
        convexQuery.mockResolvedValueOnce(null);

        await expect(getRecentActions('user-1')).rejects.toThrow('Failed to load recent actions');
    });
});
