import type { ExecResult, SandboxOpts, SandboxService } from './types';
import { validateSandboxCommand, validateSandboxPath } from './validation';

function pythonStringLiteral(value: string) {
    return JSON.stringify(value);
}

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
        return sandbox.id;
    }

    async execCommand(sandboxId: string, cmd: string): Promise<ExecResult> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxCommand(cmd);

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

    async writeFile(sandboxId: string, path: string, content: string): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxPath(path);

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const sandbox = await daytona.get(sandboxId);
        await sandbox.process.executeCommand(
            `python3 - <<'PY'\nfrom pathlib import Path\nPath(${pythonStringLiteral(path)}).write_text(${pythonStringLiteral(content)})\nPY`
        );
    }

    async readFile(sandboxId: string, path: string): Promise<string> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');
        validateSandboxPath(path);

        const result = await this.execCommand(
            sandboxId,
            `python3 - <<'PY'\nfrom pathlib import Path\nprint(Path(${pythonStringLiteral(path)}).read_text(), end='')\nPY`
        );
        return result.stdout;
    }

    async destroySandbox(sandboxId: string): Promise<void> {
        if (!this.apiKey) throw new Error('DAYTONA_API_KEY not configured');

        const { Daytona } = await import('@daytona/sdk');
        const daytona = new Daytona({ apiKey: this.apiKey });
        const sandbox = await daytona.get(sandboxId);
        await sandbox.delete();
    }
}
