#!/usr/bin/env bash
#
# pre-deploy-check.sh
# Verifies database migration state before deployment.
# Exit codes:
#   0 - All migrations applied, safe to deploy
#   1 - Pending migrations or configuration error

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Step 1: Verify DATABASE_URL is set ──────────────────────────────
if [ -z "${DATABASE_URL:-}" ]; then
  log_error "DATABASE_URL environment variable is not set."
  log_error "Set it before running this script or deploying."
  exit 1
fi

log_info "DATABASE_URL is set."

# ── Step 2: Locate the Prisma schema ────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRISMA_DIR="$REPO_ROOT/packages/db"

if [ ! -f "$PRISMA_DIR/prisma/schema.prisma" ]; then
  log_error "Prisma schema not found at $PRISMA_DIR/prisma/schema.prisma"
  exit 1
fi

log_info "Prisma schema found at $PRISMA_DIR/prisma/schema.prisma"

# ── Step 3: Run prisma migrate status ───────────────────────────────
log_info "Checking migration status..."

cd "$PRISMA_DIR"

STATUS_OUTPUT=$(npx prisma migrate status 2>&1) || true

echo ""
echo "$STATUS_OUTPUT"
echo ""

# ── Step 4: Check for pending migrations ────────────────────────────
if echo "$STATUS_OUTPUT" | grep -qi "have not yet been applied"; then
  log_error "There are pending migrations that have not been applied."
  log_error "Run 'prisma migrate deploy' before deploying."
  exit 1
fi

if echo "$STATUS_OUTPUT" | grep -qi "database schema is not in sync"; then
  log_warn "Database schema is out of sync with the Prisma schema."
  log_warn "You may need to create a new migration or run 'prisma migrate deploy'."
  exit 1
fi

if echo "$STATUS_OUTPUT" | grep -qi "failed"; then
  log_error "One or more migrations have failed."
  log_error "Inspect the migration status and resolve before deploying."
  exit 1
fi

# ── Step 5: All clear ──────────────────────────────────────────────
log_info "All migrations are applied. Safe to deploy."
exit 0
