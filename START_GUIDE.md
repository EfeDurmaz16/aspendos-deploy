# YULA OS Start Guide

> Current quickstart for production-readiness work. This guide follows the deterministic/provable agent OS direction, not the old memory-first chatbot setup.

## Prerequisites

- Bun
- Git
- Access to the repo environment values needed for the surface you are testing

Optional provider tools:

- Convex CLI through `bunx convex`
- Docker, only if you are validating image builds locally
- Provider keys for AI Gateway, Stripe, Steel, E2B, Daytona, messaging, or WorkOS when testing those paths

## First Setup

```bash
bun install
cp .env.example .env.local
```

Minimum local governance values:

```bash
NEXT_PUBLIC_CONVEX_URL=https://<project>.convex.cloud
CONVEX_SERVICE_SECRET=local-dev-shared-secret
BOT_APPROVAL_WEBHOOK_SECRET=local-bot-approval-secret
```

Local verification can run without `DATABASE_URL` or production webhook secrets, but release mode should provide them.

## Run The App

Web:

```bash
bun run --cwd apps/web dev
```

API:

```bash
bun run --cwd services/api dev
```

Root dev orchestration, when needed:

```bash
bun run dev
```

## Verification Commands

Run focused checks while working:

```bash
bun run check
bun run --cwd apps/web typecheck
bun run --cwd apps/web test
bun run --cwd services/api test
bunx vitest run packages/aspendos-core/src/**/*.test.ts
bun run convex:typecheck
```

Run the full release gate before merging or deploying:

```bash
bun run build
bun run release:ready
```

Expected local warnings:

- `DATABASE_URL` missing skips migration readiness locally.
- `CONVEX_SERVICE_SECRET` missing prevents local exercise of service-only Convex paths.
- `STRIPE_WEBHOOK_SECRET` missing makes Stripe webhooks reject locally.

These must not be ignored in CI/release mode.

## What To Test Manually

For production-spine work, inspect whether the changed path preserves:

```text
classify -> FIDES sign -> AGIT/Convex pre-commit -> block/approve/execute -> post-commit -> verify/undo/replay
```

Minimum smoke checks:

- tool classification returns the expected reversibility class
- `approval_only` actions do not execute before approval
- `irreversible_blocked` actions are blocked, not converted into approval requests
- browser/sandbox tools require user and session owner context
- approval callbacks reject missing, malformed, stale, tampered, or replayed requests
- audit verify returns failure when Convex verification is unavailable

## Current Product Frame

YULA is a deterministic control layer for AI agents.

Do not treat these as current setup requirements unless a specific task asks for them:

- Qdrant as required local infrastructure
- mobile or desktop app setup
- ChatGPT/Claude history import as the primary product path
- PAC/Council as the production spine
- Railway-specific deployment defaults

Use `README.md`, `SPEC.md`, `CLAUDE.md`, `DEPLOYMENT.md`, and `docs/aspendos-dev/concepts/production-spine.md` as the current source-of-truth set.
