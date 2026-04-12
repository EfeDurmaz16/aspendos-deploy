# Daytona — Worker-Facing Reference

> Sources: daytona.io/docs, daytona.io/pricing, github.com/daytonaio/daytona

## Overview

Daytona provides **sandboxed code execution environments** for AI agents. It pivoted from dev environments to AI infrastructure in early 2025, focusing on sub-90ms sandbox creation, stateful execution, and enterprise-grade security. Series A: $24M (Feb 2026, FirstMark Capital).

---

## 1. Core Concept — Sandboxes

Sandboxes are isolated runtime environments with:
- Dedicated kernel, filesystem, network stack
- Default: **1 vCPU, 1GB RAM, 3GiB disk**
- Max: **4 vCPUs, 8GB RAM, 10GB disk** (org limit)
- Sub-90ms creation time
- Multi-language: Python, TypeScript, JavaScript
- Full OS — can install packages, run servers, compile code

---

## 2. SDK Installation

### TypeScript SDK
```bash
npm i @daytona/sdk
```

### Python SDK
```bash
pip install daytona_sdk
```

### Environment Variable
```bash
DAYTONA_API_KEY="your-api-key"   # from app.daytona.io
DAYTONA_API_URL="https://app.daytona.io/api"  # optional, default
```

---

## 3. Creating Sandboxes

### TypeScript

```ts
import { Daytona } from '@daytona/sdk';

const daytona = new Daytona();

// Basic sandbox
const sandbox = await daytona.create();

// With options
const sandbox = await daytona.create({
  language: 'typescript',
  name: 'my-sandbox',
  resources: { cpu: 2, memory: 4, disk: 8 },
  autoStopInterval: 15,    // minutes of inactivity
  ephemeral: true,         // auto-delete on stop
  labels: { env: 'dev' },
});
```

### Python

```python
from daytona import Daytona, CreateSandboxFromSnapshotParams

daytona = Daytona()

sandbox = daytona.create(CreateSandboxFromSnapshotParams(
    language="python",
    name="my-sandbox",
))
```

---

## 4. Code Execution

### Stateless (clean interpreter each time)

```ts
// TypeScript SDK
const response = await sandbox.process.codeRun(`
  function greet(name: string): string {
    return \`Hello, \${name}!\`;
  }
  console.log(greet("YULA"));
`);
console.log(response.result); // "Hello, YULA!"

// With argv and env vars
const response = await sandbox.process.codeRun(
  `console.log(process.env.FOO)`,
  { env: { FOO: 'BAR' } }
);

// With timeout (seconds)
const response = await sandbox.process.codeRun(code, undefined, 5);
```

### Stateful (persistent context — variables survive between calls)

```ts
// Create isolated context
const ctx = await sandbox.codeInterpreter.createContext();

await sandbox.codeInterpreter.runCode(
  `counter = 1`,
  { context: ctx }
);

await sandbox.codeInterpreter.runCode(
  `counter += 1; print(counter)`,  // prints 2
  { context: ctx, onStdout: (msg) => console.log(msg.output) }
);

// Clean up
await sandbox.codeInterpreter.deleteContext(ctx);
```

---

## 5. Shell Command Execution

```ts
// Basic command
const response = await sandbox.process.executeCommand('ls -la');
console.log(response.result);

// With working directory and timeout
const response = await sandbox.process.executeCommand(
  'npm install',
  'workspace/project',  // cwd
  undefined,            // env
  30                    // timeout seconds
);

// With environment variables
const response = await sandbox.process.executeCommand(
  'echo $SECRET',
  '.',
  { SECRET: 'my-value' }
);
```

---

## 6. Session Management (Background Processes)

```ts
// Create a persistent session
await sandbox.process.createSession('my-session');

// Execute command in session
const cmd = await sandbox.process.executeSessionCommand('my-session', {
  command: 'npm run dev',
  runAsync: true,
});

// Stream logs
await sandbox.process.getSessionCommandLogs(
  'my-session',
  cmd.cmdId,
  (stdout) => console.log('[OUT]:', stdout),
  (stderr) => console.log('[ERR]:', stderr),
);

// Interactive input
await sandbox.process.sendSessionCommandInput('my-session', cmd.cmdId, 'y');

// Clean up
await sandbox.process.deleteSession('my-session');
```

---

## 7. Sandbox Lifecycle

```ts
// Stop (keeps filesystem, clears memory — only disk costs)
await sandbox.stop();

// Start again
await sandbox.start();

// Delete permanently
await sandbox.delete();

// Archive (compressed storage, cheapest)
await sandbox.archive();

// Get by ID later
const sandbox = await daytona.get('sandbox-id');

// List all
const result = await daytona.list();
result.items.forEach(s => console.log(s.id, s.state));
```

### Auto-Lifecycle

| Feature | Default | Description |
|---------|---------|-------------|
| `autoStopInterval` | 15 min | Stop after inactivity |
| `autoArchiveInterval` | 7 days | Archive after stopped |
| `autoDeleteInterval` | Never | Delete after stopped |
| `ephemeral: true` | — | Delete immediately on stop |

### What resets the auto-stop timer:
- ✅ Sandbox state changes, preview network requests, SSH connections, Toolbox API requests
- ❌ SDK requests, background scripts, long-running tasks without external interaction

---

## 8. Pricing

### Pay-as-you-go (per second billing)

| Resource | Per Hour | Per Second |
|----------|----------|------------|
| vCPU | $0.0504/h | $0.000014/s |
| Memory (GiB) | $0.0162/h | $0.0000045/s |
| Storage (GiB) | $0.000108/h | ~free |

- **$200 free compute credits** included
- **Startup program**: up to $50K free credits
- First 5 GiB storage free

### Cost Example (1 vCPU, 1GB RAM sandbox)
- 1 hour active: ~$0.067
- 100 sandboxes × 5 min each: ~$0.56

---

## 9. Daytona vs E2B Comparison

| Feature | Daytona | E2B |
|---------|---------|-----|
| Creation speed | <90ms | ~500ms |
| Stateful execution | ✅ Code interpreter | ✅ Code interpreter |
| Languages | Python, TS, JS | Python, TS, JS |
| Max resources | 4 vCPU / 8GB RAM | 2-8 vCPU |
| Filesystem persistence | ✅ Stop/start/archive | ⚠️ Limited |
| Network control | Per-sandbox firewall | Basic |
| SDKs | Python, TypeScript, Ruby, Go | Python, TypeScript |
| Pricing model | Per-second | Per-second |
| Open source | ✅ (core) | ✅ (core) |
| GPU support | ✅ Available | ❌ |
| Snapshots | ✅ Environment templates | ✅ (templates) |
| Session management | ✅ Background processes | ⚠️ Basic |

---

## 10. Snapshots (Environment Templates)

Pre-configured sandbox templates:

```ts
// Create from snapshot
const sandbox = await daytona.create({
  snapshot: 'my-python-ml-env',
  language: 'python',
});

// Create from OCI image
const sandbox = await daytona.create({
  image: Image.debianSlim('3.12'),
  resources: { cpu: 2, memory: 4, disk: 8 },
});
```

---

## Common Gotchas

1. **Auto-stop at 15 min** — long-running LLM tasks may get killed if no external interaction. Set `autoStopInterval: 0` for indefinite.
2. **Background processes don't reset timer** — a `npm run dev` running in background won't prevent auto-stop.
3. **Stopped sandboxes still cost disk** — archive or delete when not needed.
4. **Ephemeral sandboxes auto-delete** — use for one-shot code execution.
5. **Max resources are org-level limits** — contact support for higher limits.
6. **API key from app.daytona.io** — set as `DAYTONA_API_KEY` env var.
7. **Code execution language matches sandbox** — set `language: 'typescript'` for TS execution.

---

## YULA Integration Patterns

- **Sandboxed code execution** for user-submitted code in chat (skill execution, code interpreter)
- **Stateful contexts** for multi-step code workflows (data analysis, debugging sessions)
- **Ephemeral sandboxes** for one-shot tool calls (web scraping, API testing)
- **Session management** for running background services (dev servers, builds)
- **Snapshots** for pre-configured environments per skill type
- **GPU sandboxes** for ML/AI inference tasks
- **Network firewall** for secure execution of untrusted code
- **Cost**: $200 free credits covers ~3000 sandbox-hours at minimum specs
