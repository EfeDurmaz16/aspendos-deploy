#!/usr/bin/env bash
#
# verify-production.sh
# Comprehensive production readiness verification.
# Checks env vars, external service connectivity, DB migrations, and security config.
#
# Usage: bash scripts/verify-production.sh
# Exit codes:
#   0 - All checks passed
#   1 - One or more critical checks failed

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS=0
WARN=0
FAIL=0

pass()  { echo -e "  ${GREEN}✓${NC} $*"; ((PASS++)); }
warn()  { echo -e "  ${YELLOW}⚠${NC} $*"; ((WARN++)); }
fail()  { echo -e "  ${RED}✗${NC} $*"; ((FAIL++)); }
header(){ echo -e "\n${CYAN}── $* ──${NC}"; }

# ============================================
# 1. REQUIRED ENVIRONMENT VARIABLES
# ============================================
header "Required Environment Variables"

REQUIRED_VARS=(
    DATABASE_URL
    BETTER_AUTH_SECRET
    BETTER_AUTH_URL
    QDRANT_URL
    QDRANT_API_KEY
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
        pass "$var is set"
    else
        fail "$var is NOT set"
    fi
done

# ============================================
# 2. PRODUCTION-REQUIRED VARIABLES
# ============================================
header "Production-Required Variables"

PROD_VARS=(
    ENCRYPTION_KEY
    POLAR_ACCESS_TOKEN
    POLAR_WEBHOOK_SECRET
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN
)

for var in "${PROD_VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
        pass "$var is set"
    else
        warn "$var is NOT set (required in production)"
    fi
done

# Optional but recommended
OPTIONAL_VARS=(
    RESEND_API_KEY
    METRICS_BEARER_TOKEN
)

for var in "${OPTIONAL_VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
        pass "$var is set"
    else
        warn "$var is NOT set (recommended)"
    fi
done

# ============================================
# 3. ENCRYPTION KEY STRENGTH
# ============================================
header "Security Configuration"

if [ -n "${ENCRYPTION_KEY:-}" ]; then
    KEY_LEN=${#ENCRYPTION_KEY}
    if [ "$KEY_LEN" -ge 32 ]; then
        pass "ENCRYPTION_KEY length is sufficient ($KEY_LEN chars)"
    else
        fail "ENCRYPTION_KEY is too short ($KEY_LEN chars, need ≥32)"
    fi
else
    warn "ENCRYPTION_KEY not set — cannot verify strength"
fi

if [ -n "${BETTER_AUTH_SECRET:-}" ]; then
    SECRET_LEN=${#BETTER_AUTH_SECRET}
    if [ "$SECRET_LEN" -ge 32 ]; then
        pass "BETTER_AUTH_SECRET length is sufficient ($SECRET_LEN chars)"
    else
        warn "BETTER_AUTH_SECRET is short ($SECRET_LEN chars, recommend ≥32)"
    fi
fi

# ============================================
# 4. DATABASE CONNECTIVITY
# ============================================
header "Database Connectivity"

if [ -n "${DATABASE_URL:-}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    PRISMA_DIR="$REPO_ROOT/packages/db"

    if [ -f "$PRISMA_DIR/prisma/schema.prisma" ]; then
        pass "Prisma schema found"

        if command -v npx &> /dev/null; then
            cd "$PRISMA_DIR"
            STATUS_OUTPUT=$(npx prisma migrate status 2>&1) || true
            cd "$REPO_ROOT"

            if echo "$STATUS_OUTPUT" | grep -qi "have not yet been applied"; then
                fail "Pending database migrations detected"
            elif echo "$STATUS_OUTPUT" | grep -qi "failed"; then
                fail "Failed migrations detected"
            else
                pass "Database migrations are up to date"
            fi
        else
            warn "npx not found — cannot check migration status"
        fi
    else
        fail "Prisma schema not found at $PRISMA_DIR/prisma/schema.prisma"
    fi
else
    fail "DATABASE_URL not set — cannot check database"
fi

# ============================================
# 5. REDIS CONNECTIVITY
# ============================================
header "Redis Connectivity"

if [ -n "${UPSTASH_REDIS_REST_URL:-}" ] && [ -n "${UPSTASH_REDIS_REST_TOKEN:-}" ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${UPSTASH_REDIS_REST_TOKEN}" \
        "${UPSTASH_REDIS_REST_URL}/ping" \
        --connect-timeout 5 2>/dev/null) || HTTP_CODE="000"

    if [ "$HTTP_CODE" = "200" ]; then
        pass "Redis is reachable (HTTP $HTTP_CODE)"
    else
        fail "Redis unreachable (HTTP $HTTP_CODE)"
    fi
else
    warn "Redis not configured — rate limiting will use in-memory store"
fi

# ============================================
# 6. QDRANT CONNECTIVITY
# ============================================
header "Qdrant Connectivity"

if [ -n "${QDRANT_URL:-}" ]; then
    QDRANT_HEADERS=""
    if [ -n "${QDRANT_API_KEY:-}" ]; then
        QDRANT_HEADERS="-H 'api-key: ${QDRANT_API_KEY}'"
    fi

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
        ${QDRANT_HEADERS} \
        "${QDRANT_URL}/healthz" \
        --connect-timeout 5 2>/dev/null) || HTTP_CODE="000"

    if [ "$HTTP_CODE" = "200" ]; then
        pass "Qdrant is reachable (HTTP $HTTP_CODE)"
    else
        warn "Qdrant unreachable (HTTP $HTTP_CODE) — memory features may not work"
    fi
else
    fail "QDRANT_URL not set"
fi

# ============================================
# 7. SUMMARY
# ============================================
header "Summary"
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${YELLOW}Warnings:${NC} $WARN"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}Production readiness check FAILED with $FAIL critical issue(s).${NC}"
    exit 1
else
    if [ "$WARN" -gt 0 ]; then
        echo -e "${YELLOW}Production readiness check PASSED with $WARN warning(s).${NC}"
    else
        echo -e "${GREEN}Production readiness check PASSED. All clear!${NC}"
    fi
    exit 0
fi
