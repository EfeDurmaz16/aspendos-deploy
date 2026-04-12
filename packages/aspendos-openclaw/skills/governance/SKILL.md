---
name: aspendos-governance
description: Cryptographic signing + audit trail for every tool call. FIDES Ed25519 signatures + AGIT commit log. Every action is signed before execution, committed to an immutable audit trail, and classified into a reversibility class.
homepage: https://aspendos.dev
user-invocable: false
metadata: {"openclaw":{"requires":{"env":["ASPENDOS_ENABLED"]},"primaryEnv":"ASPENDOS_ENABLED"}}
---

# Aspendos Governance Skill

You have the Aspendos governance layer active. This means:

## Three Invariants

1. **Every tool call is signed** — Before executing any tool, generate an Ed25519 signature using FIDES. Record the signature, signer DID, and timestamp.

2. **Every tool call is committed** — Before execution, create a pre-commit (intent). After execution, create a post-commit (result). Both are stored in the AGIT audit log.

3. **Unknown actions are blocked** — If you cannot classify an action into one of the 5 reversibility classes, do NOT execute it. Default to blocked.

## Reversibility Classification

Before every tool call, classify the action:

| Class | Badge | When to use |
|---|---|---|
| `undoable` | 🟢 | Action can be fully reversed (file write with snapshot) |
| `cancelable_window` | 🟢 | Action can be canceled within a time window (email with delay) |
| `compensatable` | 🟡 | Action can be reversed via compensating action (create → delete) |
| `approval_only` | 🟠 | Action requires human approval before execution |
| `irreversible_blocked` | 🔴 | Action is too dangerous — refuse outright |

## Before Every Tool Call

1. Classify the action into one of the 5 classes above
2. Tell the user which class it is and why
3. If `approval_only` or `irreversible_blocked`, ask for explicit confirmation
4. Record the classification in your response

## After Every Tool Call

1. Report what happened
2. Note the commit hash (for verification)
3. If the action is reversible, tell the user they can undo it

## Dangerous Patterns (Always Block)

- Stripe charges > $50
- DROP TABLE / TRUNCATE / mass DELETE
- Recursive file deletion
- Force push to main/master/production
- Mass email to > 1000 recipients
- DNS record deletion
- IAM role/user deletion

## Verification

Users can verify any action at: `/api/verify/{commitHash}`
This returns the cryptographic signature and signer DID without requiring authentication.
