---
name: core-worker
description: Handles FIDES/AGIT integration, reversibility model, tool registry, and step middleware
---

# Core Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: FIDES SDK integration, AGIT SDK integration, ReversibilityClass types, tool registry, step middleware, guard chain integration, dangerous tools denylist.

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`, `.factory/research/ai-sdk-v6-agent.md`. Read the FIDES SDK source at `~/fides/packages/sdk/src/` and AGIT SDK source at `~/agit/ts-sdk/src/` to understand their APIs. Key exports:
   - FIDES: `Fides`, `signRequest`, `verifyRequest`, `generateKeyPair`, `generateDID`, `AgitCommitSigner`
   - AGIT: `AgitClient`, `AgitFidesClient`, `Commit`, `AgentState`, `ActionType`

2. **Write tests first (TDD):** For every module, write failing tests before implementation. FIDES/AGIT modules should be testable with mock keys (no external services needed). Use `generateKeyPair()` to create test keys.

3. **Implement types precisely:** The reversibility model types must be exact:
   ```typescript
   type ReversibilityClass = 'undoable' | 'cancelable_window' | 'compensatable' | 'approval_only' | 'irreversible_blocked';
   ```
   Do not deviate from this taxonomy. The spec is very specific about these 5 classes.

4. **Tool registry pattern:** Create a proper registry at `services/api/src/tools/registry.ts` where each tool must have:
   - `classify(args)` → `ReversibilityMetadata`
   - `execute(args)` → `Promise<result>`
   - `reverse?(args)` → `Promise<result>` (optional)
   Unknown tools MUST default to `irreversible_blocked` (fail-closed).

5. **Step middleware:** The `runToolStep()` function at `services/api/src/orchestrator/step.ts` enforces:
   classify → FIDES sign → AGIT pre-commit → execute → AGIT post-commit
   If any pre-execution step fails, the tool MUST NOT execute.

6. **Verify:**
   - All new tests pass (`cd services/api && bunx vitest run`)
   - `bun run build` passes
   - `biome check .` passes
   - FIDES signing tests pass without external credentials
   - AGIT commit tests pass without external database

7. **Commit atomically:** Conventional commits (`feat(governance):`, `feat(reversibility):`, etc.).

## Example Handoff

```json
{
  "salientSummary": "Linked @fides/sdk and @agit/sdk as local deps, created governance/fides.ts with signToolCall/counterSignWithUser, created audit/agit.ts with commitAction/revertAction via AgitFidesClient, created reversibility types, built tool registry at tools/registry.ts, and step middleware at orchestrator/step.ts. All 28 tests passing, build clean.",
  "whatWasImplemented": "services/api/src/governance/fides.ts — singleton Fides instance with signToolCall() and counterSignWithUser(). services/api/src/audit/agit.ts — AgitFidesClient wrapper with commitAction() (pre/post commit), revertAction(), per-user branches. services/api/src/reversibility/types.ts — ReversibilityClass, ReversibilityMetadata, RollbackStrategy, BADGE_COLORS. services/api/src/tools/registry.ts — ToolRegistry with classify/execute/reverse, fail-closed default. services/api/src/orchestrator/step.ts — runToolStep enforcing sign→commit→execute→commit chain.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd services/api && bunx vitest run", "exitCode": 0, "observation": "28 new tests + existing tests all passing" },
      { "command": "bun run build", "exitCode": 0, "observation": "Build clean" },
      { "command": "biome check .", "exitCode": 0, "observation": "No errors" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "services/api/src/governance/__tests__/fides.test.ts", "cases": [
        { "name": "signToolCall produces verifiable record", "verifies": "Ed25519 signing with mock keys" },
        { "name": "counterSignWithUser appends user signature", "verifies": "Dual signature flow" }
      ]},
      { "file": "services/api/src/orchestrator/__tests__/step.test.ts", "cases": [
        { "name": "runToolStep enforces full invariant chain", "verifies": "classify→sign→pre-commit→execute→post-commit order" },
        { "name": "approval_only pauses execution", "verifies": "Creates approval, no execute" },
        { "name": "irreversible_blocked refuses", "verifies": "No execute, no approval" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- FIDES SDK has API changes from what's documented in `.factory/research/`
- AGIT SDK's AgitFidesClient doesn't support the expected operations
- Linking local SDKs causes workspace resolution conflicts
- Guard chain integration reveals architectural incompatibilities
