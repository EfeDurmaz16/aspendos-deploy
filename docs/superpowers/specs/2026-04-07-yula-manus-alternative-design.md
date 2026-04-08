# YULA → Trustworthy General Agent (Manus Alternative)

> Design spec — locked 2026-04-07
> v1 (initial), v2 (Reversibility Model elevated, scope narrowed), **v3 (tech stack pivoted to Convex+WorkOS+AI SDK v6+Next 16, see ADR 0001)**
> Status: **Approved for implementation planning**
> Author: Efe Baran Durmaz + collaboration session
> Decision context: brainstorming session 2026-04-07 (Patika A locked, full-scope v1, tech stack pivoted)
> Companion: `docs/adr/0001-tech-stack-pivot-2026-04-07.md`
> Phase A plan: `docs/superpowers/plans/2026-04-07-yula-v0-stack-migration.md`
> Phase B plan: `docs/superpowers/plans/2026-04-07-yula-v1-manus-alternative.md`

## 1. Decision Summary

YULA pivots from "consumer AI chat with memory" to **"a trustworthy AI agent for Slack and web — every action is signed, logged, approval-aware, and reversible when supported. Built on Aspendos, the open agent OS."**

The product launches on **Slack + Web** (with Telegram as a fast-follow within 14 days), and the existing web app is repositioned as a **command center + audit + rewind console**, not a generic chat UI. Three concrete differentiators against Manus, Genspark, Devin, Operator, OpenClaw, and Hermes Agent:

1. **Every action is FIDES-signed** (Ed25519 DID + RFC 9421 HTTP signatures) — cryptographically verifiable audit log
2. **Every action has a declared reversibility class** (see §5 Reversibility Model) and a transparent rollback strategy surfaced to the user *before* execution
3. **Built on open infrastructure** — FIDES, AGIT, OAPS, OSP, Switchboard are MIT/Apache user-authored projects, openly published, providing a defensible moat that takes years to replicate

## 2. Context and Motivation

### Market state (April 2026)
- **Manus** ($2B Meta acquisition Dec 2025) is the category-defining "general agent" product but suffers from documented reliability, opacity, and pricing problems. Users actively seek alternatives.
- **Genspark** leads on GAIA benchmark (87.8%) but is closed source and proprietary.
- **Devin** is coding-only at $20–500/mo.
- **OpenAI Operator** is browser-only and bundled inside ChatGPT Pro at $200/mo.
- **OpenClaw** (247k stars) and **Hermes Agent** (22k stars) are self-hostable open agents with massive viral mindshare but no managed/governed offering and no enterprise-ready trust layer.
- Total general-agent market: $11.4B in 2026.

### Window
6–12 month window before OpenAI, Anthropic, and Google enter the messaging-first general agent category directly. Pre-launch pivot is the lowest-cost moment to reposition.

### Why YULA is uniquely positioned
- 80% of YULA's existing codebase is reusable (memory, multi-platform messaging via Vercel Chat SDK, billing via Stripe, auth via Better Auth, AI Gateway routing, agentic RAG, skills system, PAC notifications, governance guard chain).
- The five adjacent user-authored projects (FIDES, AGIT, OAPS, OSP, Switchboard) become **core pillars**, not credibility marketing — turning the entire stack into a defensible agent OS.

## 3. Goals and Non-Goals

### Goals (v1 — first 30 days)
1. Ship a deployable v1 agent running on **8 messaging surfaces** (Slack, Telegram, Discord, WhatsApp, Teams, GChat, iMessage, Signal) + Web command center. Matrix and Email are stretch goals if time permits.
2. Wire **FIDES** (signing) deeply into every agent tool call
3. Wire **AGIT** (commit + rollback) deeply into every agent tool call
4. Ship the **Reversibility Model** (§5) as the product's core spine — a first-class 5-class taxonomy with a structured data model, visible badges in every approval card, and real reverse handlers for at least one example per class
5. Deliver **five working tool examples**, one per reversibility class, each with real reverse logic:
   - `undoable` → file write (snapshot + restore)
   - `cancelable_window` → email send (SES 30s hold + recall)
   - `compensatable` → calendar event create (DELETE event)
   - `approval_only` → DB migration (interactive approval card + counter-sign)
   - `irreversible_blocked` → high-risk Stripe charge (refuses to execute, shows explanation)
6. Ship at least one **browser automation** tool (Steel.dev) usable by the agent in one demonstrated flow
7. Ship **E2B sandbox** lifecycle (start, exec, file ops, terminate) as the general-purpose compute primitive
8. Ship **Anthropic Computer Use** as a live capability — one recorded promoted demo (Flow G), available to all paying users on Pro+ tier
9. Three-tier Stripe pricing live: Personal $20, Pro $50, Team $150/seat
10. Ship a 30-day launch playbook (soft launch → Product Hunt → Hacker News → Reddit → dev influencer)
11. Land **4 demo videos** — Flow A (email cancel), Flow B (DB approval), Flow C (file undo), Flow G (computer use). Flow E (refusal) as bonus trust-signal asset.
12. Run **GAIA level-1 subset** eval harness, publish initial score in launch blog post

### Non-goals (v1)
- Mobile app polish (defer to v1.5)
- OSP service provisioning as a user-facing tool (defer to v1.5 — but OSP spec mentioned in Aspendos infrastructure marketing)
- Switchboard backend integration (defer to v2)
- GitHub/Linear surfaces (defer to v1.5)
- Custom fine-tuned models (use AI Gateway routing exclusively)
- Self-hosted/on-prem deployment story (defer to v2 or enterprise sales)
- Multi-tenant isolation beyond per-user sandbox (defer to v2)
- Full Terminal-Bench or BrowseComp submissions (GAIA subset only for v1, rest post-launch weekly cadence)

## 4. Architecture

```
                ┌──────────────────────────────────────────────┐
                │  SURFACES — kullanıcının bulunduğu yerler    │
                ├──────────────────────────────────────────────┤
                │  Web UI │ Slack │ Telegram │ WhatsApp │ ...  │
                │  Discord│ Teams │ GChat │ iMessage │ Email   │
                └────┬─────────┬─────────┬──────────┬──────────┘
                     │         │         │          │
                ┌────┴─────────┴─────────┴──────────┴────────┐
                │  ENTRY ROUTER                               │
                │  • Chat SDK Bot (services/api/src/bot)      │
                │  • Web AI Route (apps/web/app/api/chat)     │
                └────────────────────┬───────────────────────┘
                                     │
                ┌────────────────────┴───────────────────────┐
                │  AGENT ORCHESTRATOR                         │
                │  Plan → Tool selection → Multi-step exec    │
                │  Vercel AI SDK + LangGraph (services/agents)│
                └────────────────────┬───────────────────────┘
                                     │
       ┌───────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
       ▼           ▼          ▼          ▼          ▼          ▼          ▼
  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────┐ ┌──────┐ ┌────────────┐ ┌──────┐
  │  FIDES  │ │  AGIT   │ │Reversib. │ │Super│ │Tools │ │Capabilities│ │Approv│
  │  sign   │ │on Convex│ │  Model   │ │Memory│ │  MCP │ │   stack    │ │ HITL │
  │  guards │ │ commits │ │  (§5)    │ │ Pro │ │skills│ │   (§6)     │ │ gates│
  │         │ │ table   │ │ 5-class  │ │     │ │      │ │            │ │      │
  └─────────┘ └─────────┘ └──────────┘ └─────┘ └──────┘ └────────────┘ └──────┘
                                     │
                ┌────────────────────┴────────────────────────────┐
                │  AI GATEWAY — Multi-provider routing            │
                │  Groq Llama 4 (router) · Haiku 4.5 (routine) · │
                │  Sonnet 4.6 (tools) · Opus/GPT-5/Gemini 2.5 Pro │
                │  (council) · Sonnet 4.6 computer-use (desktop) │
                └────────────────────┬────────────────────────────┘
                                     │
                ┌────────────────────┴────────────────────────────┐
                │  CONVEX (TS-first DB, real-time, ACID, vector) │
                │  + Convex Workflow component (durability)       │
                │  + Convex Durable Agents component              │
                │  Auth: WorkOS AuthKit                           │
                │  Billing: Stripe (3-tier + BYOK)                │
                └─────────────────────────────────────────────────┘
```

**Three core invariants** enforced at the orchestrator:

1. **Every tool call is FIDES-signed** before execution — RFC 9421 HTTP message signature with the agent's Ed25519 DID
2. **Every tool call is AGIT-committed** before AND after execution — pre-commit captures intent, post-commit captures result + signature
3. **Every tool call carries a declared reversibility class** (see §5 Reversibility Model) — the class determines whether the action runs silently, with a cancel window, via approval gate, or is refused outright. The class and its human-readable explanation are shown to the user on the surface where the request originated, *before* execution.

## 5. Reversibility Model

> **Status**: Finalized text to be pasted in by expert reviewer. Placeholder block below retained so downstream sections can reference the structure without blocking their revision.

This is the spine of the product. Every tool in YULA's registry declares a reversibility class, and every action the agent proposes is surfaced to the user with that class visible as a badge on the approval card, the timeline, the audit log, and the docs. The five classes are:

| Class | Meaning | Example tool | Example UX copy (human language, not technical) |
|---|---|---|---|
| `undoable` | State can be snapshotted and literally restored | `file.write`, `kv.set` | "Can be fully undone — I'll save a snapshot before writing." |
| `cancelable_window` | Action is held for N seconds before it actually happens; cancel within window | `email.send` (via SES 30s hold), `message.post` (with delete grace period) | "Can be canceled for the next 30 seconds." |
| `compensatable` | Action happens irrevocably but YULA can run a compensating action to nullify effects | `calendar.create_event` (reversed by DELETE), `stripe.refund_eligible_charge` | "Can be reversed by deleting the event I just created." / "Can be compensated with a refund after execution." |
| `approval_only` | YULA will not execute without explicit user counter-signature; no automatic reverse path | `db.migrate`, `filesystem.delete_dir`, `git.force_push` | "I can do this, but I'll need your approval first. There's no automatic way to undo it." |
| `irreversible_blocked` | YULA refuses to run this tool class outright — visible refusal with explanation | `stripe.charge > $50` (high-risk), `db.DROP_TABLE`, `email.send_to_distribution_list > 1000` | "I won't do this. It can't be undone and the blast radius is too high. You'll need to do it yourself." |

### 5.1 Data model (every action stores this)

Every `AgentAction` record (AGIT commit metadata) carries these fields:

```ts
type ReversibilityClass =
  | 'undoable'
  | 'cancelable_window'
  | 'compensatable'
  | 'approval_only'
  | 'irreversible_blocked';

interface ReversibilityMetadata {
  reversibility_class: ReversibilityClass;
  approval_required: boolean;       // true for approval_only; may be true for other classes if policy triggers
  rollback_strategy:                // which handler to run on undo
    | { kind: 'snapshot_restore'; snapshot_id: string }
    | { kind: 'cancel_window'; deadline: ISO8601; cancel_api: string }
    | { kind: 'compensation'; compensate_tool: string; compensate_args: unknown }
    | { kind: 'none' };
  rollback_deadline?: ISO8601;      // only for cancelable_window
  human_explanation: string;        // user-facing copy shown in the card/timeline/audit log
}
```

This object is:
- Serialized into the AGIT commit metadata (part of the signed payload)
- Rendered into the messaging Card at action-proposal time
- Rendered into the web `/timeline` audit log
- Exported via the docs generator so every tool's reversibility contract is published

### 5.2 Visual distinction: `approval_only` vs `irreversible_blocked`

These two classes **must not look the same** in the UI. They mean fundamentally different things:

- `approval_only` = **"I can do this, but I'm asking you first"** → blue/amber badge, `[ Approve ] [ Reject ]` buttons enabled
- `irreversible_blocked` = **"I will not do this"** → red badge, no action buttons, explanation text only, optional `[ I understand ]` dismiss

Trust comes from this clarity. Collapsing them into a single "dangerous action" affordance breaks the whole promise.

### 5.3 Card UX sketch

```
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│ 📧 Send email to john@acme.com       │          │ 🗃 DROP TABLE users                   │
│ 🟢 Cancel-within-window: 30s          │          │ 🔴 Will not run — blast radius too    │
│ "Can be canceled for the next 30s."  │          │    high and no recovery path.         │
│ Content: "Meeting confirmed..."       │          │ "This action is irreversible_blocked. │
│ [ Send ] [ Modify ]                   │          │ Run it yourself if you're sure."      │
└──────────────────────────────────────┘          │ [ Dismiss ]                           │
                                                    └──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 📅 Create calendar event              │
│ 🟡 Compensatable: reversible by       │
│    deleting the event I create.       │
│ When: Friday 3:00 PM UTC              │
│ [ Create ] [ Modify ]                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 💳 Charge $127 via Stripe             │
│ 🟠 Approval-only: I can do this, but  │
│    I need your explicit approval.     │
│    Refund possible after execution.   │
│ [ Approve ] [ Reject ]                │
└──────────────────────────────────────┘
```

Colors: 🟢 green = undoable/cancelable_window (safe), 🟡 yellow = compensatable (recoverable), 🟠 amber = approval_only (gated), 🔴 red = irreversible_blocked (refused).

## 6. Capabilities Stack (E2B + Steel + Anthropic Computer Use)

This is the "virtual computer" layer that gives YULA general-agent capability parity with Manus.

### 6.1 Sandbox layer — E2B (primary) + Vercel Sandbox (secondary)

**Choice: E2B as primary virtual computer.**

| Property | E2B | Notes |
|---|---|---|
| Tech | Firecracker microVMs | Same as Manus |
| Cold start | ~150ms | Manus tested Docker first (10–20s), rejected |
| Pricing | $0.0504/vCPU-hr + $0.0162/GiB-hr; default 2-vCPU ≈ $0.083/hr | Hobby free $100 credit, Pro $150/mo + usage |
| Session length | 24 hours (Pro) | Enough for any agent task |
| Concurrency | 100 sandboxes (Pro), expandable to 1,100 | Enough for first 1k users |
| Persistence | 14 days for paid users | AGIT is YULA's source of truth, not E2B persistence |
| Custom templates | Full Docker images | Enables computer-use template and custom tool bundles |
| Region availability | Not publicly documented | Acceptable risk for v1 |

**Vercel Sandbox** is the secondary path for trivial code-only tasks where E2B's overhead isn't needed:

| Property | Vercel Sandbox |
|---|---|
| Pricing | Hobby free (5 CPU-hrs + 420 GB-hrs/mo); Pro $0.128/CPU-hr + $0.0212/GB-hr |
| Limits | iad1-only; 5hr session max; node24/22 + python3.13 only |
| Use case | Quick code execution where E2B's full Linux is overkill |

**Daytona** is the documented escape hatch — identical pricing to E2B, hosted + self-host, can be swapped in if E2B vendor risk materializes.

### 6.2 Browser automation — Steel.dev

**Choice: Steel.dev** for managed browser sessions.

| Property | Steel.dev | Why |
|---|---|---|
| Pricing | Pro $0.05/hr (2x cheaper than Browserbase) | Cost matters at agent scale |
| Free tier | 100 browser-hrs/mo | Covers prototype phase |
| SDK | Drop-in Playwright/Puppeteer/Selenium | No lock-in |
| Open source | Yes — self-hostable | Vendor escape hatch |
| Stealth | Built-in | For login flows, scraping |

**Browserbase** is the documented fallback if Steel reliability proves insufficient — ~2x cost but more polished, has the Stagehand AI-native browser SDK.

**DIY Playwright** is the enterprise/cost-control fallback — runs ~4–6 browsers per Fly.io 2vCPU/4GB machine ($30–40/mo), needs `playwright-extra` stealth plugin.

### 6.3 Computer use (full desktop) — Anthropic Computer Use API

**Choice: Anthropic Computer Use API** + `anthropic-quickstarts/computer-use-demo` Docker container running inside an E2B custom template.

**Launch posture**: **live capability on Pro+ tier**, one recorded promoted demo (Flow G). Available to paying users. Anthropic's "slow for real-time" warning is mitigated by YULA's messaging-first async pattern — user fires a task and gets a result minutes later, which is how users actually use Manus today. The recorded demo shows a realistic task (PDF form fill + spreadsheet entry) with visible step commits and a signed audit log.

| Property | Anthropic Computer Use |
|---|---|
| Status | Beta (`computer-use-2025-11-24` header) |
| Models | Opus 4.6, Sonnet 4.6, Opus 4.5 |
| Pricing | Standard token pricing (Sonnet 4.6: $3/M input, $15/M output); no per-action fee |
| Latency | "Too slow for human-AI interaction" — Anthropic's own warning. Acceptable for messaging-first async pattern. |
| Hosting | Self-hosted; Anthropic does NOT provide the desktop |
| Reference impl | `github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo` ships Xvfb + Mutter + Tint2 + Firefox + LibreOffice + agent loop |

**Why Anthropic**: OpenAI CUA is research preview only (no public GA API in April 2026), and OSS alternatives (Self-Operating-Computer, ScreenAgent, Cradle) are not production-ready.

**Architecture**: Build the Anthropic computer-use-demo Docker image as an E2B custom template. Spawn one E2B sandbox from this template per "computer use" task. Run the Anthropic agent loop from YULA's orchestrator, screenshotting + reasoning + acting. Every tool action signed by FIDES, committed by AGIT.

**Critical implementation detail**: scale screenshots to ≤1568px long edge / ≤1.15 MP and rescale Claude's coordinates back up before sending mouse events.

### 6.4 Cost model

Typical general agent task: 5 minutes, 3 LLM calls, 2 tool calls (1 browser, 1 file ops), optionally 5 computer-use steps:

| Component | Cost |
|---|---|
| E2B sandbox 5 min | $0.0069 |
| Steel browser 5 min | $0.0042 |
| 3× Sonnet 4.6 calls (~3k input / ~1k output avg) | $0.054 |
| Computer use add-on: 5 screenshots × ~5k vision tokens + 5k output | +$0.10 |
| **Browser-only task** | **~$0.07** |
| **Computer-use task** | **~$0.17** |

**Pricing implications**: Personal $20/mo plan covers 125–280 tasks/mo. Pro $50/mo covers 300–700 tasks/mo. **More competitive than Manus's $200/mo Extended plan.**

**Margin**: $20/mo user pulling 50 tasks/mo costs ~$3.50, gross margin ~82%.

## 7. Components (existing / wire / build)

> **v3 tech stack pivot note**: components below were authored against the original Postgres+Better Auth+LangGraph stack. The new stack pivot (ADR 0001) replaces these foundations:
>
> | Old | New |
> |---|---|
> | Postgres + Prisma + Neon | **Convex** (`convex/schema.ts`, `users`/`commits`/`approvals`/`snapshots`/`subscriptions` tables) |
> | Better Auth | **WorkOS AuthKit** (`@workos-inc/authkit-nextjs`, `authkitMiddleware` in `apps/web/proxy.ts`) |
> | LangGraph (Python `services/agents/`) | **Vercel AI SDK v6 `Agent`** (`services/api/src/orchestrator/agent.ts`) |
> | Custom durability + cron | **Convex Workflow** + **Convex Durable Agents** components |
> | OpenMemory + Qdrant + `MEMORY_BACKEND` flag | **SuperMemory hosted Pro $19** only (single backend) |
> | Single-provider LLM | **AI Gateway multi-provider routing** (Groq router → Haiku routine → Sonnet tools → Opus/GPT-5/Gemini council → Sonnet computer use) |
> | Hugeicons | **Phosphor icons** (`@phosphor-icons/react`) |
> | (no font lock) | **Manrope** via `next/font/google` |
> | Next.js 15 | **Next.js 16.2** (Turbopack default, Cache Components, `proxy.ts`) |
>
> Phase A migration (`docs/superpowers/plans/2026-04-07-yula-v0-stack-migration.md`) executes these swaps in 5 days BEFORE Phase B v1 sprint begins. The component table below should be read with these substitutions applied — e.g., "AGIT TS SDK import + Postgres state" becomes "AGIT-on-Convex via `convex/commits.ts` mutation"; "Better Auth" rows become "WorkOS AuthKit"; etc.

**Scope note**: v1 launches with 8 messaging surfaces + Web command center. Every surface gets interactive approval cards with the 5-class badge system. Matrix and Email are stretch goals for the sprint buffer days.

| Layer | Component | Status | v1 Action | YULA path |
|---|---|---|---|---|
| Surfaces | Web UI (Next.js) | ✅ exists | Add timeline rewind view + approval cards + reversibility badges | `apps/web/app/timeline/` (new) |
| | Slack adapter (Chat SDK) | ✅ exists | Interactive approval cards with badges; `/undo` slash command | `services/api/src/bot/index.ts` |
| | Telegram adapter | ✅ exists | Inline keyboard approval UX; `/undo` command | `services/api/src/bot/index.ts` |
| | Discord adapter | ✅ exists | Component approval cards; `/undo` slash command | `services/api/src/bot/index.ts` |
| | WhatsApp adapter | ✅ exists | Interactive message approval (WABA buttons); `/undo` text fallback | `services/api/src/bot/index.ts` |
| | Teams adapter | ❌ activate | Adaptive Card with approval buttons | `services/api/src/bot/index.ts` |
| | GChat adapter | ❌ activate | Card interactive buttons | `services/api/src/bot/index.ts` |
| | iMessage adapter (Photon) | ❌ activate | Text + rich preview; button fallback via reply parsing | `services/api/src/bot/index.ts` |
| | Signal adapter | ❌ activate | Text + reply-parsing approval | `services/api/src/bot/index.ts` |
| | Matrix adapter (stretch) | ❌ activate | m.card + m.notice events | `services/api/src/bot/index.ts` |
| | Email adapter (stretch, Resend) | ❌ activate | Email with approve/reject links | `services/api/src/bot/index.ts` |
| | GitHub/Linear adapters | ❌ missing | Defer to v1.5 | — |
| | Mobile RN | 🟡 skeleton | Defer to v1.5 | `apps/mobile/` |
| Router | `/api/chat` web route | ✅ exists | Route through orchestrator | `apps/web/app/api/chat/route.ts` |
| Orchestrator | streamText + tools | ✅ exists | Evolve to plan→step structure | `services/api/src/`, `services/agents/` |
| | Step boundary middleware | 🔨 build | Pre-check (FIDES guard) + post-commit (AGIT) + reversibility-class enforcement | `services/api/src/orchestrator/step.ts` (new) |
| **Reversibility Model** | `ReversibilityClass` enum + metadata type | 🔨 build | 5-class data model per §5.1 | `services/api/src/reversibility/types.ts` (new) |
| | Tool registry with reversibility annotations | 🔨 build | Every tool declares class + rollback_strategy + human_explanation | `services/api/src/tools/registry.ts` (new) |
| | Reverse handler dispatch | 🔨 build | Given a rollback_strategy, run the compensating action | `services/api/src/reversibility/dispatch.ts` (new) |
| | 5 reference tool implementations | 🔨 build | One per class: file.write (undoable), email.send (cancelable_window), calendar.create_event (compensatable), db.migrate (approval_only), stripe.charge>$50 (irreversible_blocked) | `services/api/src/tools/{file,email,calendar,db,stripe}.ts` (new) |
| | Card renderer (badge + human copy) | 🔨 build | Slack + Web Card component with the 4-color badge system, approval buttons wired to FIDES counter-sign | `services/api/src/bot/cards/`, `apps/web/src/components/approval-card/` (new) |
| FIDES | `@fides/sdk` import + identity | 🔧 wire | Per-agent DID, per-user sub-identity | `services/api/src/governance/fides.ts` (new) |
| | Request signing (RFC 9421) | 🔧 wire | Sign every tool call | same |
| | Guard chain | ✅ exists | Merge with reversibility-class policy (class elevation based on blast radius) | `services/api/src/governance/` |
| | Approval gate counter-signing | 🔧 wire | User clicks Approve → FIDES user-identity counter-signs the action → AGIT commit carries both signatures | new |
| AGIT | `agit` TS SDK import + Postgres state | 🔨 build | Per-user repo | `services/api/src/audit/agit.ts` (new) |
| | Commit per action with reversibility metadata | 🔨 build | Pre + post commit, metadata per §5.1 baked into the signed payload | `services/api/src/audit/commit.ts` (new) |
| | `undo` command parser (Slack only v1) | 🔨 build | AGIT revert + dispatch to reverse handler | `services/api/src/audit/undo.ts` (new) |
| | Web rewind UI | 🔨 build | Timeline at `/timeline`, click → preview, "rewind here" button, badges per commit | `apps/web/app/timeline/page.tsx` (new) |
| Capabilities | E2B sandbox client | 🔧 wire | `services/api/src/sandbox/e2b.ts` (new) | new |
| | Steel.dev browser client | 🔧 wire | One tool, used in one demonstrated flow | `services/api/src/tools/browser.ts` (new) |
| | Anthropic Computer Use loop | 🔨 build | Feature-flagged beta, not launch asset | `services/api/src/tools/computer-use.ts` (new) |
| | E2B custom template (computer-use) | 🔨 build | Docker image based on `anthropic-quickstarts/computer-use-demo` | `infra/e2b-templates/computer-use/` (new) |
| | Vercel Sandbox client (secondary) | 🔧 wire | Defer to v1.5 unless E2B cost forces earlier | deferred |
| | OSP provisioning tool | 🔧 wire | v1.5 only | deferred |
| | Switchboard code-exec | — | v2 only | deferred |
| Memory | SuperMemory + PG | ✅ exists | Verify cross-surface unification | `services/api/src/memory/` |
| | Agentic RAG router | ✅ exists | No change | — |
| Foundation | Better Auth | ✅ exists | Sub-identity → FIDES DID mapping | `services/api/src/auth/` |
| | Stripe | ✅ exists | Three-tier setup | (config only) |
| | Vercel AI Gateway | ✅ exists | Provider arbitrage config | (config) |
| Eval | GAIA level-1 harness | 🔨 build | In-sprint Day 7; publish score in launch blog | `services/eval/` (new) |

**Tally (v1 launch-critical)**: ~15 components untouched, ~5 extended, ~10 wired (8 surface adapters + sandbox + browser), ~14 built from scratch (reversibility model block + reference tools + step middleware + eval harness + computer use template + tool + undo parser + timeline UI). The Reversibility Model block (6 components) is the biggest new-build area and the core of the product.

## 8. Key user flows

Each flow demonstrates exactly one reversibility class. Collectively they prove the 5-class model works end-to-end and give us 5 concrete shippable demos for the launch assets (3 promoted, 2 kept for private demos).

### Flow A — `cancelable_window` demo → email send (LAUNCH HERO)

```
1. User (Slack):  "@yula john@acme.com'a meeting confirmation maili at"
2. Bot router → Agent orchestrator plans [draft_email, email.send]
3. Step 1 (draft_email): class=undoable, silent commit
4. Step 2 (email.send): class=cancelable_window, rollback_deadline=T+30s
5. Bot posts an approval card:
     ┌──────────────────────────────────────┐
     │ 📧 Send email to john@acme.com       │
     │ 🟢 Cancel-within-window: 30s          │
     │ "Can be canceled for the next 30s."  │
     │ Subject: Meeting confirmed            │
     │ [ Send ] [ Modify ]                   │
     └──────────────────────────────────────┘
6. User clicks Send
7. FIDES counter-sign; email submitted via SES with 30s hold
8. AGIT commit with { reversibility_class: 'cancelable_window', rollback_deadline: T+30s, rollback_strategy: { kind: 'cancel_window', cancel_api: 'ses.cancel_message' } }
9. Bot posts: "Email queued. Reply 'undo' within 30s to cancel."
10. User: "undo"
11. `/undo` parser → AGIT HEAD → reverse handler → ses.cancel_message
12. Bot posts: "Canceled. Email not sent."
```

Launch hero demo. 30-second screen recording → Twitter/X + HN assets.

### Flow B — `approval_only` demo → DB migration (B2B ENTERPRISE)

```
1. User (Slack #ops): "@yula prod DB'ye email_verified column ekle"
2. Plan: [generate_migration, db.migrate]
3. Step 2 class=approval_only (schema change is not auto-reversible on a live prod DB — rollback requires a reverse migration and downtime)
4. Bot posts an approval card:
     ┌──────────────────────────────────────┐
     │ 🗃 Apply migration to prod.users      │
     │ 🟠 Approval-only: I can do this but   │
     │    need your explicit approval.       │
     │    Rollback requires a reverse        │
     │    migration (written below).         │
     │ Diff: + email_verified BOOL DEFAULT F │
     │ Reverse migration: DROP COLUMN ...    │
     │ Signed by: yula-agent-did:...         │
     │ [ Approve ] [ Reject ]                │
     └──────────────────────────────────────┘
5. User clicks Approve → FIDES counter-sign with user DID
6. AGIT commit with both signatures
7. db.migrate runs; result captured
8. Audit log is cryptographically verifiable: who approved, when, what, with reverse migration stored as data
```

Enterprise sales demo for CISO conversations. Part of launch assets.

### Flow C — `undoable` demo → file write (LAUNCH ASSET)

```
1. User (Slack): "@yula ~/notes/meeting.md dosyasına bugünkü özeti yaz"
2. Plan: [file.snapshot, file.write]
3. Step 1 file.snapshot: silent, stores current content in AGIT blob
4. Step 2 file.write: class=undoable, rollback_strategy={kind:'snapshot_restore', snapshot_id:...}
5. Bot posts confirmation: "Written 12 lines to meeting.md. Reply 'undo' to restore previous content."
6. User: "undo"
7. `/undo` → reverse handler reads snapshot blob → rewrites file
8. Bot posts: "Restored. meeting.md is back to previous version."
```

Third launch asset. Demonstrates the purest form of "undo" — literal state restore.

### Flow D — `compensatable` demo → calendar event (PRIVATE DEMO)

```
1. User (Slack): "@yula Friday 3 PM'e John ile meeting ekle"
2. Plan: [calendar.create_event]
3. Step class=compensatable, rollback_strategy={kind:'compensation', compensate_tool:'calendar.delete_event', compensate_args:{event_id}}
4. Approval card:
     ┌──────────────────────────────────────┐
     │ 📅 Create calendar event              │
     │ 🟡 Compensatable: I can reverse this  │
     │    by deleting the event I create.   │
     │ When: Friday 3:00 PM UTC              │
     │ [ Create ] [ Modify ]                 │
     └──────────────────────────────────────┘
5. User clicks Create; FIDES counter-sign; calendar.create_event runs; AGIT commit
6. Bot posts: "Event created. Reply 'undo' to delete it."
7. User: "undo" → dispatch to calendar.delete_event(event_id) → AGIT commit reverse
8. Bot posts: "Event deleted."
```

Private demo for investor/beta conversations. Not in launch assets because it's similar in feel to Flow A.

### Flow E — `irreversible_blocked` demo → high-risk charge (TRUST SIGNAL)

```
1. User (Slack): "@yula acme'ye $15,000 ödemesi çek Stripe'dan"
2. Plan: [stripe.charge]
3. Step class=irreversible_blocked (amount > policy threshold of $50; refund is non-trivial, could hit FX/chargeback risk)
4. Bot posts a REFUSAL card (red, no approve button):
     ┌──────────────────────────────────────┐
     │ 💳 Charge $15,000 via Stripe          │
     │ 🔴 Will not run — irreversible_blocked│
     │ Reason: amount exceeds my auto-run   │
     │ policy ($50) and Stripe charges are  │
     │ high-risk to reverse (refund, FX,    │
     │ chargeback windows).                 │
     │ "You'll need to run this yourself."  │
     │ [ Dismiss ]                           │
     └──────────────────────────────────────┘
5. No action is taken. AGIT commit records the refusal with full reason.
```

This is the **trust signal** demo. The best way to prove YULA is trustworthy is to show what it *refuses* to do. Part of launch assets alongside Flow A and Flow B.

### Flow F — `irreversible_blocked` companion: DROP TABLE refusal (PRIVATE)

Same pattern, but for destructive DDL: `DROP TABLE`, `rm -rf`, force-push to `main`, email-blast >1000 recipients. All refused with class-specific human explanations. Private demo / blog post material, not in primary launch assets.

### Flow G — Computer use demo (PROMOTED LAUNCH ASSET, PRO+ TIER)

```
1. Pro+ user (Slack): "@yula bu PDF formunu doldur, bilgileri spreadsheet'e gir"
2. Plan: [download_pdf, extract_data, computer_use_task]
3. Spawn E2B sandbox from anthropic-computer-use template
4. Anthropic Sonnet 4.6 + screenshots loop drives Firefox + LibreOffice in Xvfb
5. Each screenshot+action FIDES sign + AGIT commit with reversibility metadata
6. Bot posts: "Done. Filled 47 rows. Audit log: /timeline/abc123"
```

**Launch posture**: live on Pro+ tier, one recorded demo in launch assets. Latency framed as async messaging-first pattern — "fire and get result", not real-time control.

### Flow H — OSP provisioning (v1.5, not v1)

Deferred to v1.5. Kept in the spec for architectural reference.

## 9. Build sprint (10 days, packed)

**Scope**: full v1 ships in 10 days. 8 messaging surfaces + Web command center, full Reversibility Model, 5 reference tool implementations, E2B + Steel + Computer Use, Stripe, landing, 4 demo videos, GAIA level-1 eval. This is an intense sprint — assumes focused execution and parallelizable work streams.

| Day | Track | Deliverable |
|---|---|---|
| **Day 1** | FIDES wiring | `services/api/src/governance/fides.ts` — agent DID at startup, `signToolCall()`, `verifySignature()`, `counterSignWithUser()`; verify against external verifier |
| **Day 1** | AGIT wiring | `services/api/src/audit/agit.ts` — per-user repo init, commit primitive with Postgres state adapter; smoke-test a dummy commit end-to-end |
| **Day 2** | Reversibility Model data layer | `services/api/src/reversibility/types.ts` (ReversibilityClass enum, ReversibilityMetadata interface per §5.1) + `services/api/src/reversibility/dispatch.ts` (given rollback_strategy, run compensating action) |
| **Day 2** | Tool registry | `services/api/src/tools/registry.ts` — every tool declares class, rollback_strategy, human_explanation; 5 example tool stubs created |
| **Day 3** | Step middleware | Pre+post commit wrapper around every tool call in orchestrator. Pre: FIDES sign + AGIT pre-commit with reversibility metadata. Post: AGIT post-commit with result + signature |
| **Day 3** | 5 reference tool implementations (parallel) | `file.write` (undoable, snapshot+restore), `email.send` (cancelable_window, SES 30s hold), `calendar.create_event` (compensatable, DELETE reverse), `db.migrate` (approval_only, HITL card), `stripe.charge>$50` (irreversible_blocked, refusal) |
| **Day 4** | Approval Card UX — 4 existing surfaces | Slack Block Kit + Telegram inline keyboards + Discord components + WhatsApp interactive messages, all with 4-color badge system (🟢🟡🟠🔴) |
| **Day 4** | Web approval card component | `apps/web/src/components/approval-card/` — React component with same badge system |
| **Day 5** | Activate 4 new surfaces | Teams Adaptive Cards + GChat Cards + iMessage (Photon) + Signal via Chat SDK adapters in `services/api/src/bot/index.ts` |
| **Day 5** | Web timeline + rewind view | `apps/web/app/timeline/page.tsx` — chronological AGIT commit list, badge per commit, click → preview, "rewind here" button |
| **Day 6** | `/undo` slash command (all surfaces) | Parser wired into bot router for Slack/Telegram/Discord/WhatsApp/Teams/GChat; text-parsing fallback for iMessage/Signal |
| **Day 6** | E2B sandbox client | `services/api/src/sandbox/e2b.ts` — sandbox lifecycle, file ops, `runCode`, `commands.run`, terminate |
| **Day 7** | Steel.dev browser tool | `services/api/src/tools/browser.ts` — one tool usable by agent, demonstrated in a "research + summarize" flow |
| **Day 7** | Computer use template + tool | Build `infra/e2b-templates/computer-use/` Dockerfile (based on `anthropic-quickstarts/computer-use-demo`), push to E2B custom templates, wire `services/api/src/tools/computer-use.ts`, gated to Pro+ tier |
| **Day 7** | GAIA eval harness | `services/eval/` — GAIA level-1 subset (50 tasks), run harness, capture initial score for launch blog post |
| **Day 8** | Stripe pricing tiers + payment flow | Three tiers live: Personal $20, Pro $50, Team $150/seat. Feature gating: Computer Use on Pro+ only |
| **Day 8** | Landing page rewrite | yula.dev → new positioning, Aspendos parent brand hierarchy, demo videos embedded, pricing page, manifest post |
| **Day 8** | E2E integration on all 8 surfaces | Run Flows A, B, C, E, G end-to-end on a seeded staging account |
| **Day 9** | Demo video recording + trust content | 4 promoted videos (Flows A, B, C, G) + 1 bonus (Flow E refusal) + FIDES signature verification demo (show external verifier confirming our signatures) |
| **Day 9** | Buffer — bug fix + polish | Fix everything found in Day 8 E2E; badge copy polish; timeline UX polish; card rendering edge cases |
| **Day 10** | Buffer + soft launch pre-flight | Load test; smoke test on real Slack workspace + Discord server; sanity-check billing; prep HN/PH/Reddit copy; schedule Product Hunt Tuesday launch; Matrix + Email adapters if time allows |

**Post-sprint (Day 11–30, launch window)**:
- Day 11–14: Private beta invitations (50-100 users), iterate on feedback
- Day 15 (Tuesday): Product Hunt launch
- Day 16: Hacker News "Show HN" post
- Day 17-18: Reddit (r/LocalLLaMA, r/selfhosted, r/MachineLearning, r/programming)
- Day 19-21: Dev influencer outreach + blog post
- Day 22-28: Convert beta to paid, first B2B outreach
- Day 29-30: Metrics review, decide what's working

**What's explicitly NOT in v1**: mobile app polish, OSP provisioning tool, GitHub/Linear surfaces, Switchboard integration, Terminal-Bench / BrowseComp full submissions, enterprise SOC2/on-prem story.

**Parallelization note**: Days 3, 4, and 8 contain work that can be split across parallel work streams if more than one pair of hands is available. A solo founder sprint is tight but feasible; with 2 people, 10 days is comfortable; with 3+, there's buffer for polish and testing.

## 10. Brand pivot and product language

> **Status**: Revised tagline and finalized product copy will be pasted in by expert reviewer. Placeholder block retained below so downstream sections can reference.

### Brand architecture (locked)

**Aspendos parent brand + YULA as consumer product**. Locked against alternatives ("keep YULA with rebrand" and "full rename").

- **Aspendos** = open agent OS, the FIDES + AGIT + OAPS + OSP + Switchboard stack. Dev/enterprise brand. GitHub org, open-source repos, infrastructure documentation.
- **YULA** = consumer product on top. The messaging-first trustworthy agent. Warmer brand, yula.dev domain, consumer marketing.
- Model: Vercel + Next.js split — the infrastructure brand and the product brand coexist and cross-reference. Enterprise conversations lead with "built on Aspendos"; consumer conversations lead with YULA.

### Draft launch copy (to be finalized by reviewer)

**Working claim** (do NOT use as-is; user's final version will replace):

> *"A trustworthy AI agent for Slack and web. Every action is signed, logged, approval-aware, and reversible when supported. Built on Aspendos, the open agent OS."*

This is deliberately **softer** than the earlier draft ("The general AI agent you can actually trust. And undo."). The earlier version overclaimed universal undo and would break on the first edge case a user hit. The new claim matches exactly what the Reversibility Model actually guarantees:
- **signed** = FIDES on every action
- **logged** = AGIT commit on every action
- **approval-aware** = guard chain + approval_only class
- **reversible when supported** = honest acknowledgment that only 3 of 5 classes are actually reversible

### Three-sentence launch story (working draft)

> YULA is a trustworthy AI agent for Slack and web.
> Every action is signed, committed, and logged.
> Before the agent acts, you see exactly how reversible the action is.

This maps 1:1 to the three architectural invariants in §4 and the Reversibility Model in §5.

## 11. 30-day launch playbook

| Week | Action | Channel | What we're learning |
|---|---|---|---|
| **W-1 (sprint)** | v1 build complete, demo videos, landing, reversibility model live | — | Is the 5-class model actually implementable in 10 days? |
| **W1** | Soft launch — private beta, 100 invites | Twitter/X + personal network | Does the Reversibility Model make sense to a cold user? Do they understand the badges without explanation? |
| **W1** | Share Flow A (email), B (DB approval), C (file undo), E (refusal) demo videos | Twitter, LinkedIn, Reddit r/LocalLLaMA | Which flow generates the most "wait, is this real?" replies? |
| **W2** | HN launch: *"Show HN: YULA — the trustworthy AI agent for Slack. Every action is signed, committed, and classified by reversibility."* | HN front page | Dev community reception: is "reversibility class" understood or confusing? |
| **W2** | Reddit: r/selfhosted, r/LocalLLaMA, r/MachineLearning, r/programming | Reddit | Which persona (self-hoster, ML person, generalist) resonates most? |
| **W3** | Product Hunt launch (Tuesday) | PH | Does "trustworthy AI agent" category land in a broader audience? |
| **W3** | Influencer outreach (Simon Willison, swyx, Theo, Fireship, Scott Hanselman) | Twitter DM with custom demo per person | Do independent reviewers describe us accurately? |
| **W4** | Technical deep-dive blog post: *"The 5-class reversibility model: why we refuse to ship undo as a lie"* | Aspendos blog | Does the safety-honesty narrative resonate with B2B audiences? |
| **W4** | Open source FIDES + AGIT under "Aspendos" GitHub org | GitHub | How many people star/fork vs install vs contribute? |
| **W4** | First B2B outreach (CISO targeted) | LinkedIn cold email | Does "approval_only" + cryptographic audit log get enterprise meetings? |

### Learning metrics (NOT success gates)

These are signals we *track* and *learn from*, not pass/fail thresholds. Hitting a number isn't the point — seeing a pattern is.

| Signal | What it tells us |
|---|---|
| % of beta users who complete at least one action from each class (undoable, cancelable_window, compensatable, approval_only) within first week | Is the taxonomy discoverable or does it sit unused? |
| % of approval_only cards that get approved vs rejected | Do users actually exercise judgment, or do they rubber-stamp? |
| % of actions where the user uses `/undo` within the cancel window | Does cancel-window actually deliver safety or is it theater? |
| # of users who mention the reversibility badges in support/feedback | Is the visual signal landing? |
| % of signups who invite YULA to a Slack workspace within 24h | Activation proxy |
| # of enterprise leads who spontaneously mention "audit" or "compliance" | B2B wedge validation |
| Share of conversation starting with trust questions ("is it safe to…") | Trust framing working |
| Cost per completed task (actual vs projected $0.07–0.17) | Margin sanity |
| Number of FIDES signatures that fail external verification | Is the crypto actually valid? (should be zero) |

### Revenue as a directional indicator (not a target)

If forced to pin numbers for internal sanity checks (not external commitments):
- Free signups in the hundreds-to-low-thousands range is a healthy launch tail
- Paying customers in the low hundreds by day 30 means the wedge is real
- A dozen enterprise conversations by day 30 means the compliance story is landing
- HN front page OR PH top 3 is the reputational goal — either is sufficient

Do **not** chase these numbers at the cost of product integrity. If engagement data says the taxonomy is confusing, we fix the taxonomy before we chase signups.

## 12. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reliability — the "trustworthy agent" pitch collapses if we crash on launch day | High | High | Soft launch first; load test before public launch; autoscale Vercel functions; fallback queue for bot events |
| Reversibility model overclaim — a user hits an edge case where the rollback fails silently | High | High | "Reversible **when supported**" language; human_explanation field is mandatory per-tool; `irreversible_blocked` refuses instead of failing |
| "Trustworthy agent" pitch too abstract for launch audience | Medium | Medium | Lead with Flow A (email cancel), Flow B (DB approval), Flow C (file undo), Flow E (refusal) — each is a concrete 30-second demo |
| LLM token cost burns margin | High | High | AI Gateway provider arbitrage, hard per-user token limits, aggressive caching, cost alerts |
| OpenClaw/Hermes community sees us as competitor rather than complement | Medium | Low | Position as "managed + governance layer, not replacement"; contribute back; don't attack their audience |
| Meta launches "Manus 2.0" during our launch window | Medium | High | Window is real but short — move fast. Differentiation = open infrastructure + auditability (Meta is closed and has no undo story) |
| FIDES/AGIT SDKs not fully production ready | Medium | High | Day 1 of sprint is explicit verification + fixes; if blocking, ship with reduced depth and enhance post-launch |
| E2B vendor lock-in | Low | Medium | Daytona escape hatch (identical pricing, hosted+self-host); `services/api/src/sandbox/` is an abstract interface |
| Computer use latency complaint | Medium | Low | Feature-flagged beta, explicitly not in launch claim; set expectations when shown |
| Brand confusion (Aspendos vs YULA) | Low | Low | Clear hierarchy: Aspendos = infrastructure brand (dev/enterprise), YULA = consumer product |
| Reversibility taxonomy is confusing to cold users | Medium | High | Badges are visual first (🟢🟡🟠🔴) + color-coded before text; user testing in soft launch week; iterate copy if needed before HN launch |

## 13. Definition of done — v1 launch

> **Status**: Finalized checklist to be pasted in by expert reviewer. Draft below reflects the full-scope v1 (founder override on reviewer's narrowing — we believe 10 days is enough for the full surface count).

**Surfaces**
- [ ] Slack adapter fully functional (mention, DM, Block Kit approval cards, `/undo` slash command)
- [ ] Telegram adapter (inline keyboards, `/undo` command)
- [ ] Discord adapter (components + `/undo` slash command)
- [ ] WhatsApp adapter (interactive message buttons)
- [ ] Teams adapter (Adaptive Cards)
- [ ] GChat adapter (Cards)
- [ ] iMessage adapter (text + reply-parse approval)
- [ ] Signal adapter (text + reply-parse approval)
- [ ] Web UI functional (`/chat` and new `/timeline` view)
- [ ] Matrix + Email adapters (stretch goals, not a hard gate)

**Core invariants**
- [ ] Every agent action is FIDES-signed before execution (verified by external verifier)
- [ ] Every agent action is AGIT pre-committed AND post-committed with reversibility metadata
- [ ] Guard chain enforces the 5-class reversibility policy

**Reversibility model — 1 real example per class**
- [ ] `undoable` → `file.write` works end-to-end with snapshot+restore
- [ ] `cancelable_window` → `email.send` works with SES 30s hold + cancel
- [ ] `compensatable` → `calendar.create_event` works with delete-compensation
- [ ] `approval_only` → `db.migrate` card flow works with FIDES counter-sign
- [ ] `irreversible_blocked` → `stripe.charge > $50` refusal card renders

**Approval UX**
- [ ] Slack interactive card with 4-color badge system renders correctly
- [ ] Web approval card React component renders correctly
- [ ] Human explanation text visible on every card
- [ ] `irreversible_blocked` is visually distinct from `approval_only` (different color, different copy, no approve button)

**Capabilities**
- [ ] E2B sandbox spawns, runs code, returns file ops
- [ ] Steel.dev browser tool callable by agent, demonstrated in "research + summarize" flow
- [ ] Anthropic Computer Use live on Pro+ tier, demoed in Flow G

**Launch assets**
- [ ] Landing page deployed with finalized tagline (see §10)
- [ ] Stripe three tiers live: Personal $20, Pro $50, Team $150/seat
- [ ] Four promoted demo videos recorded: Flow A (email cancel), Flow B (DB approval), Flow C (file undo), Flow G (computer use)
- [ ] One trust-signal video recorded: Flow E (refusal)
- [ ] Launch blog post with initial GAIA level-1 score

**Reliability**
- [ ] Production deployment stable for 3+ days (no crashes, no silent failures)
- [ ] 50+ beta users tested at least one full flow
- [ ] Cost per task ≤ $0.20 (budget sanity check)
- [ ] External FIDES signature verifier confirms our signatures pass

**Explicitly NOT in definition of done** (so the list stays honest)
- ~~OSP user-facing provisioning~~ (v1.5)
- ~~GitHub/Linear surfaces~~ (v1.5)
- ~~Mobile app polish~~ (v1.5)
- ~~Switchboard code-exec integration~~ (v2)
- ~~Full Terminal-Bench / BrowseComp submissions~~ (post-launch, weekly cadence)
- ~~SOC2 / enterprise on-prem~~ (v2 or enterprise sales track)

## 14. Open questions (resolve during implementation)

1. **Brand domain**: Stick with yula.dev or acquire aspendos.dev / aspendos.ai?
2. **AGIT TS SDK production status**: needs hands-on verification on Day 1 of sprint
3. **FIDES SDK package name**: confirm `@fides/sdk` vs alternative export path
4. **Computer use sandbox isolation**: per-user dedicated E2B template instance or shared? (cost vs isolation tradeoff)
5. **Eval cadence**: weekly automated GAIA run or only pre-launch one-shot?
6. **Reverse handlers for non-trivial irreversible tools**: how do we handle DB writes (snapshot/restore?), Stripe charges (refund?), API calls without idempotency keys?
7. **Approval timeout policy**: if user doesn't approve within N minutes, auto-cancel or auto-execute?

## 15. References

### Decisions and plans
- ADR 0001 (tech stack pivot): `docs/adr/0001-tech-stack-pivot-2026-04-07.md`
- Phase A migration plan: `docs/superpowers/plans/2026-04-07-yula-v0-stack-migration.md`
- Phase B v1 sprint plan: `docs/superpowers/plans/2026-04-07-yula-v1-manus-alternative.md`

### Memory (decisions persisted across conversations)
- Strategic direction: `~/.claude/projects/-Users-efebarandurmaz-Desktop-aspendos-deploy/memory/project_strategic_direction.md`
- Customer personas: `~/.claude/projects/-Users-efebarandurmaz-Desktop-aspendos-deploy/memory/project_customer_personas.md`
- Supporting projects (FIDES/AGIT/OAPS/OSP/Switchboard): `~/.claude/projects/-Users-efebarandurmaz-Desktop-aspendos-deploy/memory/reference_supporting_projects.md`

### External — competitive landscape
- Manus + E2B architecture: https://e2b.dev/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers
- Manus AI Meta acquisition: https://blogs.lse.ac.uk/businessreview/2026/02/02/metas-2-billion-purchase-of-manus-raises-concerns-over-ai-valuations/
- Genspark vs Manus: https://skywork.ai/skypage/en/genspark-vs-manus-ai-agent-comparison/2036648242546577408
- Manus user problems: https://www.lindy.ai/blog/manus-ai-review

### External — capabilities stack
- E2B pricing: https://e2b.dev/pricing
- Steel.dev pricing: https://docs.steel.dev/overview/pricinglimits
- Anthropic Computer Use: https://platform.claude.com/docs/en/build-with-claude/computer-use
- Computer use reference impl: https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo

### External — new stack (v3 pivot)
- Convex pricing: https://www.convex.dev/pricing
- Convex self-host: https://news.convex.dev/self-hosting/
- Convex Workflow + Durable Agents: https://www.convex.dev/components/durable-agents
- WorkOS pricing: https://workos.com/pricing
- WorkOS AuthKit Next.js: https://workos.com/docs/authkit/nextjs
- Vercel AI SDK v6 Agent: https://ai-sdk.dev/docs/agents/loop-control
- Vercel AI Gateway: https://vercel.com/docs/ai-gateway
- Anthropic prompt caching: https://docs.claude.com/en/docs/build-with-claude/prompt-caching
- Groq pricing: https://groq.com/pricing
- Next.js 16 release: https://nextjs.org/blog/next-16
- Next.js 16 upgrade: https://nextjs.org/docs/app/guides/upgrading/version-16
- Phosphor icons: https://phosphoricons.com/
- SuperMemory GitHub (MIT): https://github.com/supermemoryai/supermemory
- SuperMemory pricing: https://supermemory.ai/pricing
