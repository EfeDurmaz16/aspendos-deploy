# YULA OS - Agent Instructions

> Current repository guidance for Claude/Codex-style agents.
> Treat `README.md`, `docs/aspendos-dev/concepts/production-spine.md`, and this file as the current source of truth.

## Product Frame

YULA is a deterministic control layer for AI agents. It is not a memory-first chatbot spec.

The production spine is:

```text
classify tool call
  -> sign authority with FIDES
  -> create AGIT-style pre-commit
  -> block / await approval / execute
  -> append result commit
  -> expose audit, verify, undo, or replay from the timeline
```

The core product claim is: prove what an agent did, why it was allowed, whether it was reversible, and how a user or auditor can verify it.

## Current Repository Map

```text
apps/web/                  Next.js 16 app: chat, approvals, timeline, verify, undo, tool UI
services/api/              Hono/Bun API: guards, tool execution, approvals, sandbox, messaging
convex/                    Governance state: commits, approvals, snapshots, logs, tool registry
packages/aspendos-core/    Deterministic action flow and core verification tests
packages/fides-sdk/        Authority and signing primitives
packages/agit-sdk/         Commit-style provenance primitives
packages/db/               Prisma compatibility package
services/mcp-servers/      MCP integrations
scripts/                   Release and verification gates
docs/                      ADRs, launch notes, current and archived planning docs
```

## Engineering Priorities

Work on foundations before features:

- Honest CI and release gates.
- Fail-loud production paths.
- No silent fallback hashes or fake success states.
- Pre-execution tool governance.
- Signed FIDES authority before production governance commits.
- AGIT-style pre/post commit continuity.
- Convex access boundaries with explicit service-only secrets where needed.
- Reversibility, approvals, timeline, undo, replay, and verify surfaces.
- Messaging/webhook idempotency and signature verification.
- Browser/sandbox/tool safety with ownership context, allowlists, and internal URL blocking.

## Hard Rules

- Run `git status` before edits.
- Do not overwrite unrelated uncommitted work.
- Use small atomic commits.
- Keep docs commits separate from code commits.
- Prefer fail-loud behavior over silent fallbacks.
- Do not hide failures with `continue-on-error`.
- Do not claim completion without fresh verification output.
- Any tool touching money, secrets, infrastructure, browser targets, files, or external systems needs pre-execution guards.

## Required Verification

Use the strongest practical checks for the touched area. Before release or merge, run:

```bash
bun run check
bun run build
bun run test:core
bun run test:api
bun run test:web
bun run convex:typecheck
bun run release:ready
```

Useful narrower checks:

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run --cwd services/api test
bunx vitest run packages/aspendos-core/src/**/*.test.ts
```

Local `release:ready` may warn when `DATABASE_URL`, `CONVEX_SERVICE_SECRET`, or production webhook secrets are unset. CI/release mode must fail on release-critical missing secrets.

## Current Architecture Notes

- YULA owns product-specific action control: tools, approvals, timeline, undo, replay, verify, messaging, and release gates.
- FIDES owns authority and signature semantics.
- AGIT owns commit-style provenance semantics.
- Convex stores current governance state for commits, approvals, snapshots, action logs, allowlists, and registry data.
- Prisma remains for compatibility and database-backed paths. Production code must not silently return fake empty results when database paths are unavailable.
- Reversibility classes are `undoable`, `cancelable_window`, `compensatable`, `approval_only`, and `irreversible_blocked`.
- `irreversible_blocked` actions are blocked and audited, not approval requests.

## What Not To Reintroduce

Do not steer new work back to the pre-pivot consumer chatbot architecture:

- Do not describe YULA as "Your Universal Learning Assistant."
- Do not treat Qdrant, PAC, Council, import flows, or memory UX as the current product spine.
- Do not add new feature work before the production spine remains verified.
- Do not use silent FIDES/AGIT/Prisma fallbacks in production paths.
- Do not wire AI SDK tools so governance happens only after execution.
- Do not allow stateful cloud browser or sandbox sessions without execution owner context.

## Documentation Hygiene

Some legacy docs still describe old memory/chat/GTM directions. If a doc conflicts with `README.md`, `docs/aspendos-dev/concepts/production-spine.md`, or this file, treat it as stale until refreshed or explicitly marked archived.
