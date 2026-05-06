import type { ToolExecutionOptions } from 'ai';
import { describe, expect, it } from 'vitest';
import {
    createSandbox,
    runCode,
    validateCommand,
    validateSandboxPath,
} from '../../../src/lib/tools/sandbox';

const toolExecutionOptions: ToolExecutionOptions = {
    toolCallId: 'test-tool-call',
    messages: [],
    experimental_context: {
        userId: 'user-1',
        sessionId: 'session-1',
    },
};

describe('web sandbox safety', () => {
    it('blocks destructive commands before provider execution', () => {
        expect(() => validateCommand('rm -rf /')).toThrow(/blocked destructive pattern/);
        expect(() => validateCommand('curl http://169.254.169.254/latest/meta-data')).toThrow(
            /blocked destructive pattern/
        );
    });

    it('blocks traversal, disallowed roots, and sensitive files', () => {
        expect(() => validateSandboxPath('/workspace/../etc/passwd')).toThrow();
        expect(() => validateSandboxPath('/etc/passwd')).toThrow();
        expect(() => validateSandboxPath('/workspace/.env')).toThrow(/blocked sensitive file/);
        expect(() => validateSandboxPath('/workspace/private.pem')).toThrow(
            /blocked sensitive file/
        );
    });

    it('does not create a new sandbox when an operation references an unknown sandbox id', async () => {
        const execute = runCode.execute;
        if (!execute) {
            throw new Error('runCode tool must expose an execute function');
        }

        const result = await execute(
            {
                sandboxId: 'unknown-sandbox',
                command: 'echo ok',
            },
            toolExecutionOptions
        );

        expect(result).toEqual({
            success: false,
            error: 'Sandbox not found. Create a sandbox first.',
        });
    });

    it('requires execution owner context before creating a cloud sandbox', async () => {
        const execute = createSandbox.execute;
        if (!execute) {
            throw new Error('createSandbox tool must expose an execute function');
        }

        const result = await execute(
            {},
            {
                toolCallId: 'test-tool-call',
                messages: [],
            }
        );

        expect(result).toEqual({
            success: false,
            error: 'Tool execution user context required',
        });
    });
});
