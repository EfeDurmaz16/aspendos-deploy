# Influencer Outreach Emails — 5 dev influencers

## 1. Simon Willison

Subject: Cryptographic audit trail for AI agents — would love your take

Hi Simon,

I've been following your work on AI agent accountability and prompt injection defense. We built something I think you'd find interesting: an AI agent platform where every tool call is Ed25519-signed and committed to a git-like audit log before execution.

The key insight: we classify every action into 5 reversibility classes (undoable → blocked) and show users a color-coded badge before anything runs. Users can `/undo` on any surface and share verification links with anyone.

The signing layer (FIDES) and audit layer (AGIT) are open-source TypeScript SDKs. The product (YULA) is the commercial app built on top.

Would you be open to taking a look? https://yula.dev

No pressure for coverage — genuinely curious what you'd break first.

Best,
Efe

---

## 2. swyx (Shawn Wang)

Subject: AI agent governance layer — built the thing we keep talking about

Hey Shawn,

You've talked about the "missing middle" between autonomous agents and human control. We built it.

YULA: every tool call → Ed25519 signature → AGIT commit → reversibility classification → user approval card. 5 classes from "undoable" to "blocked." Works on Slack, Telegram, Discord, WhatsApp, web.

The stack is AI SDK v6 + Convex + FIDES (signing) + AGIT (audit). No Python, no LangChain. Pure TypeScript.

Built by a solo founder on a 15-day sprint. The OSS governance layer is at https://github.com/aspendos.

Thought this might be interesting for Latent Space — happy to do a deep dive on the reversibility model design.

Efe

---

## 3. Theo (t3.gg)

Subject: Next.js 16 + Convex + AI SDK v6 — full-stack agent platform

Hey Theo,

Built something you might roast or love: a full-stack AI agent platform on Next.js 16, Convex, Hono, and Vercel AI SDK v6.

The twist: every agent action is cryptographically signed and committed to an audit log. Users can undo, verify, and inspect everything the agent does. 5-class reversibility model, 8 messaging surfaces, BYOK for teams.

Solo founder, TypeScript everything, no Python. The governance layer (FIDES signing + AGIT audit) is MIT-licensed.

https://yula.dev — would love your take on the architecture.

Efe

---

## 4. Fireship (Jeff Delaney)

Subject: "AI agent that proves what it did" — 100-second explainer potential?

Hey Jeff,

Built an AI agent platform where every action is cryptographically signed before execution. Users see a green/yellow/amber/red badge on every tool call and can `/undo` anything.

5-class reversibility model: undoable → cancelable window → compensatable → approval required → blocked.

Stack: Next.js 16 + Convex + Vercel AI SDK v6 + Ed25519 signing (FIDES) + git-for-agents (AGIT).

The 100-second pitch: "What if AI agents had git blame?"

https://yula.dev — the signing + audit layers are open source.

Efe

---

## 5. Scott Hanselman

Subject: Enterprise-ready AI agent audit trail — Ed25519 signatures + HITL approvals

Hi Scott,

We built an AI agent platform designed for enterprise compliance from day one. Every tool call gets:

1. Ed25519 signature (FIDES — like HTTP Message Signatures, RFC 9421)
2. Git-like commit log (AGIT — pre-commit intent + post-commit result)
3. Reversibility classification (5 classes, fail-closed default)
4. Human-in-the-loop approval cards on 8 surfaces

The verification endpoint is public — auditors can verify any action hash without an account.

We're targeting compliance-sensitive teams who want AI agents but need provable accountability. WorkOS AuthKit for SSO, Stripe for billing, Convex for real-time state.

Would love your perspective on the enterprise angle: https://yula.dev

Best,
Efe
