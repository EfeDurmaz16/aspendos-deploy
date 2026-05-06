# YULA OS

YULA is a deterministic control layer for AI agents. It classifies every tool call by reversibility, signs the authority behind the action, commits the action to an audit chain, and exposes approvals, undo, timeline, and verification surfaces around the result.

The current repository is being hardened around one production spine:

```text
classify tool call
  -> sign authority with FIDES
  -> create AGIT-style pre-commit
  -> block / await approval / execute
  -> append result commit
  -> audit, verify, undo, or replay from the timeline
```

## Status

This codebase is in production-readiness hardening, not feature-expansion mode.

Implemented and actively verified:

- FIDES/AGIT-style deterministic action flow in `@aspendos/core`
- Convex-backed governance tables for commits, approvals, snapshots, action logs, tool registry, and tool allowlist
- Approval cards and signed approval webhook handling
- Reversibility classes: `undoable`, `cancelable_window`, `compensatable`, `approval_only`, `irreversible_blocked`
- Timeline, verify, undo, and approval UI/API surfaces
- Fail-loud release gates for Prisma generation, Convex typecheck, core deterministic tests, web/API builds, and critical API tests
- Production guardrails against silent Prisma/FIDES/AGIT fallback success
- Pre-execution governance wrapping for the web chat stream tool path

Known hardening still in progress:

- Replace fail-closed process-local GDPR and job queue workflows with durable compliance/job storage
- Continue migrating stale memory-first docs and crawler metadata to the provable-agent positioning
- Add staging canary and live deployment smoke tests
- Close remaining Convex public-function ownership boundaries beyond approvals/allowlist

## Repository Map

```text
apps/web/                  Next.js 16 app, timeline, approval, verify, undo, chat surfaces
services/api/              Hono/Bun API, tool execution, guards, approvals, sandbox, messaging
convex/                    Governance schema and Convex functions
packages/aspendos-core/    Deterministic core flow: classify -> sign -> commit -> execute -> verify
packages/fides-sdk/        Signing and identity primitives
packages/agit-sdk/         AGIT-style commit primitives
packages/db/               Prisma package and production DB compatibility layer
services/mcp-servers/      MCP integrations
docs/                      ADRs, launch notes, readiness plans, archived strategy docs
scripts/                   Release/readiness/verification scripts
```

## Quick Start

```bash
bun install
cp .env.example .env.local
bun run check
bun run test:core
bun run test:api
bun run test:web
bun run release:ready
```

Local `release:ready` can run without `DATABASE_URL` or `CONVEX_SERVICE_SECRET`, but it will warn. CI/release mode fails when release-critical secrets are missing.

## Required Environment

Minimum local development:

```bash
NEXT_PUBLIC_CONVEX_URL="https://your-project.convex.cloud"
CONVEX_SERVICE_SECRET="local-dev-shared-secret"
BOT_APPROVAL_WEBHOOK_SECRET="local-bot-approval-secret"
```

Production also needs provider-specific secrets such as WorkOS, Stripe, AI Gateway, sandbox, messaging, and rate-limit credentials. See `.env.example`.

## Verification Commands

Use these before opening or merging PRs:

```bash
bun run check
bun run build
bun run test:core
bun run test:api
bun run test:web
bun run convex:typecheck
bun run release:ready
```

Release readiness currently checks:

- tracked duplicate source/release artifacts
- Prisma schema and generated client
- database migration readiness when `DATABASE_URL` is required
- Convex query bounds guard against unbounded `.collect()`
- process-local correctness guards for idempotency, compliance workflows, job queues, and placeholder stores
- Helm deployment drift checks
- server-only Convex secret posture
- API critical tests
- web governance, chat stream, undo, and messaging critical tests
- core deterministic action flow
- API build
- web build and typecheck
- Convex typecheck

## Architecture

YULA separates product-specific agent control from reusable trust primitives:

- YULA owns agent action UX: tool execution, approval cards, timeline, undo, verification, messaging surfaces, and release gates.
- FIDES owns authority and signature semantics.
- AGIT owns commit-style provenance semantics.
- Convex currently stores the production governance state for commits, approvals, snapshots, action logs, allowlists, and tool registry.
- Prisma remains in the repo for compatibility and database-backed paths, but production code should fail loud rather than silently returning fake empty results.

## Reversibility Model

| Class | Meaning |
| --- | --- |
| `undoable` | A snapshot or inverse operation can restore prior state. |
| `cancelable_window` | The action is queued and can be cancelled before a deadline. |
| `compensatable` | A follow-up action can compensate, such as refunding or deleting an event. |
| `approval_only` | Human approval is required before execution. |
| `irreversible_blocked` | The agent must not execute this action. It is audit-only, not approvable. |

## Development Rules

- Prefer fail-loud behavior over silent fallbacks.
- Do not add feature work until release gates stay honest.
- Keep code commits separate from docs commits.
- Every production action path should eventually prove: classification, signature, pre-commit, execution decision, result commit, and verification.
- Any tool that can touch money, secrets, infrastructure, browser targets, files, or external systems must have pre-execution guards.

## Current Product Frame

YULA is not just a memory chatbot. The durable product direction is:

> Prove what agents did, why they were allowed to do it, whether the action was reversible, and who can verify or undo it.
