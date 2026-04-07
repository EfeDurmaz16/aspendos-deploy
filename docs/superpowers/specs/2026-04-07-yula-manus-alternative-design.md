# YULA → Trustworthy General Agent (Manus Alternative)

> Design spec — locked 2026-04-07
> Status: **Approved for implementation planning**
> Author: Efe Baran Durmaz + collaboration session
> Decision context: brainstorming session 2026-04-07 (Patika A locked)

## 1. Decision Summary

YULA pivots from "consumer AI chat with memory" to **"trustworthy general AI agent — Manus alternative with cryptographic provenance, undo, and open infrastructure."**

The product runs primarily in messaging surfaces (Slack, Telegram, Teams, GChat, Discord, WhatsApp, iMessage, Signal, Matrix, Email), with the existing web app repositioned as a **command center + audit/rewind UI**. Three concrete differentiators against Manus, Genspark, Devin, Operator, OpenClaw, and Hermes Agent:

1. **Every action is FIDES-signed** (Ed25519 DID + RFC 9421 HTTP signatures) — cryptographically verifiable audit log
2. **Every action is AGIT-committed** (Git-like VCS for agent state) — full reversibility via `undo` slash command and web rewind UI
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
1. Ship a deployable v1 agent that runs on at least **8 messaging surfaces** plus the web command center
2. Wire **FIDES** (signing) and **AGIT** (commit + undo) deeply into every agent tool call
3. Deliver `undo` as a **user-facing feature** in messaging surfaces and web UI — this is the killer demo
4. Expose a working **virtual computer** (E2B-backed) capable of browser, code execution, and computer use
5. Run **GAIA** and **BrowseComp** evaluation harness; publish at least one credible score
6. Land **3 demo videos** (undo, approval, computer use) for launch
7. Three-tier Stripe pricing live: Personal $20, Pro $50, Team $150/seat
8. Ship a 30-day launch playbook (Product Hunt + Hacker News + Reddit + dev influencer)

### Non-goals (v1)
- Mobile app polish (defer to v1.5)
- OSP service provisioning as a user-facing tool (defer to v1.5)
- Switchboard backend integration (defer to v2)
- GitHub/Linear surfaces (defer to v1.5)
- Custom fine-tuned models (use AI Gateway routing exclusively)
- Self-hosted/on-prem deployment story (defer to v2 or enterprise sales)
- Multi-tenant isolation beyond per-user sandbox (defer to v2)

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
       ┌───────────┬─────────┬───────┼───────┬────────────┬──────────┐
       ▼           ▼         ▼       ▼       ▼            ▼          ▼
  ┌────────┐  ┌────────┐ ┌──────┐ ┌─────┐ ┌──────┐ ┌────────────┐ ┌──────┐
  │ FIDES  │  │  AGIT  │ │ OSP  │ │Mem. │ │Tools │ │Capabilities│ │Approv│
  │ sign   │  │ commit │ │serv. │ │SuPM │ │MCP   │ │ stack      │ │ HITL │
  │ guards │  │ undo   │ │prov. │ │+ PG │ │skills│ │ (§5)       │ │ gates│
  └────────┘  └────────┘ └──────┘ └─────┘ └──────┘ └────────────┘ └──────┘
                                     │
                ┌────────────────────┴───────────────────────┐
                │  AI GATEWAY — Anthropic / OpenAI / Groq    │
                └────────────────────────────────────────────┘
                                     │
                ┌────────────────────┴───────────────────────┐
                │  PERSISTENCE — Postgres (Neon) + Stripe    │
                │  Auth: Better Auth                         │
                └────────────────────────────────────────────┘
```

**Three core invariants** enforced at the orchestrator:

1. **Every tool call is FIDES-signed** before execution — RFC 9421 HTTP message signature with the agent's Ed25519 DID
2. **Every tool call is AGIT-committed** before AND after execution — pre-commit captures intent, post-commit captures result + signature
3. **No irreversible action runs without an approval checkpoint** — guard chain classifies tools as `reversible | reversible-with-window | irreversible`; irreversible actions require explicit human approval via interactive Card on the surface where the request originated

## 5. Capabilities Stack (E2B + Steel + Anthropic Computer Use)

This is the "virtual computer" layer that gives YULA general-agent capability parity with Manus.

### 5.1 Sandbox layer — E2B (primary) + Vercel Sandbox (secondary)

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

### 5.2 Browser automation — Steel.dev

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

### 5.3 Computer use (full desktop) — Anthropic Computer Use API

**Choice: Anthropic Computer Use API** + `anthropic-quickstarts/computer-use-demo` Docker container running inside an E2B custom template.

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

### 5.4 Cost model

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

## 6. Components (existing / wire / build)

| Layer | Component | Status | v1 Action | YULA path |
|---|---|---|---|---|
| Surfaces | Web UI (Next.js) | ✅ exists | Add timeline rewind view + undo button | `apps/web/app/timeline/` (new) |
| | Chat SDK bot router | ✅ exists | Verify production; add `/undo` slash command | `services/api/src/bot/index.ts` |
| | Slack/TG/Discord/WhatsApp | ✅ exists | Smoke test | (existing) |
| | Teams, GChat, iMessage, Signal, Matrix, Email | ❌ missing | Activate Chat SDK adapters (~30–60 LOC each) | `services/api/src/bot/index.ts` |
| | GitHub/Linear adapters | ❌ missing | Defer to v1.5 | — |
| | Mobile RN | 🟡 skeleton | Defer to v1.5 | `apps/mobile/` |
| Router | `/api/chat` web route | ✅ exists | Route through orchestrator | `apps/web/app/api/chat/route.ts` |
| Orchestrator | streamText + tools | ✅ exists | Evolve to plan→step structure | `services/api/src/`, `services/agents/` |
| | Step boundary middleware | 🔨 build | Pre-check (FIDES guard) + post-commit (AGIT) | `services/api/src/orchestrator/step.ts` (new) |
| FIDES | `@fides/sdk` import + identity | 🔧 wire | Per-agent DID, per-user sub-identity | `services/api/src/governance/fides.ts` (new) |
| | Request signing (RFC 9421) | 🔧 wire | Sign every tool call | same |
| | Guard chain | ✅ exists | Merge with FIDES policy | `services/api/src/governance/` |
| | Approval gates | ✅ exists | Inline buttons in messaging Cards | `apps/web/app/agent-log/`, new messaging cards |
| AGIT | `agit` TS SDK import + Postgres state | 🔨 build | Per-user repo | `services/api/src/audit/agit.ts` (new) |
| | Commit per action | 🔨 build | Pre + post commit with signature | `services/api/src/audit/commit.ts` (new) |
| | `undo` command parser | 🔨 build | AGIT revert + tool-specific reverse handlers | `services/api/src/audit/undo.ts` (new) |
| | Reversible classifier | 🔨 build | Per-tool `reversible: bool` + `reverseHandler` | `services/api/src/tools/registry.ts` |
| | Web rewind UI | 🔨 build | Timeline view, click → preview, "rewind here" | `apps/web/app/timeline/page.tsx` (new) |
| Capabilities | E2B sandbox client | 🔧 wire | `services/api/src/sandbox/e2b.ts` (new) | new |
| | Vercel Sandbox client (secondary) | 🔧 wire | For trivial code tasks | `services/api/src/sandbox/vercel.ts` (new) |
| | Steel.dev browser client | 🔧 wire | Tool implementation | `services/api/src/tools/browser.ts` (new) |
| | Anthropic Computer Use loop | 🔨 build | Custom E2B template + agent loop | `services/api/src/tools/computer-use.ts` (new) |
| | E2B custom template (computer-use) | 🔨 build | Docker image based on `anthropic-quickstarts/computer-use-demo` | `infra/e2b-templates/computer-use/` (new) |
| | OSP provisioning tool | 🔧 wire | v1.5 only | deferred |
| | Switchboard code-exec | — | v2 only | deferred |
| Memory | SuperMemory + PG | ✅ exists | Verify cross-surface unification | `services/api/src/memory/` |
| | Agentic RAG router | ✅ exists | No change | — |
| Foundation | Better Auth | ✅ exists | Sub-identity → FIDES DID mapping | `services/api/src/auth/` |
| | Stripe | ✅ exists | Three-tier setup | (config only) |
| | Vercel AI Gateway | ✅ exists | Provider arbitrage config | (config) |
| Eval | GAIA + BrowseComp harness | 🔨 build | Weekly automated run, README badge | `services/eval/` (new) |

**Tally**: 12 components untouched, 7 extended, 8 wired (SDK import + glue), 9 built from scratch. The "80% existing code" claim is mathematically supported.

## 7. Key user flows

### Flow A — Undo demo (B2C killer)

```
1. User (Slack):  "@yula john@acme.com'a meeting confirmation maili at"
2. Bot router  →  Agent orchestrator
3. Orchestrator plans: [draft_email, send_email]
4. FIDES sign step 1 (draft) — reversible
5. AGIT commit step 1 — state: { draft: {...} }
6. FIDES sign step 2 (send) — irreversible → guard says "auto-execute with rollback strategy"
7. Strategy: send via SES with 30s hold (SES message scheduling)
8. AGIT commit step 2 — state: { sent: { id: msg-123, hold_until: T+30s } }
9. Bot posts: "Email sent. Reply 'undo' within 30s to recall."
10. User: "undo"
11. AGIT revert HEAD~1 → SES recall msg-123 → confirm
12. Bot posts: "Reverted. Email not sent."
```

This is the launch tagline demo. 30-second screen recording → Twitter virality target.

### Flow B — Approval gate (B2B compliance)

```
1. User (Slack #ops): "@yula production DB'ye yeni column ekle"
2. Plan: [generate_migration, apply_migration]
3. Guard: BlastRadius detects "production DB write" → severity HIGH → auto-approval BLOCKED
4. Bot posts a Card:
     ┌─────────────────────────────┐
     │ Action requires approval     │
     │ Tool: postgres.migrate       │
     │ Target: prod.users           │
     │ Diff: + email_verified BOOL  │
     │ Signed by: yula-agent-did:.. │
     │ [ Approve ] [ Reject ]       │
     └─────────────────────────────┘
5. User clicks Approve
6. FIDES counter-sign with user DID
7. AGIT commit with both signatures (yula + user)
8. Apply migration
9. Audit log: cryptographically verifiable, who approved, when, what changed
```

This is the enterprise sales demo for CISO conversations.

### Flow C — Computer use (Manus parity demo)

```
1. User (Slack): "@yula bu PDF formunu doldur, bilgileri spreadsheet'e gir"
2. Plan: [download_pdf, extract_data, open_spreadsheet_app, fill_cells]
3. Computer use task: spawn E2B sandbox with anthropic-computer-use template
4. Anthropic Sonnet 4.6 + screenshots loop drives Firefox + LibreOffice in Xvfb
5. Each screenshot+action FIDES sign + AGIT commit
6. Bot posts: "Done. Filled 47 rows. Reply 'undo' to revert spreadsheet."
```

This is the Manus parity demo — same task, but auditable + reversible.

### Flow D — OSP provisioning (v1.5)

```
1. User (Slack): "@yula yeni proje için Supabase + Vercel + Stripe kur"
2. Plan: [discover_supabase, provision_supabase, discover_vercel, provision_vercel, ...]
3. OSP tool: GET supabase.com/.well-known/osp.json → offerings list
4. Provision: POST /osp/v1/provision { offering, tier, public_key }
5. Receive Ed25519-encrypted credentials, AGIT commit, FIDES sign
6. Repeat for Vercel, Stripe
7. Bot posts: "Done. 3 services provisioned. Type 'undo provision' to deprovision all."
```

Dev wedge launch. v1.5 only — not blocking v1 launch.

## 8. 1-week sprint (v1 build)

| Day | Track | Deliverable |
|---|---|---|
| **Day 1** | FIDES integration | `services/api/src/governance/fides.ts` — agent DID at startup, sign function for tool call requests |
| **Day 1** | AGIT integration | `services/api/src/audit/agit.ts` — per-user repo init, commit primitive with Postgres state adapter |
| **Day 2** | Step middleware | Pre/post commit wrapper around every tool call in orchestrator; signature stored in commit metadata |
| **Day 2** | Tool registry | Annotate every existing tool with `reversible`, `reverseHandler`, `severity` fields |
| **Day 3** | Undo command | `/undo` parser for Slack/TG/Discord/WhatsApp; AGIT revert; reverse handlers for 5 tools (email, file write, calendar, message, db write) |
| **Day 3** | Web rewind UI | `apps/web/app/timeline/page.tsx` — chronological commit list, click → preview, rewind button |
| **Day 4** | New surfaces | Activate Teams, GChat, iMessage, Signal, Matrix, Email Chat SDK adapters in `services/api/src/bot/index.ts` |
| **Day 4** | Browser tool | `services/api/src/tools/browser.ts` — Steel.dev client with Playwright pattern |
| **Day 5** | E2B sandbox | `services/api/src/sandbox/e2b.ts` — sandbox lifecycle, file ops, command exec |
| **Day 5** | Computer use template | `infra/e2b-templates/computer-use/` Dockerfile based on `anthropic-quickstarts/computer-use-demo` + push to E2B custom templates |
| **Day 5** | Computer use tool | `services/api/src/tools/computer-use.ts` — spawn sandbox from template, run Anthropic agent loop |
| **Day 5** | Approval cards | Slack/Teams interactive Card with Approve/Reject buttons → FIDES counter-sign + AGIT commit |
| **Day 6** | Eval harness | `services/eval/` — GAIA level-1 subset (50 tasks), BrowseComp subset; first run target ≥ 50% on GAIA |
| **Day 6** | Pricing setup | Stripe three tiers: Personal $20, Pro $50, Team $150/seat |
| **Day 7** | E2E integration | Run Flow A, B, C end-to-end; record demo videos (30s each) |
| **Day 7** | Landing rewrite | yula.dev (or new brand domain) with new positioning, taglines, demo videos |

**Definition of done at end of Day 7**: launch-ready v1, 3 demo videos, GAIA score elde, pricing live, 8 messaging surfaces functional.

## 9. Brand pivot

YULA = "Your Universal Learning Assistant" — too narrow for "trustworthy general agent" positioning. Three options considered:

**Option 1**: Keep YULA, redefine acronym ("Your Undoable Learning Agent") — preserves yula.dev domain
**Option 2 (RECOMMENDED)**: **Aspendos parent brand + YULA as consumer product**
- Aspendos = open agent OS, the FIDES + AGIT + OAPS + OSP + Switchboard stack
- YULA = consumer product on top, "the Aspendos chat agent"
- Repo is already `aspendos-deploy`, natural progression
- Vercel + Next.js model: infrastructure brand + product brand ascend together
- Allows enterprise sales to lead with "Built on Aspendos" while consumer stays with YULA's warmer brand
**Option 3**: Full rebrand — name candidates: Vouch, Sentinel, Praxis, Tenet, Charter, Origo, Helm, Atlas, Compass

**Locked: Option 2 (Aspendos parent + YULA product).**

### Tagline matrix (test in launch)

- **Aspendos**: *"The open agent OS. Trust, audit, and rollback for autonomous AI."*
- **YULA**: *"The general AI agent you can actually trust. And undo. Built on Aspendos."*

Alternates to A/B test:
- "Act. Audit. Undo. Repeat."
- "AI agents that prove what they did."
- "The only AI agent with a git history."
- "Manus alternative. Cryptographically verified. Reversible."

## 10. 30-day launch playbook

| Week | Action | Channel | Target |
|---|---|---|---|
| **W-1 (sprint)** | v1 build complete, demo videos, landing, GAIA score | — | Launch-ready |
| **W1** | Soft launch — private beta, 100 invites | Twitter/X (sen + dev community) | 100 signup, 20 actively testing |
| **W1** | Demo videos: undo, approval, computer use | Twitter, LinkedIn, Reddit r/LocalLLaMA | 10k impressions, 5 viral tweets |
| **W2** | HN launch: *"Show HN: YULA — the general AI agent you can undo (open infrastructure: FIDES + AGIT + OAPS)"* | Hacker News front page | Top 10, 500+ comments, 1k signups |
| **W2** | Reddit launches: r/selfhosted, r/LocalLLaMA, r/MachineLearning | Reddit | 500 upvotes/post |
| **W3** | Product Hunt launch (Tuesday) | PH | Top 3 of the day, 1k upvotes |
| **W3** | Influencer outreach (Simon Willison, swyx, Theo, Fireship) | Twitter DM with custom demo | 5 retweets, 2 blog mentions |
| **W4** | Eval blog post: *"Why YULA scored X on GAIA — and why every action is reversible"* | Aspendos blog | 50k views |
| **W4** | Open source FIDES + AGIT + OAPS under "Aspendos" GitHub org | GitHub | 5k stars combined |
| **W4** | First B2B outreach (CISO targeted) | LinkedIn cold email | 30 calls booked |

**Target metrics at day 30**:
- 5,000 free signups
- 200–500 paying customers ($4–10k MRR)
- 10–30 enterprise calls
- HN front page or PH top 3 (at least one)
- GAIA score published, bench credibility established
- 5k+ GitHub stars (FIDES + AGIT + OAPS combined)

## 11. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reliability — "stable Manus" pitch fails on launch day | High | High | Load test before launch, autoscale Vercel functions, fallback queue, soft launch first |
| GAIA score is mediocre | Medium | High | Run eval BEFORE public launch; if score is bad, pivot pitch to "trustworthy" not "best" |
| "General agent" pitch is too abstract | High | Medium | Lead with concrete demo flows, not abstract claims; AGIT undo demo is the wedge |
| LLM token cost burns margin | High | High | AI Gateway provider arbitrage, hard per-user limits, aggressive caching, alert on cost anomalies |
| OpenClaw/Hermes community sees us as competitor | Medium | Low | Position as "managed + safer", offer migration tools, contribute back where possible |
| Meta launches "Manus 2.0" | Medium | High | Window is real but short — move fast. Differentiation = open infrastructure (Meta is closed) |
| FIDES/AGIT SDKs aren't fully production ready | Medium | High | Day 1–2 of sprint includes verification + fixes; if blocking, ship with reduced depth and add post-launch |
| E2B vendor lock-in | Low | Medium | Daytona escape hatch (identical pricing, hosted+self-host); abstract sandbox interface in `services/api/src/sandbox/` |
| Computer use latency complaint | Medium | Medium | Anthropic itself warns "too slow for human-AI interaction" — use messaging-first async pattern, set user expectations explicitly |
| Brand confusion (Aspendos vs YULA) | Low | Low | Clear hierarchy: Aspendos = infrastructure brand (dev/enterprise), YULA = consumer product |

## 12. Definition of done — v1 launch

- [ ] Bot responds on at least 8 messaging surfaces (Slack, Telegram, Discord, WhatsApp, Teams, GChat, iMessage, Signal)
- [ ] Every agent action FIDES-signed + AGIT-committed
- [ ] `/undo` slash command works on Slack, Telegram, Discord, WhatsApp at minimum
- [ ] Web UI timeline view at `/timeline` with FIDES badges and rewind buttons
- [ ] E2B sandbox spawning works for code execution
- [ ] Steel.dev browser tool callable from agent
- [ ] Anthropic Computer Use template runs end-to-end on E2B
- [ ] At least one credible score on GAIA, BrowseComp, or Terminal-Bench
- [ ] Three demo videos recorded (Flow A, B, C)
- [ ] Landing page deployed with new positioning
- [ ] Stripe pricing tiers live
- [ ] Beta cohort of 50+ users tested
- [ ] Production deployment stable for 3+ days (no crashes)

## 13. Open questions (resolve during implementation)

1. **Brand domain**: Stick with yula.dev or acquire aspendos.dev / aspendos.ai?
2. **AGIT TS SDK production status**: needs hands-on verification on Day 1 of sprint
3. **FIDES SDK package name**: confirm `@fides/sdk` vs alternative export path
4. **Computer use sandbox isolation**: per-user dedicated E2B template instance or shared? (cost vs isolation tradeoff)
5. **Eval cadence**: weekly automated GAIA run or only pre-launch one-shot?
6. **Reverse handlers for non-trivial irreversible tools**: how do we handle DB writes (snapshot/restore?), Stripe charges (refund?), API calls without idempotency keys?
7. **Approval timeout policy**: if user doesn't approve within N minutes, auto-cancel or auto-execute?

## 14. References

- Strategic context: brainstorming session 2026-04-07
- Memory: `~/.claude/projects/-Users-efebarandurmaz-Desktop-aspendos-deploy/memory/project_strategic_direction.md`
- Supporting projects: `~/.claude/projects/-Users-efebarandurmaz-Desktop-aspendos-deploy/memory/reference_supporting_projects.md`
- Manus + E2B architecture: https://e2b.dev/blog/how-manus-uses-e2b-to-provide-agents-with-virtual-computers
- E2B pricing: https://e2b.dev/pricing
- Vercel Sandbox: https://vercel.com/docs/vercel-sandbox/pricing
- Steel.dev pricing: https://docs.steel.dev/overview/pricinglimits
- Anthropic Computer Use: https://platform.claude.com/docs/en/build-with-claude/computer-use
- Computer use reference impl: https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo
- Manus AI Meta acquisition: https://blogs.lse.ac.uk/businessreview/2026/02/02/metas-2-billion-purchase-of-manus-raises-concerns-over-ai-valuations/
- Genspark vs Manus: https://skywork.ai/skypage/en/genspark-vs-manus-ai-agent-comparison/2036648242546577408
- Manus user problems: https://www.lindy.ai/blog/manus-ai-review
