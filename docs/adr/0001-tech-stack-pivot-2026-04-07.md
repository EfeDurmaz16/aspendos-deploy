# ADR 0001 — Tech Stack Pivot for YULA v1 (Manus Alternative)

> **Date**: 2026-04-07
> **Status**: Accepted
> **Decision-makers**: Efe Baran Durmaz + collaboration session
> **Supersedes**: prior `services/agents` (Python LangGraph), Postgres+Prisma+Neon, Better Auth, OpenMemory+Qdrant, Inngest

## Context

YULA's brainstorming session on 2026-04-07 locked a strategic pivot to "trustworthy general AI agent — Manus alternative" (see `docs/superpowers/specs/2026-04-07-yula-manus-alternative-design.md`). Once positioning was locked, the existing tech stack was re-evaluated under three constraints:

1. **All TypeScript** — drop the Python `services/agents` LangGraph layer
2. **Profitability** — gross margin 75%+ at 100-user scale, no scaling cliffs
3. **Speed to launch** — 15-day total sprint (5 days stack migration + 10 days v1 build)

This ADR records every stack decision made in that session, with the rejected alternatives and the rationale.

## Decisions

### D1. Database — Convex (Pure)

**Choice**: Convex as the single primary database. TypeScript-first schema (`defineSchema`/`defineTable`), real-time WebSocket subscriptions on every query, ACID transactions, native vector search (cosine, 2-4096 dims), FSL self-host escape hatch.

**Replaces**: PostgreSQL + Prisma + Neon.

**Rejected alternatives**:
- **Hybrid Postgres+Convex** — extra wiring overhead, two backups, two failure modes; saves nothing meaningful at YULA's scale
- **Stay on Postgres+Prisma** — loses TS-native real-time dashboard reactivity that is YULA's core demo asset

**AGIT integration approach**: Convex `commits` table with denormalized parent-chain array. AGIT v1 only needs linear commit history + revert (not deep DAG ancestry walks); Convex's lack of recursive CTEs is acceptable. If v2 needs branching, escape to Postgres adapter.

**Cost**: Pro $25/dev/mo + usage. SOC2 Type II + HIPAA BAA + GDPR included free on paid plans.

**References**:
- https://www.convex.dev/pricing
- https://news.convex.dev/self-hosting/
- https://docs.convex.dev/search/vector-search

### D2. Auth — WorkOS AuthKit

**Choice**: WorkOS AuthKit. Free up to 1M MAU. SOC2/HIPAA/GDPR/CCPA included with no plan gating. Native Next.js 16 middleware (`authkitMiddleware`). $125/mo per SAML/SSO connection only when enterprise customers request it.

**Replaces**: Better Auth (rejected by user — too much effort across multiple prior projects).

**Rejected alternatives**:
- **Convex Auth** — still beta in April 2026, no SAML/SCIM, official Convex docs explicitly recommend WorkOS or Clerk for production B2B
- **Clerk** — Feb 2026 repricing put SOC2 docs behind $250/mo Business tier, metered SAML at $75/mo per connection, $1/MAO for organizations beyond first 100. Punishes the exact scaling path YULA wants.
- **Firebase Auth / Identity Platform** — dated DX, awkward Next.js App Router story, Google steers new B2B customers to Identity Platform tier
- **Supabase Auth** — disqualified standalone (auth tables expect Supabase Postgres)
- **Better Auth** — rejected by user (existing pain across multiple projects)

**Persona fit**: WorkOS is the only option that maps cleanly to all four YULA personas (solo founder $0 → compliance dev $0 → SMB ops $0 → enterprise whale $125/SSO).

**References**:
- https://workos.com/pricing
- https://workos.com/docs/authkit/nextjs
- https://workos.com/blog/convex-typescript-workos-auth

### D3. Tool loop — Vercel AI SDK v6 `Agent`

**Choice**: Vercel AI SDK v6 `Agent` abstraction. Native `stopWhen`, `prepareStep`, `onStepFinish` callbacks provide exact injection points for FIDES sign + AGIT commit per step. `fullStream` preserves step boundaries for messaging surface streaming via Vercel Chat SDK.

**Replaces**: LangGraph (Python `services/agents` directory deleted).

**Rejected alternatives**:
- **Mastra** — 1.0 GA but workflows not natively crash-durable; Convex team had to build a Convex-Mastra adapter for that gap
- **Custom loop on AI SDK primitives** — re-builds Inngest poorly; loses the standard `Agent` shape

**Reason**: AI SDK v6 `Agent` is the only TypeScript abstraction that ships the exact middleware hooks YULA needs and is production-stable as of April 2026.

**References**:
- https://ai-sdk.dev/docs/agents/loop-control
- https://vercel.com/blog/ai-sdk-6

### D4. Durable execution — Convex Workflow + Durable Agents components

**Choice**: Convex's built-in Workflow component (durable long-running execution, retries, pause/resume) and Durable Agents component (tool-calling agents without time limits, async). Both ship in the Convex SDK and run inside the Convex deployment.

**Replaces**: Inngest (initially proposed and then rejected after the user pointed out the redundancy).

**Rejected alternatives**:
- **Inngest** — extra vendor, extra billing, $75+/mo at scale; redundant once Convex is locked
- **Vercel Workflow DevKit (WDK)** — still public beta in April 2026, advance notice required when GA pricing lands

**Reason**: Single vendor, single billing surface, single mental model. Convex's components compose naturally with AI SDK v6 (wrap an `Agent.stream()` call inside a Convex workflow `step`).

**References**:
- https://www.convex.dev/components/durable-agents
- https://useworkflow.dev/

### D5. Memory layer — SuperMemory hosted Pro for v1, re-evaluate at 200-user cliff

**Choice**: SuperMemory Pro tier ($19/mo, 1M tokens, 100k queries) for v1 launch. Existing wiring in `services/api/src/services/{supermemory,memory-router}.service.ts` is preserved. The `withSupermemory()` AI SDK middleware in `services/api/src/routes/chat.ts:417,689` and `sm.profile()` in `services/api/src/bot/prompt.ts:41` remain critical and have no equivalents in alternatives.

**Replaces nothing** (SuperMemory was already the primary memory backend in YULA's `MEMORY_BACKEND=supermemory` configuration).

**Drops**: OpenMemory + Qdrant (legacy backend, `MEMORY_BACKEND=openmemory`). The `openmemory-js` npm dependency is 15 months stale (last commit Jan 2025); the dual-mode "failover" story is fake because OpenMemory lacks four critical SuperMemory features (`withSupermemory`, `sm.profile`, `sm.conversations.create`, `sm.memories.forget`). ~852 LOC of dead code removed in Phase A.

**Re-evaluation trigger**: 200-user mark, when SuperMemory's Pro tier ($19) is replaced by Scale tier ($399) cliff. At that point, evaluate two paths in parallel:
1. **Fork SuperMemory from MIT source** (https://github.com/supermemoryai/supermemory) — legally allowed by MIT but officially "enterprise-only" per SuperMemory's self-hosting docs
2. **Migrate to Mem0 self-hosted** ($30/mo Hetzner VPS, 23k+ stars, MIT, has profiles/graph/extraction)

The decision is deferred to month 3 when usage data is available.

**References**:
- https://supermemory.ai/pricing
- https://github.com/supermemoryai/supermemory (MIT)
- https://supermemory.ai/docs/deployment/self-hosting (enterprise-gated)
- https://github.com/mem0ai/mem0

### D6. LLM routing — Groq router + Haiku routine + Sonnet tool use + Council parallel

**Choice**: Multi-provider routing through Vercel AI Gateway:

| Use case | Provider | Model | Why |
|---|---|---|---|
| Router decisions | Groq | Llama 4 / Mixtral | Sub-100ms inference, ~$0.10/M, already YULA's router pattern |
| Routine chat | Anthropic | Haiku 4.5 | $0.25/$1.25 per M — 12x cheaper than Sonnet |
| Tool use loop | Anthropic | Sonnet 4.6 + prompt caching (90% discount) | Production reliability, function calling |
| Council mode | Anthropic + OpenAI + Google + Groq | Sonnet 4.6 + GPT-5 + Gemini 2.5 Pro + Llama 4 | Multi-perspective, Pro+ tier only |
| Computer Use | Anthropic | Sonnet 4.6 (computer-use-2025-11-24 beta) | Only viable provider in April 2026 |
| Heavy reasoning | Anthropic | Opus 4.6 | Team tier only |
| Embeddings | OpenAI or Voyage | text-embedding-3-large or voyage-3 | $0.13/M |

**Cost target**: ~$1.50-2.00 per active user per month for LLM (down from ~$4.50 with all-Sonnet baseline).

**References**:
- https://vercel.com/docs/ai-gateway
- https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- https://groq.com/pricing

### D7. Framework — Next.js 16.2 (upgrade from 15)

**Choice**: Upgrade `apps/web` from Next.js 15.3.3 to Next.js 16.2.x. GA October 21, 2025. Turbopack is the default builder. Cache Components stable (`use cache` directive, `cacheLife`, `cacheTag`, `updateTag`). React Compiler stable opt-in.

**Migration**: `npx @next/codemod@canary upgrade latest` handles middleware → proxy rename, async params/cookies/headers, ESLint flat config. Manual fixes for Cache Components opt-in, `revalidateTag` second arg, parallel route `default.tsx` files, `images.domains` → `remotePatterns`.

**Effort**: 0.5–1.5 days base, 2–4 days if Cache Components are enabled. Phase A1 of stack migration sprint.

**References**:
- https://nextjs.org/blog/next-16
- https://nextjs.org/docs/app/guides/upgrading/version-16

### D8. UI — shadcn/ui + Radix + Phosphor + Manrope + Tailwind 4

**Choice**:
- **shadcn/ui** — already in CLAUDE.md, fully compatible with Next 16 + React 19 + Tailwind 4
- **Radix UI** — what shadcn/ui is built on, primitive layer
- **Phosphor icons** — open source MIT, 9k icons across 6 weights, $0
- **Manrope** — single font for the whole app via `next/font/google`
- **Tailwind CSS 4** — already in YULA stack

**Rejected**:
- **Hugeicons Pro** — paid tier $39+/mo, doesn't fit YULA's $25-180/mo customer pricing economics

**References**:
- https://ui.shadcn.com/docs/tailwind-v4
- https://ui.shadcn.com/docs/react-19
- https://phosphoricons.com/

### D9. Sandbox + Browser + Computer Use — E2B + Steel + Anthropic

These remain locked from the original spec (see §6 Capabilities Stack). No change in this ADR.

### D10. Pricing — $25 / $60 / $180 with BYOK option

**Choice**:
- Personal $25/mo (was $20)
- Pro $60/mo (was $50)
- Pro BYOK $30/mo (new — bring your own Anthropic/OpenAI key)
- Team $180/seat/mo (was $150)
- Team BYOK $100/seat/mo (new)

**Rationale**: $20/$50/$150 was anchored to ChatGPT Plus baseline, but YULA delivers more (8 messaging surfaces, undo, audit, computer use). 25% revenue lift moves gross margin from ~60% to ~80% at the same cost base. BYOK opens a high-margin tier for power users who already have provider keys.

### D11. Sprint timeline — 15 days (5 Phase A + 10 Phase B)

**Choice**: Stack migration ships before v1 build sprint, not in parallel. Phase A is 5 days of focused refactoring (Next 16 codemod, Convex setup, WorkOS migration, drop LangGraph + OpenMemory, AI SDK v6 + Convex Workflow wiring). Phase B is the existing 10-day v1 sprint with code examples adapted to the new stack.

**Total elapsed**: 15 working days from Day 0 to launch-ready v1.

## Consequences

### Positive
- Tek dil (TypeScript), tek DB (Convex), tek auth (WorkOS), tek orchestration runtime (Convex Workflow)
- Real-time audit log dashboard "ücretsiz" via Convex subscriptions — YULA'nın killer demo'su Convex'in defaultu
- HIPAA BAA + SOC2 + GDPR Convex + WorkOS combo'sundan dahil — compliance dev customer persona için enterprise-ready Day 1
- Vercel ekosistemi içinde maximum compatibility (AI SDK v6, AI Gateway, Chat SDK, Workflow DevKit ileride)
- Phosphor + Manrope + shadcn = polished consumer brand
- Cost optimization (Groq routing + Haiku + caching) targets %80 gross margin

### Negative / Risks
- Convex vendor lock-in (mitigated by FSL self-host option, but RPC model migration off is 4-8 weeks)
- AGIT git-DAG mismatch — v1 only supports linear commits, branching deferred to v2
- Convex Workflow component still maturing — depend on Convex roadmap for advanced HITL patterns
- SuperMemory hosted dependency — Pro tier $19 caps at 1M tokens, Scale tier $399 cliff at 80M tokens
- Phase A adds 5 days to launch timeline (15 days total instead of 10)

### Migration cost
- Delete `services/agents/` (Python LangGraph)
- Delete `services/api/src/services/openmemory.service.ts` (~452 LOC)
- Delete `services/api/src/types/openmemory-js.d.ts`
- Simplify `services/api/src/services/memory-router.service.ts` (399 → ~200 LOC)
- Delete `services/api/src/auth/*` Better Auth wiring, replace with `authkitProvider` + `authkitMiddleware`
- Delete `packages/db/prisma/*` Prisma schema
- Migrate `services/api/src/audit/agit.ts` Postgres adapter to Convex commits table
- Run `npx @next/codemod@canary upgrade latest` in `apps/web/`
- Remove `openmemory-js`, `@prisma/client`, `prisma`, `better-auth`, `qdrant-client` from package.json
- Add `convex`, `@workos-inc/authkit-nextjs`, `@phosphor-icons/react`, `manrope` (via next/font)

## Status

Accepted 2026-04-07. Implementation begins as Phase A of the 15-day sprint plan documented in `docs/superpowers/plans/2026-04-07-yula-v0-stack-migration.md`.
