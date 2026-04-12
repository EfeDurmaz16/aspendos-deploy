---
name: foundation-worker
description: Handles infrastructure, database, auth, and build system features
---

# Foundation Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: Convex schema/mutations/queries, WorkOS AuthKit, AI SDK v6 Agent setup, build fixes, dependency management, environment configuration, package migrations (Prisma→Convex).

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`, `.factory/library/environment.md`, and `.factory/research/` files relevant to the feature (e.g., `convex.md` for Convex features, `workos-authkit.md` for auth, `ai-sdk-v6-agent.md` for agent features).

2. **Write tests first (TDD):** For every module you create, write failing tests before implementation. Place tests in `__tests__/` directories adjacent to the source or in the existing test structure.

3. **Implement:** Write clean TypeScript following existing patterns:
   - Convex functions go in `convex/` at repo root
   - API modules go in `services/api/src/`
   - Web modules go in `apps/web/src/`
   - Use existing Biome config (4-space indent, single quotes)
   - Match existing import patterns (`@/` for apps, package names for packages)

4. **Handle Prisma→Convex migration carefully:** When migrating Prisma stubs, look at the existing service's interface and preserve it. Replace `const prisma = {} as any` with Convex client calls. Import from the Convex API (`convex/_generated/api`). The web app uses `useQuery`/`useMutation` hooks; the API service uses `fetchQuery`/`fetchMutation` via a Convex client instance.

5. **Verify:**
   - Run `bun run build` — must pass
   - Run tests for affected workspaces (`cd services/api && bunx vitest run` or `cd apps/web && bunx vitest run`)
   - Run `biome check .` — must pass
   - Grep for any remaining stubs or dangling imports

6. **Commit atomically:** One commit per logical change. Conventional commit messages (`feat(convex):`, `chore(auth):`, etc.).

## Example Handoff

```json
{
  "salientSummary": "Created Convex schema with 10 tables (users, conversations, messages, memories, commits, approvals, snapshots, subscriptions, tool_allowlist, action_log), wrote CRUD mutations/queries for all tables, wired ConvexClientProvider in Next.js layout. Build passes, 42 tests added and passing.",
  "whatWasImplemented": "convex/schema.ts with 10 tables and indexes. convex/users.ts, convex/conversations.ts, convex/messages.ts etc. with create/get/list/update/delete operations. apps/web/src/app/layout.tsx updated with ConvexClientProvider.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "bun run build", "exitCode": 0, "observation": "All workspaces built successfully" },
      { "command": "cd services/api && bunx vitest run", "exitCode": 0, "observation": "42 tests passed" },
      { "command": "biome check .", "exitCode": 0, "observation": "No errors" },
      { "command": "rg 'const prisma = {} as any' services/api/src/", "exitCode": 1, "observation": "No matches — all stubs removed" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "convex/__tests__/users.test.ts", "cases": [
        { "name": "create user", "verifies": "User creation with WorkOS ID" },
        { "name": "get user by workos id", "verifies": "User lookup by external ID" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Convex schema design requires a decision on data modeling (e.g., should approvals reference commits by ID or embed?)
- A Prisma stub's interface is unclear — can't determine what Convex query/mutation should replace it
- Build fails due to issues outside the feature scope
- An existing test breaks due to the migration and the fix is non-trivial
