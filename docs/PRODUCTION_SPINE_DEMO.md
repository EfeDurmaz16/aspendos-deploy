# Production Spine Demo Script

This script is the manual demo path for the deterministic/provable agent OS spine. It is intentionally short and should be run before presenting or deploying the system.

## 1. Verify Local Gates

```bash
bun run check
bun run test:core
bun run test:api
bun run test:web
bun run convex:typecheck
bun run release:ready
```

Expected local warnings:

- `DATABASE_URL` may be absent in local mode.
- `CONVEX_SERVICE_SECRET` may be absent in local mode.
- `BOT_APPROVAL_WEBHOOK_SECRET` may be absent in local mode.
- `STRIPE_WEBHOOK_SECRET` may be absent if billing webhooks are not being exercised.

CI/release mode must provide release-critical secrets and fail if they are missing.

## 2. Prove The Core Flow

Run the deterministic core test:

```bash
bun run test:core
```

The tested contract is:

```text
classify
  -> FIDES sign/verify
  -> AGIT pre-commit
  -> execute
  -> AGIT post-commit
  -> audit verify
```

## 3. Prove API Audit Verification

Run the public audit verification tests:

```bash
bun run --cwd services/api test src/routes/__tests__/public-api-verify.test.ts
```

These cover:

- valid Convex-backed commit verification
- invalid commit verification failure
- verification service unavailable failure
- public tool execution session context propagation
- missing session header rejection

## 4. Prove Approval Webhook Safety

Run approval callback tests:

```bash
bun run --cwd apps/web test test/lib/messaging/bot-approval.test.ts
```

The approval callback should reject missing, stale, malformed, tampered, replayed, and conflicting approval requests.

## 5. Prove Tool Safety

Run web and API tool safety tests:

```bash
bun run --cwd apps/web test test/lib/tools
bun run --cwd services/api test src/sandbox/__tests__/validation.test.ts src/orchestrator/__tests__/step.test.ts
```

Confirm:

- approval-only tools do not execute before approval
- irreversible tools are blocked, not approvable
- browser and sandbox tools require owner context
- dangerous commands, metadata endpoints, unsafe paths, and sensitive files are blocked
- API tool execution requires session context

## 6. Optional Live Smoke

After deploying a staging build:

```bash
curl -fsS https://<web-host>/api/health
curl -fsS https://<api-host>/health
curl -fsS https://<api-host>/audit/verify/<known-commit-hash>
```

If audit verification is unavailable, block further agent execution until the issue is understood.

## Demo Narrative

Use this explanation:

1. YULA classifies every action by reversibility.
2. It signs the authority payload before execution.
3. It writes a pending commit before external side effects.
4. It blocks, waits for approval, or executes based on governance.
5. It writes the result commit.
6. The user can inspect, verify, undo, replay, or export the action from the timeline.
