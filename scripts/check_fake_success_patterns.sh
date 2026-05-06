#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Checking fake success patterns..."

NULL_PRISMA_MATCHES="$(rg -n 'const prisma = null as any' services apps packages convex || true)"
if [[ -n "$NULL_PRISMA_MATCHES" ]]; then
  echo "$NULL_PRISMA_MATCHES"
  echo "[ERROR] Null Prisma stubs are forbidden in production source paths." >&2
  exit 1
fi

SCHEDULED_TASK_STATUS_MATCHES="$(rg -n 'ScheduledTaskStatus = \{\} as any' services apps packages convex || true)"
if [[ -n "$SCHEDULED_TASK_STATUS_MATCHES" ]]; then
  echo "$SCHEDULED_TASK_STATUS_MATCHES"
  echo "[ERROR] Empty ScheduledTaskStatus stubs are forbidden in production source paths." >&2
  exit 1
fi

echo "[INFO] Fake success pattern check passed."
