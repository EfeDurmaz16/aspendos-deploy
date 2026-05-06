#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  echo "[ERROR] $*" >&2
  exit 1
}

require_pattern() {
  local path="$1"
  local pattern="$2"
  local description="$3"

  if ! rg -q "$pattern" "$path"; then
    fail "Missing process-local state guard: $description ($path)"
  fi
}

echo "[INFO] Checking process-local correctness guards..."

require_pattern \
  "services/api/src/middleware/idempotency.ts" \
  "Idempotency requires UPSTASH_REDIS_REST_URL" \
  "idempotency must require Redis in production"

require_pattern \
  "services/api/src/middleware/__tests__/idempotency.test.ts" \
  "refuses production idempotency without Redis configuration" \
  "idempotency production posture must be tested"

require_pattern \
  "services/api/src/services/user-deletion.service.ts" \
  "Configure a durable compliance store" \
  "GDPR export/deletion workflows must fail closed without durable state"

require_pattern \
  "services/api/src/__tests__/integration/gdpr-compliance.test.ts" \
  "refuses process-local compliance state in production by default" \
  "GDPR process-local state posture must be tested"

require_pattern \
  "services/api/src/lib/job-queue.ts" \
  "Configure a durable queue" \
  "background jobs must fail closed without a durable queue"

require_pattern \
  "services/api/src/lib/__tests__/job-queue.test.ts" \
  "refuses process-local jobs in production by default" \
  "job queue process-local state posture must be tested"

require_pattern \
  "services/api/src/audit/agit.ts" \
  "Refusing in-memory AGIT commits" \
  "governance audit history must not silently use memory in production"

require_pattern \
  "services/api/src/middleware/endpoint-rate-limit.ts" \
  "Endpoint rate limiting requires UPSTASH_REDIS_REST_URL" \
  "endpoint rate limiting must require Redis in production"

require_pattern \
  "services/api/src/routes/__tests__/workspace.test.ts" \
  "returns 503 in production instead of using in-memory workspace storage" \
  "workspace placeholder storage must fail closed in production"

echo "[INFO] Process-local correctness guards are present."
