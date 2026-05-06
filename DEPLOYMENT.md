# YULA OS Deployment Guide

> Production deployment guidance for the deterministic/provable agent OS spine.

## Deployment Principle

Do not deploy a build that can silently skip governance, signing, commit, approval, or verification paths.

The production deployment must preserve this invariant:

```text
classify -> FIDES sign -> AGIT/Convex pre-commit -> decision -> execute/await/block -> post-commit -> verify
```

## Services

| Surface | Role |
| --- | --- |
| `apps/web` | Next.js app for chat, approvals, timeline, undo, verify, and user-facing agent control. |
| `services/api` | Hono/Bun API for deterministic tool execution, guard chain, messaging, sandbox, and public audit routes. |
| `convex` | Governance store for commits, approvals, snapshots, action logs, registry, and allowlists. |
| `packages/aspendos-core` | Deterministic flow tests and reusable core primitives. |

## Required Release Verification

Run these before production deployment:

```bash
bun install
bun run check
bun run build
bun run test:core
bun run test:api
bun run test:web
bun run convex:typecheck
bun run release:ready
```

`release:ready` is the final local gate. It checks duplicate artifacts, Prisma generation, migration readiness when required, Convex query bounds, service-secret posture, critical API tests, core deterministic flow tests, API build, web build/typecheck, and Convex typecheck.

Do not bypass failing checks with `continue-on-error`.

## Required Environment

Minimum production-critical secrets:

```bash
# Convex governance
NEXT_PUBLIC_CONVEX_URL=https://<project>.convex.cloud
CONVEX_SERVICE_SECRET=<strong shared service secret>

# Bot and approval callbacks
BOT_APPROVAL_WEBHOOK_SECRET=<hmac secret>

# Database-backed paths and release migration checks
DATABASE_URL=postgresql://...

# Web app auth/session
BETTER_AUTH_SECRET=<32+ chars>
BETTER_AUTH_URL=https://yula.dev

# Billing/webhooks if billing is enabled
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AI Gateway / providers
AI_GATEWAY_API_KEY=...

# Cloud tools when enabled
STEEL_API_KEY=...
E2B_API_KEY=...
DAYTONA_API_KEY=...
```

Provider-specific messaging, rate-limit, WorkOS, Sentry, and deployment platform secrets should be configured only for the surfaces that use them. See `.env.example` for the broad local inventory.

## Pre-Deploy Checklist

- [ ] `git status --short` is clean except intended release metadata.
- [ ] `bun run release:ready` passes in an environment with release-critical secrets.
- [ ] Convex typecheck passes and query bounds guard is green.
- [ ] `CONVEX_SERVICE_SECRET` is set for API/web server-only Convex calls.
- [ ] `BOT_APPROVAL_WEBHOOK_SECRET` is set anywhere approval callbacks are accepted.
- [ ] `STRIPE_WEBHOOK_SECRET` is set if Stripe webhooks are reachable.
- [ ] `DATABASE_URL` is set for release migration readiness.
- [ ] No production path relies on local-only FIDES/AGIT/Prisma fallback behavior.
- [ ] Browser and sandbox tools require owner/session context before cloud session creation.

## Deployment Steps

1. Install dependencies:

```bash
bun install
```

2. Verify release:

```bash
bun run release:ready
```

3. Deploy web app using the configured Vercel project or equivalent platform for `apps/web`.

4. Deploy API using the configured Bun-compatible service target for `services/api`.

5. Deploy Convex functions with the matching project environment.

6. Run smoke checks against production URLs:

```bash
curl -fsS https://yula.dev/api/health
curl -fsS https://api.yula.dev/health
```

7. Verify one known governance commit hash through the public verify route after a staging or production action:

```bash
curl -fsS https://api.yula.dev/audit/verify/<commit-hash>
```

## Rollback

Rollback must consider both application deployment and governance schema compatibility.

1. Promote the previous known-good web deployment.
2. Promote or redeploy the previous known-good API deployment.
3. Do not roll back Convex schema/functions blindly if new commits were written with a newer verification payload shape.
4. Re-run health and audit verification checks.
5. If verification fails, block further agent execution until the mismatch is understood.

## Failure Policy

Treat these as deployment blockers:

- release readiness failure in CI/release mode
- missing Convex service secret
- missing webhook HMAC secret for enabled approval callbacks
- unsigned production governance commits
- unavailable audit verification service
- tool execution path that can bypass guard chain or approval gate
- cloud browser/sandbox session creation without owner context
- database migration readiness failure when `DATABASE_URL` is required

Treat these as local-development warnings only:

- missing `DATABASE_URL` during local `release:ready`
- missing `CONVEX_SERVICE_SECRET` during local-only verification
- missing Stripe webhook secret when billing webhooks are intentionally disabled locally

## Monitoring

Monitor:

- web/API health endpoints
- approval webhook signature failures
- replay/idempotency conflicts
- Convex governance commit failures
- audit verification failures
- blocked irreversible tool attempts
- browser/sandbox owner-context failures
- release gate drift between local and CI

## Current Product Frame

YULA is not deployed as "Your Universal Learning Assistant." The deployed product should be framed as a deterministic control layer for provable agent actions.
