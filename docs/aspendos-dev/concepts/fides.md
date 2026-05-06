# FIDES — Cryptographic Signing

FIDES provides Ed25519 signatures for agent authority. This is the accountability layer — it proves which agent authority signed a governed action payload.

## How it works

1. Agent generates an Ed25519 keypair at startup
2. Agent gets a `did:fides:<public-key>` decentralized identifier
3. Before every governed Convex commit, FIDES signs the canonical semantic governance payload
4. Convex appends the commit and binds it to a deterministic parent-linked commit hash
5. `/audit/verify/:hash` recomputes hash integrity and cryptographically verifies the FIDES signature

## Usage

```typescript
import { getFides } from '@aspendos/core';

const fides = getFides();
await fides.initialize();

// Sign a tool call
const { signature, did, timestamp } = await fides.signToolCall(
    'email.send',
    { to: 'alice@example.com' },
    metadata,
);

// Verify a signature
const valid = await fides.verifySignature(payload, signature, did);
```

For Convex-backed production governance commits, use `signGovernanceCommit()` instead of reusing the generic tool-call payload:

```typescript
const signed = await fides.signGovernanceCommit(
    'email.send',
    { to: 'alice@example.com' },
    metadata,
    { status: 'pending' },
);
```

The governance payload covers `tool_name`, canonical `args`, `reversibility_class`, `status`, and optional `result`. Convex separately binds the commit to `parent_hash` through `payload_hash` and the final commit hash.

## Dual signatures

For `approval_only` tools, two signatures are required:

1. **Agent signature** — proves the agent intended this action
2. **User counter-signature** — proves the human approved it

Both signatures are stored in the AGIT commit and can be independently verified.

## Fallback policy

Production paths must not silently create local fallback signatures. If `@fides/sdk` is unavailable, fallback signing is allowed only in explicit test/local governance modes. Convex HMAC fallback is labeled and requires explicit opt-in via `allow_convex_hmac_fallback=true`.

See [production-spine.md](./production-spine.md) for the current production invariants.

## External verification

Anyone can verify a YULA action without an account:

```
GET /api/verify/{commitHash}
```

Returns the signature, signer DID, timestamp, tool name, and reversibility class. No authentication required.

## Why Ed25519?

- Fast: ~70,000 signatures/second
- Small: 64-byte signatures, 32-byte keys
- Standard: RFC 8032, widely supported
- No certificate authority needed — DIDs are self-sovereign
