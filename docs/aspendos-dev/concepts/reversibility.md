# Reversibility Model

Every tool call in Aspendos is classified into one of 5 reversibility classes before execution.

## The 5 Classes

| Class | Badge | Behavior | Example |
|---|---|---|---|
| `undoable` | 🟢 | Full snapshot + restore | File write with prior content saved |
| `cancelable_window` | 🟢 | Reversible within N seconds | Email with 30s send delay |
| `compensatable` | 🟡 | Reversed via compensating action | Calendar event → DELETE |
| `approval_only` | 🟠 | Paused until human approves | Database migration |
| `irreversible_blocked` | 🔴 | Refused outright, never executes | Stripe charge > $50 |

## Fail-closed by default

Any tool not registered in the `ToolRegistry` is automatically classified as `irreversible_blocked`. This is the safest default — unknown actions are blocked, not allowed.

```typescript
registry.classify('unknown.tool', {});
// → { reversibility_class: 'irreversible_blocked', approval_required: true, ... }
```

## The `classify()` contract

Every tool must implement `classify(args) → ReversibilityMetadata`:

```typescript
interface ReversibilityMetadata {
    reversibility_class: ReversibilityClass;
    approval_required: boolean;
    rollback_strategy: RollbackStrategy;
    rollback_deadline?: string;
    human_explanation: string;
}
```

The `human_explanation` is shown to the user in the approval card before execution. It should explain what will happen and how it can be undone.

## Dynamic classification

Classification can depend on the arguments. For example, `stripe.charge` is `compensatable` for small amounts but `irreversible_blocked` above a threshold:

```typescript
classify(args) {
    const amount = (args as any).amount ?? 0;
    if (amount > 5000) {
        return { reversibility_class: 'irreversible_blocked', ... };
    }
    return { reversibility_class: 'compensatable', ... };
}
```

## Badge colors

| Class | Hex | Emoji |
|---|---|---|
| undoable | `#22c55e` | 🟢 |
| cancelable_window | `#22c55e` | 🟢 |
| compensatable | `#eab308` | 🟡 |
| approval_only | `#f59e0b` | 🟠 |
| irreversible_blocked | `#ef4444` | 🔴 |
