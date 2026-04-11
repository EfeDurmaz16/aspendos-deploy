# Anthropic Computer Use Access — REQUIRED for Day 10

> **Status**: NOT YET REQUESTED — human action required
> **Lead time**: 3-7 business days
> **Blocks**: Day 10 (Phase B Day 5 — Capabilities) of the 15-day v5 push sprint
> **Plan**: `~/.claude/plans/golden-spinning-stallman.md` task P1 + Day 0.7

## Why this matters

Day 10 of the v5 sprint integrates Anthropic Computer Use API as a Pro+ tier feature. The API is gated behind a public beta access request. Without access by Day 10, the integration falls back to "recorded demo only" mode (per plan risk register).

The 3-7 day lead time means **the request must be submitted on Day 0** (today) to land in time. Submitting later compresses the buffer or kills the feature.

## Action

1. Visit https://docs.claude.com/en/docs/build-with-claude/computer-use
2. Click "Request access" or follow the access form link
3. Use the Anthropic console account associated with the YULA Anthropic API key
4. Application context (paste this in the request form):

> YULA is a deterministic AI agent product (Manus alternative) launching in 15 days. We use Anthropic Sonnet 4.6 + the computer-use beta to drive a virtual desktop in an E2B custom template (based on anthropic-quickstarts/computer-use-demo). The feature is gated to our Pro and Team paid tiers ($60 and $180/seat respectively). Every action through the agent loop is cryptographically signed (Ed25519 via FIDES) and committed to a content-addressed audit log (AGIT) before execution, with reversibility class metadata visible to the user on every approval card. We expect ~50-200 Pro+ tier users in the first 30 days, with ~20% running computer-use tasks (small-scale, 5-10 actions per session, max 1568px screenshots scaled per Anthropic guidance). Compliance posture: no logging of screenshot contents beyond the user's own audit timeline. Production at https://yula.dev. GitHub org github.com/aspendos.

5. **Mark this file complete** by editing the Status line to `REQUESTED ON YYYY-MM-DD` once submitted.

## Fallback if access denied or delayed past Day 13

Per plan risk register: Day 10 task `cap-computer-use` falls back to a recorded demo using the existing `anthropic-quickstarts/computer-use-demo` Docker image running in an E2B sandbox locally — **not** behind a real Anthropic API call. The demo video on the landing page would still be authentic, but Pro+ users couldn't run new computer-use tasks until access is granted. Day 13 task 13.4 records the fallback demo.

## Tracking

Once submitted:
- Update Status line above with date
- Note the application reference number (Anthropic typically gives one)
- Watch for response email to your Anthropic console account email
- If granted, set `ANTHROPIC_COMPUTER_USE_ENABLED=true` in production env vars on Day 10
