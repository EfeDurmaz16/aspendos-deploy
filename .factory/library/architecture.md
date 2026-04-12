# YULA OS — System Architecture

## System Overview

YULA OS is a consumer AI chat platform built as a TypeScript monorepo. The system combines a Next.js web application with a Hono API server, backed by Convex as the real-time database and powered by Vercel AI SDK v6 for agent orchestration.

```
┌─────────────────────────────────────────────────────────────┐
│                        Monorepo                             │
│                                                             │
│  apps/web          → Next.js 16 web application             │
│  services/api      → Hono API server (Bun runtime)          │
│  packages/sdk      → @yula/sdk shared client library        │
│  packages/fides-sdk → @fides/sdk cryptographic signing      │
│  packages/agit-sdk  → @agit/sdk audit commit log            │
│  convex/           → Convex schema, mutations, queries      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User ──► Surface (Web / Slack / Telegram / Discord / WhatsApp)
           │
           ▼
      Agent Orchestrator (AI SDK v6 ToolLoopAgent)
           │
           ├──► Guard Chain (5 guards: ToolLoop, DangerousCommand,
           │                 BlastRadius, RateLimit, Policy)
           │
           ├──► Tool Registry  ──► classify() → ReversibilityMetadata
           │
           ├──► FIDES Signing  ──► signToolCall() → Ed25519 signature
           │
           ├──► AGIT Commit    ──► pre-commit → execute → post-commit
           │
           ├──► Tool Execution (memory, file, email, calendar, sandbox, browser)
           │
           └──► Convex Database (real-time persistence + subscriptions)
```

## Key Components

### Agent Orchestrator
- Built on Vercel AI SDK v6 `ToolLoopAgent`
- Multi-step tool calling with configurable `maxSteps`
- `prepareStep` hook: wires guard chain + FIDES signing before execution
- `onStepFinish` hook: AGIT post-commit after execution
- Multi-provider routing: Anthropic, OpenAI, Google, Groq

### Guard Chain
Five sequential guards evaluate every tool call before execution:
1. **ToolLoopGuard** — detects infinite tool-call loops
2. **DangerousCommandGuard** — blocks destructive patterns (rm -rf, DROP TABLE, etc.)
3. **BlastRadiusGuard** — flags high-impact operations for approval
4. **RateLimitGuard** — enforces per-user rate limits
5. **PolicyGuard** — checks custom organization policies

### FIDES Signing
Cryptographic accountability layer using Ed25519 signatures:
- Every tool call is signed before execution (RFC 9421 digest)
- Agent identity via `did:key:z6Mk...` DIDs
- User counter-signatures for approved actions
- Public verification endpoint at `/api/verify/:hash`

### AGIT Commit Log
Git-inspired audit trail for all agent actions:
- **Pre-commit**: intent recorded before tool execution
- **Post-commit**: result + duration recorded after execution
- Per-user branches (`user:{userId}`) for isolation
- Revert capability for undoable/compensatable actions
- Backed by Convex mutations (not Prisma)

### Reversibility Model
Every tool is classified into one of 5 reversibility classes:
- `undoable` — can be fully reversed (e.g., file.write with snapshot)
- `cancelable_window` — reversible within a time window (e.g., email.send, 30s)
- `compensatable` — reversible via compensating action (e.g., calendar.create_event → DELETE)
- `approval_only` — requires human approval before execution (e.g., db.migrate)
- `irreversible_blocked` — refused outright, never executed (e.g., stripe.charge)

### Tool Registry
Central registry at `services/api/src/tools/registry.ts`:
- Every tool must implement `classify()` → `ReversibilityMetadata`
- Optional `reverse()` for undoable/compensatable tools
- Unknown tools default to `irreversible_blocked` (fail-closed)

### Step Middleware
`runToolStep()` enforces the invariant chain for every tool call:
1. `classify()` — get reversibility metadata
2. `signToolCall()` — FIDES cryptographic signature
3. `commitAction()` — AGIT pre-commit
4. `execute()` — run the tool (or block/pause)
5. `commitAction()` — AGIT post-commit

### Messaging Adapters
Surface adapters for multi-platform delivery:
- **Active**: Slack, Telegram, Discord, WhatsApp, Web
- **Planned**: Teams, Google Chat, iMessage, Signal
- All adapters route to the Agent Orchestrator (not direct LLM)
- Approval cards rendered per-platform (Block Kit, Inline Keyboard, Embeds, Interactive)

## Component Relationships

```
                    ┌──────────────┐
                    │   Surfaces   │
                    │ (Web, Slack, │
                    │  TG, etc.)   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Agent     │
                    │ Orchestrator │
                    └──┬───┬───┬──┘
                       │   │   │
              ┌────────┘   │   └────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼───┐ ┌──────▼──────┐
       │ Guard Chain  │ │Tools │ │  Step MW    │
       │ (5 guards)   │ │Reg.  │ │ runToolStep │
       └──────────────┘ └──┬───┘ └──┬───┬──────┘
                           │        │   │
                      ┌────▼───┐ ┌──▼─┐ ┌▼─────┐
                      │classify│ │FIDES│ │ AGIT │
                      └────────┘ │sign │ │commit│
                                 └──┬──┘ └──┬───┘
                                    │       │
                              ┌─────▼───────▼─────┐
                              │   Convex Database  │
                              │ (10 tables, RT     │
                              │  subscriptions)    │
                              └────────────────────┘
```

## Three Core Invariants

1. **Every tool call is signed** — FIDES produces a cryptographic signature before any tool executes. No unsigned tool execution is permitted.

2. **Every tool call is committed** — AGIT creates a pre-commit (intent) and post-commit (result) for every tool execution. The audit trail is immutable and per-user.

3. **Unknown tools are blocked** — Any tool not registered in the Tool Registry defaults to `irreversible_blocked` with `approval_required: true`. The system is fail-closed by design.

## External Dependencies

| Service | Purpose | SDK |
|---------|---------|-----|
| **FIDES** | Cryptographic signing & DID identity | `@fides/sdk` (workspace) |
| **AGIT** | Audit commit log & revert | `@agit/sdk` (workspace) |
| **Convex** | Real-time database & durable workflows | `convex` |
| **WorkOS** | Authentication (AuthKit) | `@workos-inc/authkit-nextjs` |
| **Stripe** | Billing (5 tiers: Personal, Pro, Pro BYOK, Team, Team BYOK) | `stripe` |
| **SuperMemory** | Semantic memory search & storage | `supermemory` API |
| **Daytona** | Primary code sandbox (Pro+ gated) | `@daytona/sdk` |
| **E2B** | Fallback code sandbox | `@e2b/code-interpreter` |
| **Steel** | Browser automation (Pro+ gated) | `steel-sdk` |
| **PostHog** | Product analytics (web + server) | `posthog-js`, `posthog-node` |
