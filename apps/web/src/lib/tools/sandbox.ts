/**
 * E2B Sandbox Tools — Code execution in isolated cloud sandboxes
 *
 * Reversibility: undoable (sandboxes are ephemeral, killed on cleanup)
 * Tier: Personal+
 */

import { tool } from 'ai';
import { z } from 'zod';
import type { ReversibilityClass, RollbackStrategy } from '@/lib/reversibility/types';

// ── Metadata ────────────────────────────────────────────────────
export const SANDBOX_TOOL_META = {
    reversibility_class: 'undoable' as ReversibilityClass,
    tier_minimum: 'personal',
    rollback_strategy: {
        kind: 'snapshot_restore' as const,
        snapshot_id: '', // populated at runtime per sandbox
    } satisfies RollbackStrategy,
};

// ── Sandbox instance cache (per-request, keyed by sandboxId) ────
const sandboxCache = new Map<string, any>();

async function getOrCreateSandbox(sandboxId?: string) {
    const Sandbox = (await import('e2b')).default;

    if (sandboxId && sandboxCache.has(sandboxId)) {
        return sandboxCache.get(sandboxId);
    }

    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
        throw new Error('E2B_API_KEY not configured');
    }

    const sandbox = await Sandbox.create({ apiKey });
    sandboxCache.set(sandbox.sandboxId, sandbox);
    return sandbox;
}

// ── Tool: createSandbox ─────────────────────────────────────────
export const createSandbox = tool({
    description:
        'Create a new isolated cloud sandbox for code execution. Returns a sandboxId to use with other sandbox tools. The sandbox runs a full Linux environment.',
    inputSchema: z.object({
        template: z
            .string()
            .optional()
            .describe(
                'Optional E2B template ID (e.g. "Python3", "Node18"). Defaults to base sandbox.'
            ),
        timeoutMs: z
            .number()
            .optional()
            .describe('Sandbox timeout in milliseconds. Default 300000 (5 min).'),
    }),
    execute: async ({ template, timeoutMs }) => {
        try {
            const Sandbox = (await import('e2b')).default;
            const apiKey = process.env.E2B_API_KEY;
            if (!apiKey) {
                return { success: false, error: 'E2B_API_KEY not configured' };
            }

            const opts: Record<string, unknown> = { apiKey };
            if (template) opts.template = template;
            if (timeoutMs) opts.timeoutMs = timeoutMs;

            const sandbox = await Sandbox.create(opts);
            sandboxCache.set(sandbox.sandboxId, sandbox);

            return {
                success: true,
                sandboxId: sandbox.sandboxId,
                note: 'Sandbox created. Use this sandboxId for runCode, writeFile, readFile, installPackage.',
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create sandbox',
            };
        }
    },
});

// ── Tool: runCode ───────────────────────────────────────────────
export const runCode = tool({
    description:
        'Execute a shell command or code snippet inside an E2B sandbox. Returns stdout, stderr, and exit code.',
    inputSchema: z.object({
        sandboxId: z.string().describe('Sandbox ID from createSandbox'),
        command: z
            .string()
            .describe(
                'Shell command to execute (e.g. "python3 main.py", "node index.js", "ls -la")'
            ),
        cwd: z.string().optional().describe('Working directory inside the sandbox'),
        timeoutMs: z
            .number()
            .optional()
            .describe('Command timeout in milliseconds. Default 30000.'),
    }),
    execute: async ({ sandboxId, command, cwd, timeoutMs }) => {
        try {
            const sandbox = await getOrCreateSandbox(sandboxId);
            const opts: Record<string, unknown> = {};
            if (cwd) opts.cwd = cwd;
            if (timeoutMs) opts.timeoutMs = timeoutMs;

            const result = await sandbox.commands.run(command, opts);

            return {
                success: true,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Command execution failed',
            };
        }
    },
});

// ── Tool: writeFile ─────────────────────────────────────────────
export const writeFile = tool({
    description: 'Write content to a file inside the E2B sandbox.',
    inputSchema: z.object({
        sandboxId: z.string().describe('Sandbox ID from createSandbox'),
        path: z
            .string()
            .describe('Absolute file path inside the sandbox (e.g. "/home/user/main.py")'),
        content: z.string().describe('File content to write'),
    }),
    execute: async ({ sandboxId, path, content }) => {
        try {
            const sandbox = await getOrCreateSandbox(sandboxId);
            await sandbox.files.write(path, content);
            return { success: true, path };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to write file',
            };
        }
    },
});

// ── Tool: readFile ──────────────────────────────────────────────
export const readFile = tool({
    description: 'Read the contents of a file from the E2B sandbox.',
    inputSchema: z.object({
        sandboxId: z.string().describe('Sandbox ID from createSandbox'),
        path: z.string().describe('Absolute file path inside the sandbox'),
    }),
    execute: async ({ sandboxId, path }) => {
        try {
            const sandbox = await getOrCreateSandbox(sandboxId);
            const content = await sandbox.files.read(path);
            return { success: true, path, content };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to read file',
            };
        }
    },
});

// ── Tool: installPackage ────────────────────────────────────────
export const installPackage = tool({
    description:
        'Install a package inside the E2B sandbox using the appropriate package manager (pip, npm, apt).',
    inputSchema: z.object({
        sandboxId: z.string().describe('Sandbox ID from createSandbox'),
        manager: z.enum(['pip', 'npm', 'apt']).describe('Package manager to use'),
        packages: z
            .array(z.string())
            .describe('Package names to install (e.g. ["numpy", "pandas"])'),
    }),
    execute: async ({ sandboxId, manager, packages }) => {
        try {
            const sandbox = await getOrCreateSandbox(sandboxId);

            const cmds: Record<string, string> = {
                pip: `pip install ${packages.join(' ')}`,
                npm: `npm install ${packages.join(' ')}`,
                apt: `apt-get update && apt-get install -y ${packages.join(' ')}`,
            };

            const result = await sandbox.commands.run(cmds[manager], {
                timeoutMs: 120000,
            });

            return {
                success: result.exitCode === 0,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Package installation failed',
            };
        }
    },
});

// ── Convenience: all sandbox tools as a record ──────────────────
export const sandboxTools = {
    sandbox_create: createSandbox,
    sandbox_runCode: runCode,
    sandbox_writeFile: writeFile,
    sandbox_readFile: readFile,
    sandbox_installPackage: installPackage,
} as const;
