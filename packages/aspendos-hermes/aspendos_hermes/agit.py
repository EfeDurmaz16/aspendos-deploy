"""AGIT audit commit log for Python agents."""

import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Commit:
    hash: str
    parent_hash: str | None
    commit_type: str  # "pre" | "post"
    tool_name: str
    data: Any
    signature: dict
    timestamp: float


class AgitLog:
    def __init__(self):
        self.commits: list[Commit] = []

    def commit(self, commit_type: str, tool_name: str, data: Any, signature: dict) -> Commit:
        parent = self.commits[-1].hash if self.commits else None
        payload = json.dumps({
            "type": commit_type,
            "tool": tool_name,
            "data": str(data)[:500],
            "parent": parent,
            "ts": time.time(),
        }, sort_keys=True)
        hash_val = hashlib.sha256(payload.encode()).hexdigest()[:40]

        commit = Commit(
            hash=hash_val,
            parent_hash=parent,
            commit_type=commit_type,
            tool_name=tool_name,
            data=data,
            signature=signature,
            timestamp=time.time(),
        )
        self.commits.append(commit)
        return commit

    def history(self, limit: int = 50) -> list[dict]:
        return [
            {
                "hash": c.hash,
                "type": c.commit_type,
                "tool": c.tool_name,
                "did": c.signature.get("did", ""),
                "timestamp": c.timestamp,
            }
            for c in reversed(self.commits[-limit:])
        ]

    def verify(self, hash_val: str) -> Commit | None:
        for c in self.commits:
            if c.hash == hash_val:
                return c
        return None


def commit_action(log: AgitLog, commit_type: str, tool_name: str, data: Any, signature: dict) -> dict:
    commit = log.commit(commit_type, tool_name, data, signature)
    return {"hash": commit.hash, "type": commit_type}


def get_history(log: AgitLog, limit: int = 50) -> list[dict]:
    return log.history(limit)


def verify_commit(log: AgitLog, hash_val: str) -> bool:
    return log.verify(hash_val) is not None
