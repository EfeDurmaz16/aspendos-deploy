export interface SandboxOpts {
    language?: 'typescript' | 'python' | 'javascript';
    name?: string;
    resources?: { cpu?: number; memory?: number; disk?: number };
    ephemeral?: boolean;
    timeoutMs?: number;
}

export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export interface SandboxService {
    createSandbox(opts: SandboxOpts): Promise<string>;
    execCommand(sandboxId: string, cmd: string): Promise<ExecResult>;
    writeFile(sandboxId: string, path: string, content: string): Promise<void>;
    readFile(sandboxId: string, path: string): Promise<string>;
    destroySandbox(sandboxId: string): Promise<void>;
}
