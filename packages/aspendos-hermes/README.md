# aspendos-hermes

Governance middleware for [Hermes Agent](https://github.com/NousResearch/hermes-agent). Every tool call is signed, committed, and classified before execution.

## Install

```bash
pip install aspendos-hermes
```

## Quick Start

```python
from aspendos_hermes import GovernanceMiddleware, classify_action

middleware = GovernanceMiddleware()

# Wrap any tool function
@middleware.wrap
async def send_email(to: str, subject: str, body: str):
    # your email logic
    return {"sent": True}

# Now every call is: classify → sign → pre-commit → execute → post-commit
result = await send_email(to="alice@example.com", subject="Hello", body="World")
print(result)
# {
#   "status": "executed",
#   "result": {"sent": True},
#   "commit_hash": "abc123...",
#   "class": "compensatable",
#   "badge": "🟡"
# }
```

## Custom Classification

```python
from aspendos_hermes import GovernanceMiddleware, ReversibilityClass, Classification

def my_classifier(tool_name: str, args: dict) -> Classification:
    if tool_name == "delete_account":
        return Classification(
            reversibility_class=ReversibilityClass.APPROVAL_ONLY,
            approval_required=True,
            human_explanation="Account deletion requires approval",
            badge="🟠",
        )
    return classify_action(tool_name, args)

middleware = GovernanceMiddleware(classifier=my_classifier)
```

## Standalone Signing

```python
from aspendos_hermes import generate_keypair, sign_payload, verify_signature

private_key, public_key = generate_keypair()
signature = sign_payload(private_key, "hello world")
assert verify_signature(public_key, "hello world", signature)
```

## Built on Aspendos

Part of the [Aspendos](https://aspendos.dev) open agent OS. Also available for:
- **OpenClaw**: `@aspendos/openclaw` (skill pack)
- **TypeScript**: `@aspendos/core` (npm package)

## License

Apache-2.0
