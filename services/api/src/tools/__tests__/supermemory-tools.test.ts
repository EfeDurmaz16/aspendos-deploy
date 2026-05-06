import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supermemoryMock = vi.hoisted(() => ({
    supermemoryTools: vi.fn(),
}));

vi.mock('@supermemory/tools/ai-sdk', () => ({
    supermemoryTools: supermemoryMock.supermemoryTools,
}));

const previousSupermemoryKey = process.env.SUPERMEMORY_API_KEY;

beforeEach(() => {
    supermemoryMock.supermemoryTools.mockReset();
    vi.resetModules();
});

afterEach(() => {
    vi.resetModules();
    if (previousSupermemoryKey === undefined) delete process.env.SUPERMEMORY_API_KEY;
    else process.env.SUPERMEMORY_API_KEY = previousSupermemoryKey;
});

describe('SuperMemory tool loading', () => {
    it('uses base tools when SuperMemory is not configured', async () => {
        delete process.env.SUPERMEMORY_API_KEY;
        const { getToolsForTierWithSupermemory } = await import('../index');

        const tools = await getToolsForTierWithSupermemory('FREE', 'user-1');

        expect(tools).toHaveProperty('memory_search');
        expect(tools).toHaveProperty('calculator');
        expect(tools).toHaveProperty('current_time');
        expect(supermemoryMock.supermemoryTools).not.toHaveBeenCalled();
    });

    it('fails loud when SuperMemory is configured but tools cannot load', async () => {
        process.env.SUPERMEMORY_API_KEY = 'test-supermemory-key';
        supermemoryMock.supermemoryTools.mockImplementationOnce(() => {
            throw new Error('mock SuperMemory tools failure');
        });
        const { getToolsForTierWithSupermemory } = await import('../index');

        await expect(getToolsForTierWithSupermemory('FREE', 'user-1')).rejects.toThrow(
            /SuperMemory tools are configured but unavailable: mock SuperMemory tools failure/
        );
    });
});
