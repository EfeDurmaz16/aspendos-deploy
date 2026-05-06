import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const convexMock = vi.hoisted(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
}));

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: {
            log: 'actionLog.log',
            listByUser: 'actionLog.listByUser',
            listRecent: 'actionLog.listRecent',
        },
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

vi.mock('ai', () => ({
    streamText: vi.fn(),
}));

vi.mock('../../lib/ai-providers', () => ({
    getModelWithFallback: vi.fn(() => ({ model: 'mock-model' })),
}));

vi.mock('../memory-router.service', () => ({
    searchMemories: vi.fn().mockResolvedValue([]),
    addMemory: vi.fn().mockResolvedValue({ id: 'memory-1' }),
}));

beforeEach(() => {
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

describe('council service fail-loud behavior', () => {
    it('does not return an unpersisted session when session creation fails', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { createCouncilSession } = await import('../council.service');

        await expect(createCouncilSession('user-1', 'What should I do?')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not turn session read failures into not-found', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getCouncilSession } = await import('../council.service');

        await expect(getCouncilSession('session-1', 'user-1')).rejects.toThrow(
            'convex read unavailable'
        );
    });

    it('does not return an empty session list when session reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { listCouncilSessions } = await import('../council.service');

        await expect(listCouncilSessions('user-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not report a pending status when status refresh fails', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { updateSessionStatus } = await import('../council.service');

        await expect(updateSessionStatus('session-1')).rejects.toThrow('convex read unavailable');
    });

    it('does not report selection success when selection persistence fails', async () => {
        convexMock.query.mockResolvedValueOnce([
            {
                event_type: 'council_session_created',
                timestamp: 1_800_000_000_000,
                details: {
                    sessionId: 'session-1',
                    query: 'What should I do?',
                    status: 'COMPLETED',
                },
            },
            {
                event_type: 'council_response_updated',
                timestamp: 1_800_000_001_000,
                details: {
                    sessionId: 'session-1',
                    persona: 'SCHOLAR',
                    content: 'Evidence-based answer',
                    status: 'COMPLETED',
                },
            },
        ]);
        convexMock.mutation.mockRejectedValueOnce(new Error('convex write unavailable'));
        const { selectResponse } = await import('../council.service');

        await expect(selectResponse('session-1', 'user-1', 'SCHOLAR')).rejects.toThrow(
            'convex write unavailable'
        );
    });

    it('does not return zero stats when stats reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex read unavailable'));
        const { getCouncilStats } = await import('../council.service');

        await expect(getCouncilStats('user-1')).rejects.toThrow('convex read unavailable');
    });
});
