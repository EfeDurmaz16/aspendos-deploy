import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supermemoryMock = vi.hoisted(() => ({
    memoriesAdd: vi.fn(),
    memoriesList: vi.fn(),
    memoriesForget: vi.fn(),
    documentsUpdate: vi.fn(),
    documentsDelete: vi.fn(),
    searchExecute: vi.fn(),
    profile: vi.fn(),
}));

const convexMock = vi.hoisted(() => ({
    query: vi.fn(),
    mutation: vi.fn(),
}));

vi.mock('supermemory', () => ({
    Supermemory: vi.fn(function Supermemory() {
        return {
            memories: {
                add: supermemoryMock.memoriesAdd,
                list: supermemoryMock.memoriesList,
                forget: supermemoryMock.memoriesForget,
            },
            documents: {
                update: supermemoryMock.documentsUpdate,
                delete: supermemoryMock.documentsDelete,
            },
            search: {
                execute: supermemoryMock.searchExecute,
            },
            profile: supermemoryMock.profile,
        };
    }),
}));

vi.mock('../../lib/circuit-breaker', () => ({
    breakers: {
        supermemory: {
            execute: vi.fn((fn: () => Promise<unknown>) => fn()),
        },
    },
}));

vi.mock('../../lib/convex', () => ({
    api: {
        actionLog: { log: 'actionLog.log' },
        memories: { listByUser: 'memories.listByUser' },
    },
    getConvexClient: () => convexMock,
    getConvexServiceSecret: () => 'test-service-secret',
}));

vi.mock('../../lib/memory-fallback', () => ({
    queueFallbackWrite: vi.fn(),
    searchFallback: vi.fn(),
}));

const previousSupermemoryKey = process.env.SUPERMEMORY_API_KEY;

beforeEach(() => {
    process.env.SUPERMEMORY_API_KEY = 'test-supermemory-key';
    for (const mock of Object.values(supermemoryMock)) mock.mockReset();
    convexMock.query.mockReset();
    convexMock.mutation.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
    if (previousSupermemoryKey === undefined) delete process.env.SUPERMEMORY_API_KEY;
    else process.env.SUPERMEMORY_API_KEY = previousSupermemoryKey;
});

describe('SuperMemory service fail-loud behavior', () => {
    it('does not return an empty list when SuperMemory listing fails', async () => {
        supermemoryMock.memoriesList.mockRejectedValueOnce(new Error('supermemory unavailable'));
        const { listMemories } = await import('../supermemory.service');

        await expect(listMemories('user-1')).rejects.toThrow('supermemory unavailable');
    });

    it('does not return zero stats when Convex stats reads fail', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex unavailable'));
        const { getMemoryStats } = await import('../supermemory.service');

        await expect(getMemoryStats('user-1')).rejects.toThrow('convex unavailable');
    });

    it('does not turn ownership read failures into not-found decisions', async () => {
        convexMock.query.mockRejectedValueOnce(new Error('convex unavailable'));
        const { verifyMemoryOwnership } = await import('../supermemory.service');

        await expect(verifyMemoryOwnership('memory-1', 'user-1')).rejects.toThrow(
            'Memory ownership verification failed'
        );
    });

    it('does not hide memory reinforcement audit failures', async () => {
        convexMock.mutation.mockRejectedValueOnce(new Error('convex unavailable'));
        const { reinforceMemory } = await import('../supermemory.service');

        await expect(reinforceMemory('memory-1')).rejects.toThrow('convex unavailable');
    });

    it('does not return an empty profile when SuperMemory profile reads fail', async () => {
        supermemoryMock.profile.mockRejectedValueOnce(new Error('profile unavailable'));
        const { getUserProfile } = await import('../supermemory.service');

        await expect(getUserProfile('user-1', 'context')).rejects.toThrow('profile unavailable');
    });

    it('does not hide conversation extraction failures from callers', async () => {
        supermemoryMock.memoriesAdd.mockRejectedValueOnce(new Error('extraction unavailable'));
        const { processConversation } = await import('../supermemory.service');

        await expect(
            processConversation('chat-1', 'user-1', [{ role: 'user', content: 'hello' }])
        ).rejects.toThrow('extraction unavailable');
    });
});
