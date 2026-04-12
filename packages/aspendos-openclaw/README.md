# @aspendos/openclaw

Governance skill pack for [OpenClaw](https://github.com/openclaw/openclaw). Adds cryptographic signing, audit trails, and reversibility to every tool call your agent makes.

## Install

```bash
openclaw skills install aspendos-governance
openclaw skills install aspendos-audit
openclaw skills install aspendos-reversibility
```

Or copy the `skills/` directory to your OpenClaw workspace:

```bash
cp -r node_modules/@aspendos/openclaw/skills/* ~/.openclaw/skills/
```

## What it adds

| Skill | What it does |
|---|---|
| `aspendos-governance` | Signs every tool call with Ed25519, classifies into 5 reversibility classes, blocks dangerous patterns |
| `aspendos-audit` | Shows timeline, verifies signatures, explains what the agent did |
| `aspendos-reversibility` | Undo/cancel/compensate actions based on their reversibility class |

## The 5 Reversibility Classes

| Class | Badge | Example |
|---|---|---|
| undoable | 🟢 | File write (snapshot + restore) |
| cancelable_window | 🟢 | Email send (30s cancel window) |
| compensatable | 🟡 | Calendar event (create → delete) |
| approval_only | 🟠 | Database migration (human approval) |
| irreversible_blocked | 🔴 | Large payment (refused) |

## How it works

The governance skill instructs the agent to:
1. **Classify** every action before execution
2. **Sign** the intent with Ed25519 (FIDES protocol)
3. **Commit** the intent to the audit log (AGIT)
4. **Execute** (or block/pause for approval)
5. **Commit** the result

Users can verify any action at `/api/verify/{hash}` without authentication.

## Built on Aspendos

[Aspendos](https://aspendos.dev) is the open agent OS. These skills are the lightest way to add governance to your OpenClaw setup. For the full governance runtime with Convex persistence, HITL approval cards, and multi-surface delivery, see [@aspendos/core](https://github.com/aspendos/aspendos).

## License

Apache-2.0
