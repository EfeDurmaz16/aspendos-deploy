import type { ExecResult, SandboxOpts, SandboxService } from './types';

const SAFE_PATH_ROOTS = ['/home/daytona', '/home/user', '/tmp', '/workspace'];
const BLOCKED_COMMAND_PATTERNS = [
    /\brm\s+-rf\s+(?:\/|\*)/i,
    /\b(?:mkfs|shutdown|reboot|halt|poweroff)\b/i,
    /\bdd\s+if=/i,
    /:\s*\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}/,
    /\bcurl\b.*\|\s*(?:sh|bash|zsh)\b/i,
    /\bwget\b.*\|\s*(?:sh|bash|zsh)\b/i,
];

function validateSandboxPath(path: string) {
    if (!path.startsWith('/')) {
        throw new Error('Sandbox path must be absolute');
    }
    if (path.includes('\0') || path.split('/').includes('..')) {
        throw new Error('Sandbox path contains unsafe traversal');
    }
    if (!SAFE_PATH_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) {
        throw new Error(`Sandbox path must be under ${SAFE_PATH_ROOTS.join(', ')}`);
    }
}

function validateCommand(cmd: string) {
    if (cmd.length > 4000) {
        throw new Error('Sandbox command is too long');
    }
    for (const pattern of BLOCKED_COMMAND_PATTERNS) {
        if (pattern.test(cmd)) {
            throw new Error('Sandbox command matches a blocked destructive pattern');
        }
    }
}

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
        validateCommand(cmd);

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
