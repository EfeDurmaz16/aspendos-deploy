# Anthropic Computer Use — Day 10 Integration Reference

> **Status**: OPEN AVAILABILITY (no access request needed — public beta)
> **Blocks**: None. Day 10 unblocked by default.
> **Plan**: `~/.claude/plans/golden-spinning-stallman.md` Day 10 (cap-computer-use)
> **Docs**: https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
> **Reference impl**: https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo

## Status update (verified 2026-04-11)

The current Anthropic docs do **NOT** mention an access request form. Computer Use is a public beta gated only by the `anthropic-beta` header — any account with an API key can use it. The audit's "P1 prerequisite with 3-7 day lead time" was stale; we can proceed on Day 10 without pre-application.

## Integration facts

- **Beta header**: `anthropic-beta: computer-use-2025-11-24`
- **Tool type**: `computer_20251124`
- **Supported models**: Claude Opus 4.6, Sonnet 4.6, Opus 4.5
- **Token overhead**: ~735 tokens/tool definition + 466-499 tokens system prompt
- **Screenshot scaling**: max 1568px per Anthropic guidance (keep it small to save tokens)
- **New `zoom` action**: requires `enable_zoom: true` in tool config
- **ZDR eligible**: yes, no data retention if your account has ZDR enabled

## Day 10 implementation

1. Build E2B custom template at `infra/e2b-templates/computer-use/Dockerfile` based on `anthropic-quickstarts/computer-use-demo`
2. Create `services/api/src/tools/computer-use.ts` wrapping the agent loop with the beta header
3. Gate to Pro+ tiers via `services/api/src/lib/tier-gate.ts`
4. Every action flows through `runToolStep()` → FIDES sign → AGIT pre-commit → execute → AGIT post-commit (same as every other tool)
5. Reversibility class: `approval_only` for any destructive desktop action (file delete, form submit with payment, etc.), `compensatable` for benign navigation

## Risk register downgrade

Previous risk "Anthropic Computer Use access denied or delayed past Day 10" → **REMOVED**. Computer Use is open. Day 13 fallback recorded demo is no longer needed as a contingency, only as marketing asset.
