# Production spine for provable agent actions

This document records the current production contract for deterministic, provable Yula/Aspendos agent actions. It is intentionally scoped to the code paths that are already wired and verified in this repository.

## Core invariant

An action is not considered trustworthy unless it can be traced through this flow:

```text
classify tool
  -> sign canonical FIDES governance payload
  -> append pending governance commit
  -> execute or await approval
  -> append executed/failed governance commit
  -> verify commit hash, payload hash, parent continuity, and FIDES signature
```

The public claim is not "the UI says this happened." The claim is "the audit route can verify the signed commit record."

## Canonical payloads

Convex commit hashes and FIDES signatures intentionally cover different parts of the action:

- `payload_hash` covers the full deterministic commit payload, including `parent_hash`.
- external FIDES signatures cover the semantic governance payload:
  - `tool_name`
  - canonical `args`
  - `reversibility_class`
  - `status`
  - optional canonical `result`

The parent hash is excluded from the FIDES signature because API/web callers do not own chain placement; Convex owns parent selection when appending the commit. The final commit hash still binds the commit to its parent.

## FIDES policy

Production paths must provide external FIDES authority:

- API orchestrator calls `FidesService.signGovernanceCommit()` for pre and post Convex commits.
- Web undo, chat stream tool governance, and step middleware call `signGovernanceCommit()` before direct Convex `signAndCommit` usage.
- Convex `verifyCommit` verifies external FIDES signatures cryptographically via Ed25519 DID parsing.

Convex `signAndCommit` rejects unsigned commits. Direct unsigned Convex reversal is disabled; callers must use a signed undo path.

## Current verified paths

The following commands are expected to pass before release:

```bash
bun run check
bun run typecheck:web
bun run typecheck:api
bun run convex:typecheck
bun run --cwd services/api test
bun run --cwd apps/web test
bun run release:ready
```

`release:ready` currently runs toolchain checks, duplicate-artifact checks, Prisma generation, migration readiness when required, Convex query bounds, process-local state posture checks, Helm drift checks, critical API/web tests, core deterministic flow tests, API build, web build/typecheck, and Convex typecheck. In local development, migration readiness is skipped when `DATABASE_URL` is unset; CI/release environments should provide `DATABASE_URL`.

## Fail-loud behavior

These cases must fail instead of pretending to be verified:

- missing external FIDES signature on production API governance commits
- unsigned direct Convex governance commits
- missing Convex governance in production
- unavailable Convex verification service on `/audit/verify/:hash`
- malformed upstream verification response in web `/api/verify/[hash]`
- direct Convex reversal without a signed API undo path
- process-local idempotency, compliance workflow, or job queue state in production without an explicit durable backend

## Known caveats

- Existing database records written before external FIDES verification may fail stricter verification if they used the old semantic payload shape.
- Local release readiness cannot prove migration safety unless `DATABASE_URL` is set.
- GDPR export/deletion and background job workflows currently fail closed in production until durable compliance/job storage is wired.
