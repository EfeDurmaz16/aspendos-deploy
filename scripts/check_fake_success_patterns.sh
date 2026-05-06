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

API_PRISMA_FALLBACK_MATCHES="$(rg -n 'readFallbacks|createModelProxy|safe fallback values|Prisma compatibility shim' services/api/src/lib/prisma.ts || true)"
if [[ -n "$API_PRISMA_FALLBACK_MATCHES" ]]; then
  echo "$API_PRISMA_FALLBACK_MATCHES"
  echo "[ERROR] API Prisma compatibility fallback stubs are forbidden; use @aspendos/db directly." >&2
  exit 1
fi

WEB_PRISMA_FALLBACK_MATCHES="$(rg -n 'readFallbacks|createModelProxy|safe fallback values|Prisma compatibility shim' apps/web/src/lib/prisma.ts || true)"
if [[ -n "$WEB_PRISMA_FALLBACK_MATCHES" ]]; then
  echo "$WEB_PRISMA_FALLBACK_MATCHES"
  echo "[ERROR] Web Prisma compatibility fallback stubs are forbidden; use @aspendos/db directly." >&2
  exit 1
fi

FIDES_FALLBACK_MATCHES="$(rg -n 'convex_hmac_fallback|hmacSha256' convex services apps packages || true)"
if [[ -n "$FIDES_FALLBACK_MATCHES" ]]; then
  echo "$FIDES_FALLBACK_MATCHES"
  echo "[ERROR] FIDES/AGIT verification fallback signatures are forbidden in production paths." >&2
  exit 1
fi

echo "[INFO] Fake success pattern check passed."
