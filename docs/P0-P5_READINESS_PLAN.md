# P0-P5 Readiness Plan

This plan is scoped to the three critical capabilities:

1. Shared memory across all model paths
2. Proactive Agentic Callback (PAC / scheduler)
3. Council multi-model fanout

## P0 - Critical Integrity

- Goal: prevent corrupt runtime/build artifacts and broken route generation.
- Done:
  - Removed accidental duplicate app file (`apps/web/src/app/layout 2.tsx`) that produced invalid `.next` output.
  - Migrated deprecated Sentry client setup to `apps/web/instrumentation-client.ts`.

## P1 - Shared Memory Baseline

- Goal: all model paths consume the same memory context.
- Done:
  - Unified memory context for multi-model chat path (`/api/chat/:id/multi`).
  - Council persona streaming now receives user-scoped memory context.
  - Import pipeline writes canonical backend import outputs and feeds memory bridge.

## P2 - PAC Functional Reliability

- Goal: reminders work through API contract end-to-end.
- Done:
  - Added direct reminder creation endpoint and aligned web payload contract.
  - PAC timeline switched from demo/local data to backend reminders API.
  - Existing PAC route tests cover detect/create/list/complete/dismiss/snooze flows.

## P3 - Council Runtime Performance

- Goal: reduce response blocking in multi-persona stream.
- Done:
  - Replaced head-of-line blocking chunk strategy with race-based in-flight scheduling.
  - Maintained persona-parallel behavior and token-budget gates.

## P4 - Critical Readiness Observability

- Goal: explicit readiness signal for the three critical capabilities.
- Done:
  - Added `GET /api/system/critical-readiness`.
  - Added checks for:
    - Shared memory (DB + memory probe + vector fallback state)
    - PAC (scheduled task table + parser probe + cron-secret posture)
    - Council (persona/model fanout config + session table access)
  - Added unit tests in `services/api/src/lib/__tests__/critical-readiness.test.ts`.

## P5 - Release Gate Automation

- Goal: block release on regressions in critical capabilities.
- Done:
  - Added `scripts/check_release_readiness.sh`.
  - Gate includes:
    - duplicate source-file detection in web app
    - Sentry instrumentation file convention checks
    - API critical tests (Council/PAC/Memory validation/Critical readiness)
    - API build
    - optional strict web typecheck (`STRICT_WEB_TYPECHECK=1`)
    - migration readiness check (`scripts/pre-deploy-check.sh`) when `DATABASE_URL` is present

## Runbook

```bash
bash scripts/check_release_readiness.sh
```

Use `GET /api/system/critical-readiness` before release and fail deployment if:

- `status === "blocked"` (hard fail)
- `productionReady === false` (manual review required)
