# Quickstart

Build a governed AI agent in 5 minutes.

## Install

```bash
bunx create-aspendos-app my-agent
cd my-agent
bun install
```

## Define a tool

Every tool needs a `classify()` function that returns its reversibility class:

```typescript
// src/tools/send-email.ts
import type { ToolDefinition } from '@aspendos/core';

export const sendEmail: ToolDefinition = {
    name: 'email.send',
    description: 'Send an email with a 30-second cancel window',

    classify(args) {
        return {
            reversibility_class: 'cancelable_window',
            approval_required: false,
            rollback_strategy: {
                kind: 'cancel_window',
                deadline: new Date(Date.now() + 30000).toISOString(),
                cancel_api: 'email.cancel',
            },
            human_explanation: 'Email will be queued with a 30s cancel window.',
        };
    },

    async execute(args, ctx) {
        // Your email sending logic here
        return { success: true, data: { messageId: '...' } };
    },

    async reverse(actionId, ctx) {
        // Cancel the queued email
        return { success: true, message: 'Email canceled' };
    },
};
```

## Register and run

```typescript
// src/index.ts
import { ToolRegistry, runToolStep, getFides } from '@aspendos/core';
import { sendEmail } from './tools/send-email';

const registry = new ToolRegistry();
registry.register(sendEmail);

// Every tool call goes through the governance pipeline:
// classify → FIDES sign → AGIT pre-commit → execute → AGIT post-commit
const result = await runToolStep('email.send', {
    to: 'alice@example.com',
    subject: 'Hello',
    body: 'World',
}, { userId: 'user_123' });

console.log(result);
// { toolName: 'email.send', metadata: { reversibility_class: 'cancelable_window', ... }, commitHash: '...', result: { success: true }, blocked: false, awaitingApproval: false }
```

## What just happened?

1. `classify()` determined this is a `cancelable_window` action
2. FIDES signed the tool call with Ed25519
3. AGIT recorded the intent as a pre-commit
4. The tool executed
5. AGIT recorded the result as a post-commit

The user can now `/undo` within 30 seconds, or verify the action at `/api/verify/{commitHash}`.

## Next steps

- [Reversibility Classes](/concepts/reversibility) — the 5-class taxonomy
- [FIDES Signing](/concepts/fides) — cryptographic accountability
- [AGIT Audit Log](/concepts/agit) — git-like history for agents
- [Approval Cards](/guides/approval-cards) — multi-surface HITL
