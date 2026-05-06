import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memoryRouterMock = vi.hoisted(() => ({
    searchMemories: vi.fn(),
    getUserProfile: vi.fn(),
}));

vi.mock('../../services/memory-router.service', () => ({
    searchMemories: memoryRouterMock.searchMemories,
    supermemory: {
        getUserProfile: memoryRouterMock.getUserProfile,
    },
}));

beforeEach(() => {
    memoryRouterMock.searchMemories.mockReset();
    memoryRouterMock.getUserProfile.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
});

describe('bot prompt memory posture', () => {
    it('fails loud when memory search is unavailable for an identified user', async () => {
        memoryRouterMock.searchMemories.mockRejectedValueOnce(new Error('mock search failure'));
        memoryRouterMock.getUserProfile.mockResolvedValueOnce({ static: [], dynamic: [] });
        const { getSystemPrompt } = await import('../prompt');

        await expect(getSystemPrompt('user-1', 'hello')).rejects.toThrow(
            /Bot memory context unavailable: mock search failure/
        );
    });

    it('fails loud when SuperMemory profile loading fails for an identified user', async () => {
        memoryRouterMock.searchMemories.mockResolvedValueOnce([]);
        memoryRouterMock.getUserProfile.mockRejectedValueOnce(new Error('mock profile failure'));
        const { getSystemPrompt } = await import('../prompt');

        await expect(getSystemPrompt('user-1', 'hello')).rejects.toThrow(
            /Bot memory context unavailable: Bot SuperMemory profile unavailable: mock profile failure/
        );
    });

    it('does not require memory for anonymous users', async () => {
        const { getSystemPrompt } = await import('../prompt');

        await expect(getSystemPrompt('anonymous', 'hello')).resolves.toContain(
            'You are Yula, a helpful AI personal assistant'
        );
    });
});
