---
name: tool-worker
description: Handles reference tool implementations with full reversibility lifecycle
---

# Tool Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: individual tool implementations (file.write, email.send, calendar.create_event, db.migrate, stripe.charge), tool-specific reverse handlers, and tool-specific tests.

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`. Read the tool registry at `services/api/src/tools/registry.ts` and step middleware at `services/api/src/orchestrator/step.ts` to understand the integration points.

2. **TDD — tests FIRST:** Write the test file BEFORE the implementation file. Each tool needs tests for:
   - `classify()` returns correct `ReversibilityClass` and `ReversibilityMetadata`
   - `execute()` performs the expected action
   - `reverse()` performs the expected undo/cancel/compensate (where applicable)
   - Edge cases specific to the tool's reversibility class
   - Integration through `runToolStep` middleware

3. **Implement the tool:** Each tool file at `services/api/src/tools/{tool-name}.ts` must export:
   ```typescript
   export const toolName = {
     classify(args: ToolArgs): ReversibilityMetadata { ... },
     execute(args: ToolArgs, ctx: ToolContext): Promise<ToolResult> { ... },
     reverse?(actionId: string, ctx: ToolContext): Promise<ReverseResult> { ... },
   };
   ```

4. **Register in tool registry:** Import and register the tool in `services/api/src/tools/registry.ts`.

5. **Class-specific behavior:**
   - **undoable (file.write):** Snapshot before write, restore on reverse
   - **cancelable_window (email.send):** Enqueue with 30s delay, cancel within window
   - **compensatable (calendar.create_event):** Execute immediately, compensate by DELETE
   - **approval_only (db.migrate):** Block until approval, then execute
   - **irreversible_blocked (stripe.charge):** Refuse outright, never call external API

6. **Mock external services:** Use mock/stub for external APIs (email service, calendar API, Stripe). Structure mocks so real services can be swapped in later.

7. **Verify:**
   - All tool tests pass
   - `bun run build` passes
   - `biome check .` passes

## Example Handoff

```json
{
  "salientSummary": "Implemented file.write tool with undoable reversibility — snapshot before write, restore on reverse. 6 tests written first (TDD), all passing. Tool registered in registry with classify() returning undoable.",
  "whatWasImplemented": "services/api/src/tools/file-write.ts with classify(), execute(), reverse(). services/api/src/tools/__tests__/file-write.test.ts with 6 test cases.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd services/api && bunx vitest run src/tools/__tests__/file-write.test.ts", "exitCode": 0, "observation": "6 tests passed" },
      { "command": "bun run build", "exitCode": 0, "observation": "Clean build" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "services/api/src/tools/__tests__/file-write.test.ts", "cases": [
        { "name": "classify returns undoable", "verifies": "Correct reversibility class" },
        { "name": "execute writes file and stores snapshot", "verifies": "Write + snapshot creation" },
        { "name": "reverse restores from snapshot", "verifies": "Undo restores original content" },
        { "name": "reverse fails if no snapshot exists", "verifies": "Error handling for missing snapshot" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Tool registry or step middleware not yet implemented (precondition failure)
- External API behavior differs from expected (e.g., email service doesn't support delayed send)
- Reversibility class assignment is ambiguous for the tool's behavior
