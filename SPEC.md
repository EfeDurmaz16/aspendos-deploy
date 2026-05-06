# YULA OS - Current Product Specification

> Version 3.0 | Current source of truth for the deterministic/provable agent OS direction.
> Historical memory/chat/import/PAC/Council material in older docs is pre-pivot unless explicitly refreshed.

## 1. Product Definition

YULA is a deterministic control and verification layer for AI agents.

It wraps agent actions with:

- deterministic tool classification
- FIDES authority signatures
- AGIT-style pre/post action commits
- governance decisions before execution
- human approval for high-risk actions
- reversibility metadata
- timeline, undo, replay, and verification surfaces

The core user promise is:

> Prove what an agent did, why it was allowed, whether it can be reversed, and how the user can verify or undo it.

## 2. Production Spine

Every production-grade action path should converge on this flow:

```text
classify tool call
  -> sign canonical authority payload with FIDES
  -> append pending AGIT-style governance commit
  -> block / await approval / execute
  -> append executed or failed result commit
  -> expose audit, verify, undo, replay, or export
```

An action is not trustworthy just because the UI displays it. It is trustworthy when the commit chain, payload hash, parent continuity, and FIDES signature can be verified.

## 3. Core Capabilities

### 3.1 Tool Governance

Tools are classified before execution:

| Class | Behavior |
| --- | --- |
| `undoable` | Execute only with rollback or snapshot metadata. |
| `cancelable_window` | Execute with a cancellation deadline and cancel route. |
| `compensatable` | Execute with a compensation tool or process. |
| `approval_only` | Create approval request and do not execute until approved. |
| `irreversible_blocked` | Block execution. Audit only. Not approvable. |

### 3.2 Authority And Provenance

- FIDES signs semantic governance payloads.
- AGIT-style commits preserve pre/post action provenance.
- Convex stores the current governance state for commits, approvals, snapshots, action logs, tool registry, and allowlists.
- Production paths must fail loud when signing, commit, or verification infrastructure is missing.

### 3.3 Approvals

Approval-only actions must:

- create a pending governance commit before any external side effect
- render an approval card with tool, args, reversibility class, risk explanation, and expiry
- verify signed approval callbacks
- reject malformed, stale, tampered, or replayed approval events
- append the executed or rejected outcome to the audit chain

### 3.4 Timeline, Verify, Undo, Replay

The app must expose:

- chronological action timeline
- per-action reversibility badge
- approval state
- commit hash and verification state
- undo or compensation action when available
- replay/audit export path for debugging and review

### 3.5 Agent Tool Safety

Any tool touching files, browsers, sandboxes, credentials, infrastructure, money, messaging, or external systems must have pre-execution safety checks.

Minimum requirements:

- dangerous command and path validation
- internal URL and metadata endpoint blocking
- owner-bound browser and sandbox sessions
- no implicit session fallback
- cost and rate caps where applicable
- deny-by-default behavior for unknown or irreversible tools

## 4. Current Repository Architecture

```text
apps/web/                  Next.js app for chat, timeline, approvals, verify, undo
services/api/              Hono/Bun API for execution, guards, sandbox, messaging, public audit
convex/                    Governance state and verification functions
packages/aspendos-core/    Deterministic action flow tests and core primitives
packages/fides-sdk/        Signing and authority primitives
packages/agit-sdk/         Commit/provenance primitives
packages/db/               Prisma compatibility package
scripts/                   Release/readiness checks
docs/                      ADRs, launch notes, and archived plans
```

## 5. Release Gates

The repo is not release-ready unless these pass or have an explicit documented blocker:

```bash
bun run check
bun run build
bun run test:core
bun run test:api
bun run test:web
bun run convex:typecheck
bun run release:ready
```

`release:ready` must not mask critical failures. Local runs may warn for missing local-only secrets, but CI/release mode must fail when release-critical secrets or migration checks are unavailable.

## 6. Non-Goals For The Current Phase

These are not the current production spine:

- consumer memory chatbot positioning
- ChatGPT/Claude import as the primary wedge
- PAC or Council as core architecture
- Qdrant-backed memory UX as the source of truth
- model comparison pages as the main product narrative
- feature expansion before deterministic action verification is reliable

Legacy code may still exist for compatibility or historical reasons. Do not use it as product direction unless it is explicitly revalidated against this spec.

## 7. Success Criteria

YULA becomes credible when a reviewer can inspect a real action and answer:

1. What did the agent intend to do?
2. Which policy classified the action?
3. Who or what authorized it?
4. Was it blocked, approved, executed, failed, reversed, or compensated?
5. Which signed commit records prove the chain?
6. Can the result be independently verified?
7. Can the user undo, cancel, replay, or export the action history?

Until those questions are answerable end to end, the correct work is foundation hardening, not new feature expansion.
