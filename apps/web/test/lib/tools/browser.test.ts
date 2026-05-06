import type { ToolExecutionOptions } from 'ai';
import { describe, expect, it } from 'vitest';
import { createSession, navigate } from '../../../src/lib/tools/browser';

const toolExecutionOptions: ToolExecutionOptions = {
    toolCallId: 'test-tool-call',
    messages: [],
};

describe('web browser tool session safety', () => {
    it('requires execution owner context before creating a cloud browser session', async () => {
        const execute = createSession.execute;
        if (!execute) {
            throw new Error('createSession tool must expose an execute function');
        }

        const result = await execute({}, toolExecutionOptions);

        expect(result).toEqual({
            success: false,
            error: 'Tool execution user context required',
        });
    });

    it('does not create a new browser session when an operation references an unknown session id', async () => {
        const execute = navigate.execute;
        if (!execute) {
            throw new Error('navigate tool must expose an execute function');
        }

        const result = await execute(
            {
                sessionId: 'unknown-session',
                url: 'https://example.com',
            },
            {
                ...toolExecutionOptions,
                experimental_context: {
                    userId: 'user-1',
                    sessionId: 'session-1',
                },
            }
        );

        expect(result).toEqual({
            success: false,
            error: 'Session not found. Create a session first.',
        });
    });
});
