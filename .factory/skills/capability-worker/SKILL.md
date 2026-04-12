---
name: capability-worker
description: Handles sandbox (Daytona/E2B), browser automation (Steel), computer use, and tier gating
---

# Capability Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: Daytona SDK integration, E2B sandbox fallback, Steel.dev browser automation, Anthropic Computer Use, tier gating middleware.

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`, `.factory/research/daytona.md` (for Daytona features). Read existing tier enforcement at `services/api/src/middleware/tier-enforcement.ts` and tiers config at `services/api/src/config/tiers.ts`.

2. **Write tests first (TDD):** Mock external SDK calls. Test the service interface, error handling, session management, and tier gating.

3. **Sandbox services:** Create a common interface and two implementations:
   ```typescript
   interface SandboxService {
     createSandbox(opts: SandboxOpts): Promise<Sandbox>;
     execCommand(sandboxId: string, cmd: string): Promise<ExecResult>;
     writeFile(sandboxId: string, path: string, content: string): Promise<void>;
     readFile(sandboxId: string, path: string): Promise<string>;
     destroySandbox(sandboxId: string): Promise<void>;
   }
   ```
   - `services/api/src/sandbox/daytona.ts` — primary, uses `@daytona/sdk`
   - `services/api/src/sandbox/e2b.ts` — fallback, uses `@e2b/code-interpreter`
   - `services/api/src/sandbox/index.ts` — router that tries Daytona first, falls back to E2B

4. **Browser tool:** Use `steel-sdk` at `services/api/src/tools/browser.ts`. Export: navigate, screenshot, click, type, extract. Register in tool registry with `compensatable` class.

5. **Computer use:** At `services/api/src/tools/computer-use.ts`. Uses Daytona desktop sandbox for isolation. Implements Anthropic Computer Use API pattern (screenshot → coordinate interaction).

6. **Tier gating:** Create `services/api/src/middleware/tier-gate.ts` that checks user tier and returns 403 with upgrade prompt for Free tier users accessing Pro+ features.

7. **Handle missing credentials gracefully:** All capability services must check for env vars and return clear "not configured" errors if API keys are missing. Never crash on missing credentials.

8. **Verify:**
   - All tests pass
   - `bun run build` passes
   - `biome check .` passes

## Example Handoff

```json
{
  "salientSummary": "Built Daytona sandbox service with createSandbox/execCommand/writeFile/readFile/destroySandbox, E2B fallback with same interface, sandbox router with Daytona-first fallback logic, and tier-gate middleware. 22 tests passing.",
  "whatWasImplemented": "services/api/src/sandbox/daytona.ts, services/api/src/sandbox/e2b.ts, services/api/src/sandbox/index.ts (router), services/api/src/middleware/tier-gate.ts. All sandbox services implement common SandboxService interface.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd services/api && bunx vitest run src/sandbox/ src/middleware/tier-gate", "exitCode": 0, "observation": "22 tests passed" },
      { "command": "bun run build", "exitCode": 0, "observation": "Clean build" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "services/api/src/sandbox/__tests__/daytona.test.ts", "cases": [
        { "name": "createSandbox returns sandbox with ID", "verifies": "Sandbox creation" },
        { "name": "auto-cleanup after TTL", "verifies": "Session management" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- SDK has breaking API changes from documented version
- Tier configuration needs a decision (what features map to which tier)
- External service requires account setup not yet done
