import { describe, expect, it } from 'vitest';
import { runCode, validateCommand, validateSandboxPath } from '../../../src/lib/tools/sandbox';

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
        const result = await runCode.execute({
            sandboxId: 'unknown-sandbox',
            command: 'echo ok',
        });

        expect(result).toEqual({
            success: false,
            error: 'Sandbox not found. Create a sandbox first.',
        });
    });
});
