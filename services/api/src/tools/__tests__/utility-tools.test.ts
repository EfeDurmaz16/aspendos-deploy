import { describe, expect, it } from 'vitest';
import { currentTimeTool } from '../index';

describe('utility tools', () => {
    it('returns current time for a valid timezone', async () => {
        const result = await currentTimeTool.execute?.(
            { timezone: 'UTC' },
            { toolCallId: 'test-tool-call', messages: [] }
        );

        expect(result).toMatchObject({
            success: true,
            timezone: 'UTC',
        });
        expect((result as any).iso).toEqual(expect.any(String));
        expect((result as any).datetime).toEqual(expect.any(String));
    });

    it('fails loud for invalid timezones instead of silently falling back to UTC', async () => {
        const result = await currentTimeTool.execute?.(
            { timezone: 'Mars/Olympus_Mons' },
            { toolCallId: 'test-tool-call', messages: [] }
        );

        expect(result).toMatchObject({
            success: false,
            timezone: 'Mars/Olympus_Mons',
        });
        expect((result as any).error).toEqual(expect.any(String));
    });
});
