---
name: surface-worker
description: Handles messaging surface adapters, approval cards, commands, and web pages
---

# Surface Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Features involving: approval card renderers (Slack, Telegram, Discord, WhatsApp, Web), surface adapters (Teams, Google Chat, iMessage, Signal), slash commands (/undo, /doctor), web pages (/timeline, /settings/schedules), Chat SDK integration.

## Required Skills

None.

## Work Procedure

1. **Read context:** Read `mission.md`, `.factory/library/architecture.md`, `.factory/research/chat-sdk.md`. Read existing messaging adapters at `services/api/src/messaging/` and bot code at `services/api/src/bot/` to understand current patterns.

2. **Write tests first (TDD):** For card renderers, test that the output matches the platform's expected format. For adapters, test event handling and routing.

3. **Approval card renderers:** Each surface needs a function that takes an `ApprovalCard` type and returns the platform-native format:
   - **Slack:** Block Kit JSON with section, context (badge), and actions blocks
   - **Telegram:** Object with `text` + `reply_markup.inline_keyboard`
   - **Discord:** Object with `embeds` (badge color as hex) + `components` (action rows)
   - **WhatsApp:** Interactive message with type "button" + action buttons
   - **Web:** React component with badge, explanation, and action buttons

4. **New surface adapters:** Use Chat SDK (`@chat-adapter/*`). Follow the existing patterns in `services/api/src/messaging/`. Each adapter must:
   - Check for platform-specific env vars on initialization
   - Return "not configured" gracefully if credentials are missing
   - Route messages to the agent orchestrator
   - Handle onNewMention and onDirectMessage events

5. **Slash commands:** Parse `/undo` and `/doctor` from incoming messages before passing to the agent. The command parser should work across all surfaces.

6. **Web pages:** Follow existing Next.js App Router patterns in `apps/web/src/app/`. Use shadcn/ui components, Tailwind 4, Phosphor icons. Use Convex hooks (`useQuery`, `useMutation`) for data.

7. **Verify:**
   - All tests pass
   - `bun run build` passes
   - `biome check .` passes
   - For web pages: verify the route exists and renders

## Example Handoff

```json
{
  "salientSummary": "Built shared ApprovalCard type, implemented Slack Block Kit renderer with 4-color badge system, Telegram inline keyboard renderer, Discord components renderer, and WhatsApp interactive renderer. 16 tests passing across all platforms.",
  "whatWasImplemented": "services/api/src/messaging/types.ts — ApprovalCard + BadgeColor types. services/api/src/messaging/slack.ts — renderSlackApprovalCard(). Telegram, Discord, WhatsApp renderers similarly. Tests for all 4 renderers verifying platform-specific output format.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "cd services/api && bunx vitest run src/messaging/__tests__/", "exitCode": 0, "observation": "16 tests passed" },
      { "command": "bun run build", "exitCode": 0, "observation": "Clean build" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "services/api/src/messaging/__tests__/approval-cards.test.ts", "cases": [
        { "name": "Slack card has section, context, actions blocks", "verifies": "Block Kit structure" },
        { "name": "Telegram card has inline keyboard", "verifies": "Telegram API format" },
        { "name": "Badge color matches reversibility class", "verifies": "4-color system consistency" }
      ]}
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- ApprovalCard type or ReversibilityClass not yet defined (precondition failure)
- Chat SDK adapter for a platform doesn't exist or has breaking API changes
- Platform-specific message format requirements are unclear
- Agent orchestrator not yet wired (can't test message routing)
