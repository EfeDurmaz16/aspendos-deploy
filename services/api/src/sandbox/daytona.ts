import { assertSandboxOwner, getSandboxOwnerKey } from './ownership';
import type { ExecResult, SandboxContext, SandboxOpts, SandboxService } from './types';
import { validateSandboxCommand, validateSandboxPath } from './validation';

function pythonStringLiteral(value: string) {
    return JSON.stringify(value);
}

export class DaytonaSandboxService implements SandboxService {
    private apiKey: string | undefined;
    private owners = new Map<string, string>();

    constructor() {
        this.apiKey = process.env.DAYTONA_API_KEY;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }

    async createSandbox(opts: SandboxOpts, ctx: SandboxContext): Promise<string> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        const ownerKey = getSandboxOwnerKey(ctx);

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const baseParams = {
            language: opts.language ?? 'typescript',
            name: opts.name,
            ephemeral: opts.ephemeral ?? true,
            autoStopInterval: 15,
        };
        const sandbox = opts.resources
            ? await daytona.create({
                  ...baseParams,
                  image: process.env.DAYTONA_SANDBOX_IMAGE ?? 'node:20',
                  resources: opts.resources,
              })
            : await daytona.create(baseParams);
        this.owners.set(sandbox.id, ownerKey);
        return sandbox.id;
    }

    async execCommand(sandboxId: string, cmd: string, ctx: SandboxContext): Promise<ExecResult> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxCommand(cmd);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const sandbox = await daytona.get(sandboxId);
        const result = await sandbox.process.executeCommand(cmd);
        return {
            stdout: result.result ?? '',
            stderr: '',
            exitCode: result.exitCode ?? 0,
        };
    }

    async writeFile(
        sandboxId: string,
        path: string,
        content: string,
        ctx: SandboxContext
    ): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxPath(path);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const sandbox = await daytona.get(sandboxId);
        await sandbox.process.executeCommand(
            `python3 - <<'PY'\nfrom pathlib import Path\nPath(${pythonStringLiteral(path)}).write_text(${pythonStringLiteral(content)})\nPY`
        );
    }

    async readFile(sandboxId: string, path: string, ctx: SandboxContext): Promise<string> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxPath(path);
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const result = await this.execCommand(
            sandboxId,
            `python3 - <<'PY'\nfrom pathlib import Path\nprint(Path(${pythonStringLiteral(path)}).read_text(), end='')\nPY`,
            ctx
        );
        return result.stdout;
    }

    async destroySandbox(sandboxId: string, ctx: SandboxContext): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        assertSandboxOwner(this.owners, sandboxId, ctx);

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const sandbox = await daytona.get(sandboxId);
        await sandbox.delete();
        this.owners.delete(sandboxId);
    }
}
