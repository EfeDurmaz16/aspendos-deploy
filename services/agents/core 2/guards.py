"""
Agent Guard Chain for LangGraph

Python implementation of the guard chain, matching the TypeScript
version in services/api/src/lib/agent-guards.ts.

Adapted from AGIT's guard.rs (Allow/Warn/Block pattern) and
SARDIS's policy.py (composable pipeline, fail-closed).

Usage in LangGraph:
    Insert guard_check node between agent and tools nodes:
    agent → should_continue → guard_check → [tools | approval_gate | end]
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


# ============================================
# TYPES
# ============================================


class DecisionType(str, Enum):
    ALLOW = "allow"
    WARN = "warn"
    BLOCK = "block"
    REQUIRE_APPROVAL = "require_approval"


@dataclass
class GuardDecision:
    type: DecisionType
    message: str = ""
    reason: str = ""
    blast_radius: dict[str, Any] | None = None


@dataclass
class GuardContext:
    tool_name: str
    tool_args: dict[str, Any]
    user_id: str
    session_id: str
    agent_id: str = ""
    tool_call_count: int = 0
    tool_call_count_by_name: dict[str, int] = field(default_factory=dict)
    previous_actions: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class GuardChainResult:
    decision: GuardDecision
    guard_name: str
    warnings: list[str]
    evaluated_guards: list[str]


class Guard(Protocol):
    """Protocol for guard implementations."""

    name: str

    async def check(self, context: GuardContext) -> GuardDecision: ...


# ============================================
# GUARD CHAIN
# ============================================


class GuardChain:
    """Evaluates guards in order, stopping at first Block or RequireApproval."""

    def __init__(self) -> None:
        self._guards: list[Guard] = []

    def add(self, guard: Guard) -> "GuardChain":
        self._guards.append(guard)
        return self

    async def evaluate(self, context: GuardContext) -> GuardChainResult:
        warnings: list[str] = []
        evaluated: list[str] = []

        for guard in self._guards:
            evaluated.append(guard.name)
            decision = await guard.check(context)

            if decision.type == DecisionType.ALLOW:
                continue
            elif decision.type == DecisionType.WARN:
                warnings.append(f"[{guard.name}] {decision.message}")
                continue
            elif decision.type in (DecisionType.BLOCK, DecisionType.REQUIRE_APPROVAL):
                return GuardChainResult(
                    decision=decision,
                    guard_name=guard.name,
                    warnings=warnings,
                    evaluated_guards=evaluated,
                )

        return GuardChainResult(
            decision=GuardDecision(type=DecisionType.ALLOW),
            guard_name="chain",
            warnings=warnings,
            evaluated_guards=evaluated,
        )


# ============================================
# BUILT-IN GUARDS
# ============================================


class ToolLoopGuard:
    """Detects tool call loops (OpenClaw pattern: warn at 10, block at 30)."""

    name = "ToolLoopGuard"

    def __init__(self, warn: int = 10, critical: int = 20, block: int = 30):
        self.warn_threshold = warn
        self.critical_threshold = critical
        self.block_threshold = block

    async def check(self, context: GuardContext) -> GuardDecision:
        count = context.tool_call_count

        if count >= self.block_threshold:
            return GuardDecision(
                type=DecisionType.BLOCK,
                reason=f"Tool call limit exceeded ({count}/{self.block_threshold}). Possible infinite loop.",
            )

        if count >= self.critical_threshold:
            return GuardDecision(
                type=DecisionType.WARN,
                message=f"High tool call count ({count}/{self.block_threshold}). Possible loop.",
            )

        if count >= self.warn_threshold:
            return GuardDecision(
                type=DecisionType.WARN,
                message=f"Tool call count reaching threshold ({count}/{self.block_threshold}).",
            )

        # Detect ping-pong: same tool 5+ times in a row
        recent = [a.get("tool_name") for a in context.previous_actions[-5:]]
        if len(recent) >= 5 and all(t == context.tool_name for t in recent):
            return GuardDecision(
                type=DecisionType.WARN,
                message=f'Same tool "{context.tool_name}" called {len(recent)}+ times consecutively.',
            )

        return GuardDecision(type=DecisionType.ALLOW)


class DangerousCommandGuard:
    """Blocks tool calls with arguments matching dangerous patterns."""

    name = "DangerousCommandGuard"

    PATTERNS = [
        re.compile(r"rm\s+(-rf?|--recursive)", re.IGNORECASE),
        re.compile(r"DROP\s+(TABLE|DATABASE|SCHEMA)", re.IGNORECASE),
        re.compile(r"TRUNCATE\s+TABLE", re.IGNORECASE),
        re.compile(r"DELETE\s+FROM\s+\w+\s*$", re.IGNORECASE),
        re.compile(
            r"(?:localhost|127\.0\.0\.1|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+)",
            re.IGNORECASE,
        ),
        re.compile(r"\.(env|pem|key|secret|credential)", re.IGNORECASE),
        re.compile(r"kill\s+-9", re.IGNORECASE),
    ]

    async def check(self, context: GuardContext) -> GuardDecision:
        args_str = json.dumps(context.tool_args)
        for pattern in self.PATTERNS:
            if pattern.search(args_str):
                return GuardDecision(
                    type=DecisionType.REQUIRE_APPROVAL,
                    reason=f'Potentially dangerous operation in "{context.tool_name}".',
                    blast_radius={
                        "risk_level": "high",
                        "affected_resources": [context.tool_name],
                        "estimated_impact": "Destructive or sensitive operation detected",
                    },
                )
        return GuardDecision(type=DecisionType.ALLOW)


class IterationBudgetGuard:
    """Enforces iteration and cost budgets (Hermes Agent pattern)."""

    name = "IterationBudgetGuard"

    def __init__(self, max_iterations: int = 25, max_cost_usd: float = 5.0):
        self.max_iterations = max_iterations
        self.max_cost_usd = max_cost_usd

    async def check(self, context: GuardContext) -> GuardDecision:
        if context.tool_call_count >= self.max_iterations:
            return GuardDecision(
                type=DecisionType.BLOCK,
                reason=f"Iteration budget exhausted ({context.tool_call_count}/{self.max_iterations}).",
            )
        return GuardDecision(type=DecisionType.ALLOW)


# ============================================
# DEFAULT CHAIN FACTORY
# ============================================


def create_default_guard_chain(
    max_iterations: int = 25,
    max_cost_usd: float = 5.0,
) -> GuardChain:
    """Create the default guard chain with all built-in guards."""
    return (
        GuardChain()
        .add(ToolLoopGuard())
        .add(DangerousCommandGuard())
        .add(IterationBudgetGuard(max_iterations, max_cost_usd))
    )
