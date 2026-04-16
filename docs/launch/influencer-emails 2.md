# Influencer Outreach — Rewritten (Mom Test + Cold Email Bible)

## 1. Simon Willison

Subject: the prompt injection post — what about the tool execution side?

Hey Simon,

Your work on prompt injection defense is the reason I started thinking about this. You've covered the input side thoroughly. But nobody's covering the output side — what happens when the agent executes a tool?

We built a layer that classifies every tool call before execution into 5 reversibility classes. Destructive actions get blocked. Everything else gets an Ed25519 signature and a commit hash anyone can verify — no account needed.

Genuinely curious what you'd break first. Mind if I send a link?

— Efe

---

## 2. swyx

Subject: the missing middle — we built it

Hey Shawn,

You've talked about the gap between fully autonomous agents and human control. We shipped something for that gap.

Every tool call gets classified (can you undo it?), signed (Ed25519), and committed (immutable log) before it runs. Users see a color badge and can /undo on any messaging surface.

Would this be interesting for Latent Space? Happy to do a 20-min deep dive on the reversibility model.

— Efe

---

## 3. Theo

Subject: full-stack agent governance in TypeScript — roast or love?

Hey Theo,

Built a governance middleware for AI agents. Next.js 16, Convex, Hono, AI SDK v6 — pure TypeScript, no Python.

The twist: every tool call is cryptographically signed before execution. Users can /undo on Slack/Discord/web. There's a public verification endpoint where anyone can check what the agent did.

Solo founder, 58 commits in 3 days. Would love your take on the architecture.

— Efe

---

## 4. Fireship

Subject: what if AI agents had git blame?

Hey Jeff,

One-liner: we built git blame for AI agents.

Every action gets a commit hash, an Ed25519 signature, and a reversibility class (green = undo, yellow = compensate, red = blocked). Users type /undo and it actually works.

100-second explainer material? The visual is a color-coded badge on every tool call across Slack, Telegram, Discord, web.

— Efe

---

## 5. Scott Hanselman

Subject: the audit question enterprise teams ask about AI agents

Hey Scott,

Enterprise teams want AI agents but can't answer "how do you prove what it did?" for compliance.

We built the answer: Ed25519 signatures on every action, immutable commit log, public verification endpoint. Auditors can check any action hash without an account. Fail-closed by default — unknown tools get blocked.

Would this resonate with the enterprise dev audience? Got 5 min for a quick look?

— Efe
