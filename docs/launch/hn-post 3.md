# Show HN: YULA — Deterministic AI agents that prove what they did. And why.

Hi HN,

We built YULA — an AI agent platform where every action is cryptographically signed, committed to an audit log, and reversible by design.

The core idea: AI agents should be accountable. Not "we logged it somewhere" accountable — cryptographically provable, externally verifiable, and undoable.

**How it works:**

Every tool call goes through a 5-step invariant chain:

1. **Classify** — what reversibility class is this action? (undoable / cancelable / compensatable / approval-only / blocked)
2. **Sign** — FIDES produces an Ed25519 signature before execution
3. **Pre-commit** — AGIT records the intent
4. **Execute** — the tool runs (or pauses for approval, or gets blocked)
5. **Post-commit** — AGIT records the result

Users see a color-coded badge on every action: green (undoable), yellow (compensatable), amber (needs approval), red (blocked). They can type `/undo` to reverse the last action, browse `/timeline` to see everything, and share a verification link with anyone.

**What we didn't build:**

- No custom LLM — we use Claude, GPT, Gemini via Vercel AI Gateway
- No custom vector DB — SuperMemory handles memory
- No custom auth — WorkOS AuthKit
- No custom billing — Stripe

We focused entirely on the governance layer: the signing, the audit log, the reversibility model, and the approval flow across 8 messaging surfaces (Slack, Telegram, Discord, WhatsApp, Teams, GChat, iMessage, Signal).

**Stack:** Next.js 16 + Hono + Convex + Vercel AI SDK v6 + FIDES (Ed25519) + AGIT (git-for-agents)

**Try it:** https://yula.dev
**Code:** https://github.com/aspendos

Built by a solo founder. Happy to answer questions about the architecture, the reversibility model, or why we think "deterministic" is a better wedge than "autonomous."
