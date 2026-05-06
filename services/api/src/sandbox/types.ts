export interface SandboxOpts {
    language?: 'typescript' | 'python' | 'javascript';
    name?: string;
    resources?: { cpu?: number; memory?: number; disk?: number };
    ephemeral?: boolean;
    timeoutMs?: number;
}

export interface SandboxContext {
    userId: string;
    sessionId: string;
}

export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface SandboxService {
    createSandbox(opts: SandboxOpts, ctx: SandboxContext): Promise<string>;
    execCommand(sandboxId: string, cmd: string, ctx: SandboxContext): Promise<ExecResult>;
    writeFile(sandboxId: string, path: string, content: string, ctx: SandboxContext): Promise<void>;
    readFile(sandboxId: string, path: string, ctx: SandboxContext): Promise<string>;
    destroySandbox(sandboxId: string, ctx: SandboxContext): Promise<void>;
}
