# AGIT — Audit Commit Log

AGIT is a git-like version control system for agent actions. Every tool call creates two commits: a pre-commit (intent) and a post-commit (result).

## Core concepts

| Concept | Description |
|---|---|
| **Commit** | A record of an agent action with hash, signature, and metadata |
| **Pre-commit** | Records intent before execution — "I'm about to do X" |
| **Post-commit** | Records result after execution — "X completed with Y" |
| **Branch** | Per-user isolation — `user_{userId}` branches prevent cross-user contamination |
| **Revert** | Undo a commit — restores state to before the action |

## Usage

```typescript
import { getAgit } from '@aspendos/core';

const agit = getAgit();
await agit.initialize();

// Record a pre-commit
const commit = await agit.commitAction({
    userId: 'user_123',
    toolName: 'file.write',
    args: { path: '/tmp/hello.txt', content: 'world' },
    metadata: { reversibility_class: 'undoable', ... },
    fidesSignature: '...',
    fidesDid: 'did:key:z6Mk...',
    type: 'pre',
});

// Get history
const history = await agit.historyForUser('user_123', 50);

// Verify a commit
const valid = await agit.verifyCommit(commit.hash);

// Revert
const result = await agit.revert('user_123', commit.hash);
```

## The invariant chain

Every tool call in Aspendos goes through this exact sequence:

```
classify() → signToolCall() → commitAction(pre) → execute() → commitAction(post)
```

If any step before `execute()` fails, the tool does NOT execute. This is enforced by `runToolStep()` in the orchestrator.

## Per-user branches

Each user gets their own AGIT branch (`user_{userId}`). This means:
- User A's history is isolated from User B's
- Reverting User A's action doesn't affect User B
- Each user sees only their own timeline at `/timeline`

## Timeline UI

The `/timeline` page shows all AGIT commits for the current user with:
- Tool name and reversibility badge
- Human explanation
- Commit hash (clickable → verification endpoint)
- Status (executed / reverted / failed)
- FIDES signature indicator
