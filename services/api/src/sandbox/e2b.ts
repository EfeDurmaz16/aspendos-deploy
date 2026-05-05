import type { ExecResult, SandboxOpts, SandboxService } from './types';

export class E2BSandboxService implements SandboxService {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.E2B_API_KEY;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async createSandbox(_opts: SandboxOpts): Promise<string> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.create({ apiKey: this.apiKey });
        return sandbox.sandboxId;
    }

    async execCommand(sandboxId: string, cmd: string): Promise<ExecResult> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        const result = await sandbox.commands.run(cmd);
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.exitCode,
        };
    }

    async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        await sandbox.files.write(path, content);
    }

    async readFile(sandboxId: string, path: string): Promise<string> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        return await sandbox.files.read(path);
    }

    async destroySandbox(sandboxId: string): Promise<void> {
        if (!this.apiKey) throw new Error('E2B_API_KEY not configured');

        const { Sandbox } = await import('@e2b/code-interpreter');
        const sandbox = await Sandbox.connect(sandboxId, { apiKey: this.apiKey });
        await sandbox.kill();
    }
}
