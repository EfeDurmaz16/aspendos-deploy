#!/usr/bin/env bun

const projectName = process.argv[2] || 'my-aspendos-agent';

console.log(`
  ╔═══════════════════════════════════════╗
  ║  create-aspendos-app                  ║
  ║  The open agent OS                    ║
  ╚═══════════════════════════════════════╝
`);

console.log(`Creating ${projectName}...`);

const template = {
    'package.json': JSON.stringify(
        {
            name: projectName,
            version: '0.1.0',
            type: 'module',
            scripts: {
                dev: 'bun run src/index.ts',
                build: 'bun build src/index.ts --outdir dist --target bun',
            },
            dependencies: {
                '@aspendos/core': '^0.1.0',
                '@fides/sdk': '^0.1.0',
                '@agit/sdk': '^0.1.0',
                ai: '^6.0.0',
                hono: '^4.6.0',
            },
        },
        null,
        4,
    ),
    'src/index.ts': `import { Hono } from 'hono';
import { ToolRegistry, runToolStep, getFides } from '@aspendos/core';

const app = new Hono();
const registry = new ToolRegistry();

// Register your tools here
// registry.register({ name: 'my.tool', ... });

app.post('/agent/execute', async (c) => {
    const { tool, args, userId } = await c.req.json();
    const result = await runToolStep(tool, args, { userId });
    return c.json(result);
});

app.get('/health', (c) => c.json({ status: 'ok', tools: registry.names() }));

export default { port: 3001, fetch: app.fetch };
`,
    'src/tools/example.ts': `import type { ToolDefinition } from '@aspendos/core';

export const exampleTool: ToolDefinition = {
    name: 'example.greet',
    description: 'A simple greeting tool',
    classify() {
        return {
            reversibility_class: 'undoable',
            approval_required: false,
            rollback_strategy: { kind: 'none' },
            human_explanation: 'Generates a greeting message',
        };
    },
    async execute(args) {
        const { name } = args as { name: string };
        return { success: true, data: { greeting: \`Hello, \${name}!\` } };
    },
};
`,
    'tsconfig.json': JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'bundler',
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                outDir: 'dist',
            },
            include: ['src'],
        },
        null,
        4,
    ),
};

const fs = await import('node:fs');
const path = await import('node:path');

const dir = path.join(process.cwd(), projectName);
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync(path.join(dir, 'src', 'tools'), { recursive: true });

for (const [file, content] of Object.entries(template)) {
    const filePath = path.join(dir, file);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ ${file}`);
}

console.log(`
Done! To get started:

  cd ${projectName}
  bun install
  bun dev

Every tool call is signed, committed, and reversible by default.
Docs: https://aspendos.dev/docs
`);
