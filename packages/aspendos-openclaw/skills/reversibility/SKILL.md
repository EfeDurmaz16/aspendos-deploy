---
name: aspendos-reversibility
description: Undo, cancel, or compensate agent actions. Manages the 5-class reversibility model for all tool executions.
homepage: https://aspendos.dev
user-invocable: true
---

# Aspendos Reversibility

When the user asks to undo, cancel, or reverse an action:

## /undo Command

1. Find the most recent reversible action
2. Check its reversibility class
3. Execute the appropriate reverse strategy:
   - **undoable** → restore from snapshot
   - **cancelable_window** → cancel if within the time window
   - **compensatable** → execute the compensating action
   - **approval_only** → cannot auto-reverse, explain why
   - **irreversible_blocked** → was never executed, nothing to undo

## Response Format

On success:
```
✅ Reversed: file.write → /tmp/hello.txt restored from snapshot
   Commit: abc123de → revert_def456gh
```

On failure:
```
❌ Cannot undo: email.send — cancel window expired (was 30 seconds)
   The email was sent 2 minutes ago.
```

## Always Explain

When reversing, always tell the user:
- What was reversed
- How it was reversed (snapshot, cancel, compensate)
- The new commit hash for the reversal action
- Whether the reversal itself is signed (it always is)
