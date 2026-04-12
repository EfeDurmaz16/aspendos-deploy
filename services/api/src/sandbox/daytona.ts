import type { ExecResult, SandboxOpts, SandboxService } from './types';

export class DaytonaSandboxService implements SandboxService {
    private apiKey: string | undefined;

    constructor() {
        this.apiKey = process.env.DAYTONA_API_KEY;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async createSandbox(opts: SandboxOpts): Promise<string> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona();
        const sandbox = await daytona.create({
            language: opts.language ?? 'typescript',
            name: opts.name,
            resources: opts.resources,
            ephemeral: opts.ephemeral ?? true,
            autoStopInterval: 15,
        });
        return sandbox.id;
    }

    async execCommand(sandboxId: string, cmd: string): Promise<ExecResult> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona();
        const sandbox = await daytona.get(sandboxId);
        const result = await sandbox.process.executeCommand(cmd);
        return {
            stdout: result.result ?? '',
            stderr: '',
            exitCode: result.exitCode ?? 0,
        };
    }

    async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona();
        const sandbox = await daytona.get(sandboxId);
        await sandbox.process.executeCommand(`cat > ${path} << 'SANDBOX_EOF'\n${content}\nSANDBOX_EOF`);
    }

    async readFile(sandboxId: string, path: string): Promise<string> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const result = await this.execCommand(sandboxId, `cat ${path}`);
        return result.stdout;
    }

    async destroySandbox(sandboxId: string): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona();
        const sandbox = await daytona.get(sandboxId);
        await sandbox.delete();
    }
}
