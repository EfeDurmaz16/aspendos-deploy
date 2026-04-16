"""Governance middleware — classifies, signs, commits every tool call."""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Optional
import time
import json

from .fides import FidesSigner, generate_keypair
from .agit import AgitLog, commit_action


class ReversibilityClass(str, Enum):
    UNDOABLE = "undoable"
    CANCELABLE_WINDOW = "cancelable_window"
    COMPENSATABLE = "compensatable"
    APPROVAL_ONLY = "approval_only"
    IRREVERSIBLE_BLOCKED = "irreversible_blocked"


BADGE = {
    ReversibilityClass.UNDOABLE: "🟢",
    ReversibilityClass.CANCELABLE_WINDOW: "🟢",
    ReversibilityClass.COMPENSATABLE: "🟡",
    ReversibilityClass.APPROVAL_ONLY: "🟠",
    ReversibilityClass.IRREVERSIBLE_BLOCKED: "🔴",
}

DANGEROUS_PATTERNS = [
    ("stripe.charge", lambda args: args.get("amount", 0) > 5000, "Charge exceeds $50"),
    ("db.execute", lambda args: any(k in str(args).upper() for k in ["DROP", "TRUNCATE"]), "Destructive SQL"),
    ("fs.delete", lambda args: args.get("recursive", False), "Recursive deletion"),
    ("git.force_push", lambda args: any(b in str(args) for b in ["main", "master"]), "Force push to protected branch"),
]


@dataclass
class Classification:
    reversibility_class: ReversibilityClass
    approval_required: bool
    human_explanation: str
    badge: str


def classify_action(tool_name: str, args: dict[str, Any]) -> Classification:
    for pattern_tool, check, reason in DANGEROUS_PATTERNS:
        if tool_name.startswith(pattern_tool) and check(args):
            return Classification(
                reversibility_class=ReversibilityClass.IRREVERSIBLE_BLOCKED,
                approval_required=True,
                human_explanation=reason,
                badge=BADGE[ReversibilityClass.IRREVERSIBLE_BLOCKED],
            )

    return Classification(
        reversibility_class=ReversibilityClass.COMPENSATABLE,
        approval_required=False,
        human_explanation=f"Action '{tool_name}' classified as compensatable by default",
        badge=BADGE[ReversibilityClass.COMPENSATABLE],
    )


class GovernanceMiddleware:
    """Wraps a Hermes tool execution function with governance."""

    def __init__(
        self,
        classifier: Optional[Callable] = None,
        on_blocked: Optional[Callable] = None,
        on_approval_needed: Optional[Callable] = None,
    ):
        self.signer = FidesSigner(*generate_keypair())
        self.log = AgitLog()
        self.classifier = classifier or classify_action
        self.on_blocked = on_blocked
        self.on_approval_needed = on_approval_needed

    def wrap(self, tool_fn: Callable) -> Callable:
        """Wrap a tool function with the governance pipeline."""
        middleware = self

        async def governed(*args, **kwargs):
            tool_name = getattr(tool_fn, "__name__", "unknown")
            classification = middleware.classifier(tool_name, kwargs)

            if classification.reversibility_class == ReversibilityClass.IRREVERSIBLE_BLOCKED:
                if middleware.on_blocked:
                    middleware.on_blocked(tool_name, classification)
                return {
                    "status": "blocked",
                    "reason": classification.human_explanation,
                    "class": classification.reversibility_class.value,
                }

            signature = middleware.signer.sign(json.dumps({"tool": tool_name, "args": kwargs}))
            pre_commit = commit_action(middleware.log, "pre", tool_name, kwargs, signature)

            if classification.approval_required:
                if middleware.on_approval_needed:
                    approved = middleware.on_approval_needed(tool_name, classification)
                    if not approved:
                        return {
                            "status": "rejected",
                            "commit_hash": pre_commit["hash"],
                            "class": classification.reversibility_class.value,
                        }

            result = await tool_fn(*args, **kwargs)

            post_commit = commit_action(middleware.log, "post", tool_name, result, signature)

            return {
                "status": "executed",
                "result": result,
                "commit_hash": post_commit["hash"],
                "class": classification.reversibility_class.value,
                "badge": classification.badge,
            }

        governed.__name__ = getattr(tool_fn, "__name__", "governed_tool")
        governed.__aspendos_governed__ = True
        return governed
