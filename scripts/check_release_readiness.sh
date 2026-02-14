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

info "Running release readiness checks for critical capabilities..."

# Guard against accidental duplicate source files (e.g. 'layout 2.tsx')
DUPLICATE_SOURCE_FILES="$(find apps/web/src -type f | grep -E ' [0-9]+\.(ts|tsx|js|jsx)$' || true)"
if [[ -n "$DUPLICATE_SOURCE_FILES" ]]; then
  echo "$DUPLICATE_SOURCE_FILES"
  fail "Duplicate web source files detected. Remove numbered duplicates before release."
fi

# Ensure Sentry client config follows Next.js Turbopack-compatible convention
if [[ -f "apps/web/sentry.client.config.ts" ]]; then
  fail "Deprecated file apps/web/sentry.client.config.ts exists. Use instrumentation-client.ts instead."
fi

if [[ ! -f "apps/web/instrumentation-client.ts" ]]; then
  fail "Missing apps/web/instrumentation-client.ts for Sentry client instrumentation."
fi

info "Running API critical tests..."
bun run --cwd services/api test \
  src/routes/__tests__/council.test.ts \
  src/routes/__tests__/pac.test.ts \
  src/routes/__tests__/memory-validation.test.ts \
  src/lib/__tests__/critical-readiness.test.ts

info "Building API..."
bun run --cwd services/api build

if [[ "${STRICT_WEB_TYPECHECK:-0}" == "1" ]]; then
  info "Running strict web typecheck..."
  bun run --cwd apps/web typecheck
else
  warn "Skipping strict web typecheck (set STRICT_WEB_TYPECHECK=1 to enable)."
fi

info "Running migration readiness check (requires DATABASE_URL)..."
if [[ -z "${DATABASE_URL:-}" ]]; then
  warn "DATABASE_URL is not set, skipping scripts/pre-deploy-check.sh in local run."
else
  bash scripts/pre-deploy-check.sh
fi

info "Release readiness checks passed."
