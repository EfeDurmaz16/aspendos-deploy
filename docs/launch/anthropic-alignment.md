# YULA ↔ Anthropic Agent Safety Framework Alignment

> Reference: https://www.anthropic.com/news/our-framework-for-developing-safe-and-trustworthy-agents

## Why this matters for positioning

Anthropic published principles for safe agents. YULA implements them as concrete technical primitives. This is our differentiation vs OpenClaw/Hermes: they're open, we're provable.

## Principle-to-implementation mapping

| Anthropic Principle | YULA Implementation |
|---|---|
| "Humans should retain control over how their goals are pursued, particularly before high-stakes decisions" | 5-class reversibility model: approval_only class pauses execution until human counter-signs via FIDES |
| Read-only permissions by default, explicit approval before system modifications | fail-closed registry: unknown tools default to irreversible_blocked. Only registered + classified tools execute |
| Agents must explain their reasoning before proposing changes | human_explanation field on every ReversibilityMetadata — shown in approval card before execution |
| Users should be able to grant one-time or permanent access | tool_allowlist table in Convex: per-user, per-tool grants via "Always Allow" button |
| Classifiers to detect and guard against prompt injections | external-content.ts wraps untrusted content with trust markers; guard chain's DangerousCommandGuard blocks patterns |
| Transparency in behavior | AGIT pre-commit records intent BEFORE execution; /timeline shows every action with signature |

## What YULA adds beyond Anthropic's framework

Anthropic's framework is principles. YULA adds:

1. **Cryptographic accountability** — Ed25519 signatures on every action (FIDES). Not just logging — external verification without an account.
2. **Structural reversibility** — Not "oops, undo." Instead: classified taxonomy where the system knows HOW to reverse each action class.
3. **Dual signatures** — Agent signs intent, user counter-signs approval. Both signatures are verifiable.
4. **Cross-surface consistency** — Same governance model on Slack, Telegram, Discord, WhatsApp, web. Not just API-level controls.

## Quote for landing page / HN post

> "Anthropic says agents should let humans retain control before high-stakes decisions. We made that structural: every action is classified, signed, and reversible — before it executes. Not guidelines. Code."
