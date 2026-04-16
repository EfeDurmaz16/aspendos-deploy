# Customer Outreach — Pain-Driven

## Segment A: Fintech CTOs (SOX + AI = nightmare)

Subject: your compliance team is going to ask how you audit the AI agent

Hey [name],

Quick question — when your team deploys an AI agent that touches financial data, how does your auditor verify what it did? Right now the answer for most fintech teams is "we check the logs" and the auditor says "that's not sufficient."

We built a middleware that gives every agent action a cryptographic signature and an immutable commit hash. Auditors can verify any action independently — no account needed, just a URL.

Already works with OpenClaw, Hermes, and any tool-calling framework.

Got 5 min for a quick yes/no on whether this is a real pain for your team?

— Efe

---

## Segment B: Healthcare AI Startups (HIPAA + agents)

Subject: HIPAA audit trail for AI agents — does your team need this?

Hey [name],

Saw you're building [their product/what they do]. Quick q — when your AI agent accesses patient-related data or takes actions in workflows, do you have a way to prove to an auditor exactly what it did and when?

We built a signing + audit layer that creates an immutable, cryptographically verifiable record of every agent action. Each action is classified by reversibility (can it be undone? does it need approval?) before it executes.

Is this a problem your team is actively solving, or is it not on the radar yet?

— Efe

---

## Segment C: YC Batch Agent Founders

Subject: the "how do you audit?" question from investors

Hey [name],

When you pitch [their agent product], have investors asked "how do you prove what the agent did?" yet? If not, they will — especially enterprise prospects.

We built the governance layer so you don't have to. It's a middleware: classify → sign → commit → execute → commit. Every action gets an Ed25519 signature and a reversibility classification. Users can undo, verify, and inspect.

Works as a Python pip package or TypeScript npm module. Drop-in, zero changes to your agent loop.

Mind if I send a 2-min walkthrough?

— Efe

---

## Segment D: DevTool Teams Using AI Agents Internally

Subject: your AI coding agent just mass-deleted test files — who signed off on that?

Hey [name],

Real scenario: AI coding agent runs a cleanup task, deletes files it shouldn't have. Nobody knows which commit triggered it, there's no undo, and the post-mortem is "we'll add better prompting."

We built a middleware that classifies every agent action before execution. Destructive actions get blocked or require approval. Every action is signed and committed to an audit log. Users type /undo and it actually works — because the system knows how to reverse each action class.

Is your team using AI agents for internal workflows? Got 5 min to see if this resonates?

— Efe

---

## Segment E: Enterprise Procurement / IT Security Leads

Subject: AI agent governance checklist — is your vendor answering these?

Hey [name],

When you evaluate AI agent tools for your org, do you ask: (1) can we verify what the agent did? (2) can users undo actions? (3) is there an immutable audit trail? (4) who signed off on destructive actions?

Most agent products answer "we have logs." That's not verifiable, not immutable, and definitely not auditable.

We built the governance standard that answers all four. Cryptographic signatures, immutable commits, 5-class reversibility model, cross-platform approval flow. Already integrates with OpenClaw, Hermes, and any custom agent.

Worth a quick look or should I close this out?

— Efe

---

## Segment F: Solo Founders Automating with AI Agents

Subject: your AI agent just sent an email you didn't approve

Hey [name],

Saw you're building [their product] — solo founder life means automating everything you can. When you let an AI agent handle emails, schedule meetings, or push code, do you have a way to undo it when it gets something wrong?

We built an undo system for AI agents. Every action is classified before it runs — green means undoable, yellow means compensatable, red means blocked. Type /undo on Slack/Telegram/Discord and the last action reverses.

Takes 2 min to set up. Mind if I send the demo?

— Efe
