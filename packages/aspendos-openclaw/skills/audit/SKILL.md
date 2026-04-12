---
name: aspendos-audit
description: View and search the AGIT audit trail. Show timeline of all agent actions with signatures, reversibility classes, and verification links.
homepage: https://aspendos.dev
user-invocable: true
---

# Aspendos Audit Trail

When the user asks about their action history, timeline, or wants to verify what you did:

## Commands

- "show my timeline" → List recent actions with tool name, class, status, and commit hash
- "verify [hash]" → Check the cryptographic signature for a specific action
- "what did you do?" → Summarize recent actions with their reversibility status
- "undo last action" → If the last action is undoable or cancelable, reverse it

## Timeline Format

For each action, show:
```
🟢 file.write — wrote /tmp/hello.txt (commit: abc123de)
   Undoable · Signed by did:key:z6Mk... · 2 minutes ago
```

## Verification

When asked to verify, explain:
- The Ed25519 signature proves the agent (me) signed this action
- The commit hash is deterministic — same action = same hash
- Anyone can verify at /api/verify/{hash} without an account
