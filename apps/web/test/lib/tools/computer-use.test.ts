import { describe, expect, it } from 'vitest';
import { computerAction, computerScreenshot } from '../../../src/lib/tools/computer-use';

describe('web computer use tool safety', () => {
    it('requires Anthropic credentials before computer actions', async () => {
        const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;

        try {
            const execute = computerAction.execute;
            if (!execute) {
                throw new Error('computerAction tool must expose an execute function');
            }

            const result = await execute(
                {
                    action: { action: 'left_click', coordinate: [10, 20] },
                },
                { toolCallId: 'test-tool-call', messages: [] }
            );

            expect(result).toEqual({
                success: false,
                error: 'ANTHROPIC_API_KEY not configured',
            });
        } finally {
            if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
            else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
        }
    });

    it('fails loud instead of reporting successful desktop execution', async () => {
        const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

        try {
            const execute = computerAction.execute;
            if (!execute) {
                throw new Error('computerAction tool must expose an execute function');
            }

            const result = await execute(
                {
                    action: { action: 'type', text: 'hello' },
                    displayWidth: 1440,
                    displayHeight: 900,
                    model: 'claude-test',
                },
                { toolCallId: 'test-tool-call', messages: [] }
            );

            expect(result).toEqual({
                success: false,
                error: 'Computer Use sandbox loop is not implemented. Refusing to report success without executing the desktop action.',
                action: 'type',
                displayWidth: 1440,
                displayHeight: 900,
                model: 'claude-test',
            });
        } finally {
            if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
            else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
        }
    });

    it('fails loud instead of reporting a successful screenshot', async () => {
        const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

        try {
            const execute = computerScreenshot.execute;
            if (!execute) {
                throw new Error('computerScreenshot tool must expose an execute function');
            }

            const result = await execute(
                {
                    prompt: 'describe screen',
                },
                { toolCallId: 'test-tool-call', messages: [] }
            );

            expect(result).toEqual({
                success: false,
                error: 'Computer Use sandbox loop is not implemented. Refusing to report success without executing the desktop action.',
                displayWidth: 1280,
                displayHeight: 800,
                prompt: 'describe screen',
            });
        } finally {
            if (previousAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
            else process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
        }
    });
});
