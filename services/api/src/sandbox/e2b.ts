import { assertSandboxOwner, getSandboxOwnerKey } from './ownership';
import type { ExecResult, SandboxContext, SandboxOpts, SandboxService } from './types';
import { validateSandboxCommand, validateSandboxPath } from './validation';

export class E2BSandboxService implements SandboxService {
    private apiKey: string | undefined;
    private owners = new Map<string, string>();

    constructor() {
        this.apiKey = process.env.E2B_API_KEY;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async createSandbox(_opts: SandboxOpts, ctx: SandboxContext): Promise<string> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');
        const ownerKey = getSandboxOwnerKey(ctx);

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.create({ apiKey: this.apiKey });
        this.owners.set(sandbox.sandboxId, ownerKey);
        return sandbox.sandboxId;
    }

    async execCommand(sandboxId: string, cmd: string, ctx: SandboxContext): Promise<ExecResult> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');
        validateSandboxCommand(cmd);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        const result = await sandbox.commands.run(cmd);
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        };
    }

    async writeFile(
        sandboxId: string,
        path: string,
        content: string,
        ctx: SandboxContext
    ): Promise<void> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');
        validateSandboxPath(path);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        await sandbox.files.write(path, content);
    }

    async readFile(sandboxId: string, path: string, ctx: SandboxContext): Promise<string> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');
        validateSandboxPath(path);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        return await sandbox.files.read(path);
    }

    async destroySandbox(sandboxId: string, ctx: SandboxContext): Promise<void> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        await sandbox.kill();
        this.owners.delete(sandboxId);
    }
}
