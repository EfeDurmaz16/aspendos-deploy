# Reddit Launch Posts — 4 subreddits, different angles

## r/LocalLLaMA — Open infrastructure angle

**Title:** We open-sourced the signing + audit layer for AI agents (FIDES + AGIT) — here's what we learned building it

Every tool call our agent makes is Ed25519-signed and committed to a git-like log before execution. We open-sourced both SDKs:

- **FIDES** — Ed25519 signing for agent actions (RFC 9421 HTTP signatures)
- **AGIT** — Git-inspired audit trail with per-user branches, revert, and verification

The product (YULA) uses Claude/GPT/Gemini via gateway — we didn't build a model. We built the accountability layer that sits between the model and the user.

The reversibility model has 5 classes: undoable, cancelable-window, compensatable, approval-only, and irreversible-blocked. Every action gets classified before it runs.

GitHub: https://github.com/aspendos

---

## r/selfhosted — Aspendos OSS angle

**Title:** Aspendos: open-source agent OS with cryptographic audit trail — self-hostable

We're building Aspendos, an open-source agent runtime where every action is signed and auditable. The commercial product (YULA) runs on it, but the core is MIT-licensed.

Stack: TypeScript, Convex (or self-hosted), Ed25519 signing, git-like audit log. No Python, no LangChain.

What you get: every tool call your agent makes gets a cryptographic signature, a pre/post commit, and a reversibility classification. Users can verify, undo, and inspect everything.

Self-hosting story is coming in v2. Right now you can use the SDKs directly: `@fides/sdk` for signing, `@agit/sdk` for the audit log.

---

## r/devops — Compliance + audit angle

**Title:** We built a compliance-friendly AI agent platform — every action is cryptographically signed and externally verifiable

If you're evaluating AI agents for enterprise use, the first question is always: "how do we audit what it did?"

We built a 5-step invariant chain: classify → sign → pre-commit → execute → post-commit. Every tool call gets an Ed25519 signature and a commit hash that anyone can verify — no account needed.

The reversibility model classifies every action before execution: can it be undone? Is there a cancel window? Does it need human approval? Is it blocked entirely?

This makes compliance conversations much simpler: you can point auditors at a verification endpoint and say "here's cryptographic proof of every action the agent took."

---

## r/programming — The reversibility model design story

**Title:** Designing a 5-class reversibility model for AI agent actions

When we built our AI agent platform, we realized the key UX problem isn't "can the agent do things" — it's "can the user undo things."

We designed a taxonomy of 5 reversibility classes:

1. **Undoable** — full snapshot + restore (file writes)
2. **Cancelable window** — reversible within N seconds (email with 30s hold)
3. **Compensatable** — reversed via compensating action (calendar create → delete)
4. **Approval only** — blocked until human counter-signs (DB migrations)
5. **Irreversible blocked** — refused outright (Stripe charge > $50)

Every tool in the registry must implement `classify(args) → ReversibilityMetadata` before it can execute. Unknown tools default to class 5 (fail-closed).

The classification feeds into a color-coded badge system visible across all surfaces (Slack, Telegram, Discord, WhatsApp, web). Users always know the risk level before they approve.

Happy to discuss the design tradeoffs — especially the tension between "fail-closed is safe" and "fail-closed is annoying."
