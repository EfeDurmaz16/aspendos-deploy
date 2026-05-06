#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

fail() {
  error "$1"
  exit 1
}

require_database_url_for_release() {
  [[ "${RELEASE_REQUIRE_DATABASE_URL:-}" == "true" || "${CI:-}" == "true" ]]
}

require_secret_for_release() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    if require_database_url_for_release; then
      fail "$name is required for CI/release. Set $name before deploying production paths."
    fi
    warn "$name is not set; local-only run cannot exercise the matching production path."
  fi
}

info "Running release readiness checks for critical capabilities..."

info "Checking pinned toolchain..."
bash scripts/check_toolchain.sh

info "Checking generated artifacts..."
bash scripts/check_generated_artifacts.sh

# Guard against accidental duplicate source/release files (e.g. 'layout 2.tsx'
# or macOS conflict copies such as '.env 2.example').
DUPLICATE_SOURCE_FILES="$(git ls-files \
  | while IFS= read -r path; do [[ -e "$path" ]] && printf '%s\n' "$path"; done \
  | grep -E '(^|/)\\.?.+ [0-9]+(\\.[^/]+)?$' || true)"
if [[ -n "$DUPLICATE_SOURCE_FILES" ]]; then
  echo "$DUPLICATE_SOURCE_FILES"
  fail "Duplicate tracked source/release files detected. Remove numbered duplicates before release."
fi

# Ensure Sentry client config follows Next.js Turbopack-compatible convention
if [[ -f "apps/web/sentry.client.config.ts" ]]; then
  fail "Deprecated file apps/web/sentry.client.config.ts exists. Use instrumentation-client.ts instead."
fi

if [[ ! -f "apps/web/src/instrumentation-client.ts" ]]; then
  fail "Missing apps/web/src/instrumentation-client.ts for Sentry client instrumentation."
fi

info "Verifying Prisma schema and generated client..."
if [[ ! -f "packages/db/prisma/schema.prisma" ]]; then
  fail "Missing packages/db/prisma/schema.prisma. Restore or remove @aspendos/db production paths before release."
fi
bun run --cwd packages/db db:generate

info "Running migration readiness check (requires DATABASE_URL)..."
if [[ -z "${DATABASE_URL:-}" ]]; then
  if require_database_url_for_release; then
    fail "DATABASE_URL is required for CI/release migration readiness. Set DATABASE_URL or run locally outside CI for a build-only check."
  fi
  warn "DATABASE_URL is not set, skipping scripts/pre-deploy-check.sh in local run."
else
  bash scripts/pre-deploy-check.sh
fi

info "Checking Convex query bounds..."
bash scripts/check_convex_query_bounds.sh

info "Checking process-local correctness posture..."
bash scripts/check_process_local_state.sh

info "Checking Helm deployment chart..."
bash scripts/check_helm_chart.sh

info "Checking server-only Convex secret posture..."
require_secret_for_release CONVEX_SERVICE_SECRET
require_secret_for_release BOT_APPROVAL_WEBHOOK_SECRET
require_secret_for_release STRIPE_WEBHOOK_SECRET

info "Checking distributed rate limit secret posture..."
require_secret_for_release UPSTASH_REDIS_REST_URL
require_secret_for_release UPSTASH_REDIS_REST_TOKEN

info "Running API critical tests..."
bun run --cwd services/api test \
  src/routes/__tests__/council.test.ts \
  src/routes/__tests__/pac.test.ts \
  src/routes/__tests__/memory-validation.test.ts \
  src/lib/__tests__/critical-readiness.test.ts \
  src/routes/__tests__/public-api-verify.test.ts \
  src/tools/__tests__/reference-tools.test.ts \
  src/orchestrator/__tests__/step.test.ts \
  src/services/__tests__/approval.service.test.ts \
  src/routes/__tests__/api-keys.test.ts \
  src/routes/__tests__/api-key-route-permissions.test.ts \
  src/routes/__tests__/account-session-boundary.test.ts \
  src/routes/__tests__/notifications.test.ts \
  src/routes/__tests__/workspace.test.ts \
  src/__tests__/integration/gdpr-compliance.test.ts \
  src/middleware/__tests__/idempotency.test.ts \
  src/lib/__tests__/job-queue.test.ts

info "Running web governance and messaging critical tests..."
bun run --cwd apps/web test \
  test/app/api/chat/stream-route.test.ts \
  src/lib/governance/__tests__/step-middleware.test.ts \
  test/lib/api/undo-route.test.ts \
  test/lib/messaging/bot-actions.test.ts \
  test/lib/messaging/bot-approval.test.ts

info "Running core deterministic flow tests..."
bun run test:core

info "Building API..."
bun run --cwd services/api build

info "Building web app..."
rm -rf apps/web/.next
bun run --cwd apps/web build

info "Running web typecheck..."
bun run --cwd apps/web typecheck

info "Running Convex typecheck..."
bun run convex:typecheck

info "Release readiness checks passed."
