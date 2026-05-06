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

describe('bot tools', () => {
    it('fails loud for invalid timezones', async () => {
        delete process.env.SUPERMEMORY_API_KEY;
        const { getAgentTools } = await import('../tools');
        const tools = await getAgentTools('user-1');

        const result = await tools.current_time.execute(
            { timezone: 'Mars/Olympus_Mons' },
            { toolCallId: 'test-tool-call', messages: [] }
        );

        expect(result).toMatchObject({
            success: false,
            timezone: 'Mars/Olympus_Mons',
        });
        expect(result.error).toEqual(expect.any(String));
    });

    it('fails loud when SuperMemory native tools are configured but unavailable', async () => {
        process.env.SUPERMEMORY_API_KEY = 'test-supermemory-key';
        supermemoryMock.supermemoryTools.mockImplementationOnce(() => {
            throw new Error('mock bot SuperMemory tool failure');
        });
        const { getAgentTools } = await import('../tools');

        await expect(getAgentTools('user-1')).rejects.toThrow(
            /Bot SuperMemory tools are configured but unavailable: mock bot SuperMemory tool failure/
        );
    });
});
