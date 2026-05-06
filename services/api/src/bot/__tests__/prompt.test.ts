import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.doUnmock('../../services/memory-router.service');
    vi.resetModules();
});

describe('bot prompt memory posture', () => {
    it('fails loud when memory search is unavailable for an identified user', async () => {
        vi.doMock('../../services/memory-router.service', () => ({
            searchMemories: async () => {
                throw new Error('mock search failure');
            },
            supermemory: {
                getUserProfile: async () => ({ static: [], dynamic: [] }),
            },
        }));
        const { getSystemPrompt } = await import('../prompt');

        await expect(getSystemPrompt('user-1', 'hello')).rejects.toThrow(
            /Bot memory context unavailable: mock search failure/
        );
    });

    it('fails loud when SuperMemory profile loading fails for an identified user', async () => {
        vi.doMock('../../services/memory-router.service', () => ({
            searchMemories: async () => [],
            supermemory: {
                getUserProfile: async () => {
                    throw new Error('mock profile failure');
                },
            },
        }));
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
