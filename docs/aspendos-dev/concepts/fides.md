# FIDES — Cryptographic Signing

FIDES provides Ed25519 signatures for every agent action. This is the accountability layer — it proves who did what and when.

## How it works

1. Agent generates an Ed25519 keypair at startup
2. Agent gets a `did:key:z6Mk...` decentralized identifier
3. Before every tool execution, FIDES signs the intent
4. After user approval (for `approval_only` tools), the user counter-signs
5. Both signatures are stored with the AGIT commit

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

## Dual signatures

For `approval_only` tools, two signatures are required:

1. **Agent signature** — proves the agent intended this action
2. **User counter-signature** — proves the human approved it

Both signatures are stored in the AGIT commit and can be independently verified.

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
