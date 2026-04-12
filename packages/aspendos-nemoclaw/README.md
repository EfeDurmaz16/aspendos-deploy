# @aspendos/nemoclaw

Governance layer for [NemoClaw](https://github.com/NVIDIA/NemoClaw). Adds application-level governance on top of NemoClaw's container-level security.

## What this adds

**NemoClaw** secures the **container**: Landlock, seccomp, network namespaces, SSRF validation.

**Aspendos** governs the **agent**: FIDES signing, AGIT audit, reversibility classification, approval flow.

Together: defense in depth. The sandbox cannot escape, AND the agent cannot act without governance.

## Install

```bash
npm install @aspendos/nemoclaw @aspendos/core
```

## Usage

```typescript
import { governedToolCall } from '@aspendos/nemoclaw';

const result = await governedToolCall(
    'file.write',
    { path: '/workspace/hello.txt', content: 'world' },
    { sandboxId: 'nemo-abc123', userId: 'user-456' },
    async (args) => {
        // Your actual tool execution inside NemoClaw sandbox
        return await fetch(`${sandboxUrl}/tools/file.write`, {
            method: 'POST',
            body: JSON.stringify(args),
        }).then(r => r.json());
    },
);
```

## Why both?

| Layer | What it prevents |
|---|---|
| NemoClaw sandbox | Container escape, network exfiltration, privilege escalation |
| Aspendos governance | Unintended actions, dangerous tool calls, lack of accountability |

NemoClaw says "the agent cannot break out." Aspendos says "the agent cannot act without proof."

## License

Apache-2.0
