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

LEGACY_WORKFLOW_COMMIT_MATCHES="$(rg -n "agent_task_pre_commit|agent_task_post_commit|surface: 'workflow'" convex/workflows.ts || true)"
if [[ -n "$LEGACY_WORKFLOW_COMMIT_MATCHES" ]]; then
  echo "$LEGACY_WORKFLOW_COMMIT_MATCHES"
  echo "[ERROR] Legacy Convex workflows must not fake governance commits with action_log or workflow approvals." >&2
  exit 1
fi

WEB_MEMORY_STUB_MATCHES="$(rg -n 'Qdrant removed|return \[\];|async function (storeMemory|deleteUserMemories|searchConversations)' apps/web/src/app/api/memory apps/web/src/app/api/cron/pac apps/web/src/lib/ai/hybrid.ts apps/web/src/lib/services/hybrid-router.ts || true)"
if [[ -n "$WEB_MEMORY_STUB_MATCHES" ]]; then
  echo "$WEB_MEMORY_STUB_MATCHES"
  echo "[ERROR] Web memory/PAC production routes must not ship disconnected Qdrant-era stubs." >&2
  exit 1
fi

WEB_MEMORY_ERASURE_STUB_MATCHES="$(rg -n 'Qdrant removed|deleteUserMemories|storeMemory\(|qdrant = \{ scroll|Continue even if memory deletion fails' apps/web/src/app/api/account apps/web/src/lib/memory/ingest.ts || true)"
if [[ -n "$WEB_MEMORY_ERASURE_STUB_MATCHES" ]]; then
  echo "$WEB_MEMORY_ERASURE_STUB_MATCHES"
  echo "[ERROR] Web account deletion/import/export must not report success while external memory erasure/storage is disconnected." >&2
  exit 1
fi

SILENT_MEMORY_FAILURE_MATCHES="$(rg -n 'Memory search failed, continue without|Memory search failed|Memory save failed' apps/web/src/app/api services/api/src/routes services/api/src/bot || true)"
if [[ -n "$SILENT_MEMORY_FAILURE_MATCHES" ]]; then
  echo "$SILENT_MEMORY_FAILURE_MATCHES"
  echo "[ERROR] Configured memory failures must fail loud instead of silently continuing." >&2
  exit 1
fi

echo "[INFO] Fake success pattern check passed."
