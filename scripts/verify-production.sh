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
    NEXT_PUBLIC_CONVEX_URL
    CONVEX_SERVICE_SECRET
    WORKOS_CLIENT_ID
    WORKOS_API_KEY
    WORKOS_COOKIE_PASSWORD
    NEXT_PUBLIC_WORKOS_REDIRECT_URI
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    BOT_APPROVAL_WEBHOOK_SECRET
    AGIT_REPO_PATH
    AI_GATEWAY_API_KEY
    CRON_SECRET
    UPSTASH_REDIS_REST_URL
    UPSTASH_REDIS_REST_TOKEN
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
    STRIPE_PUBLISHABLE_KEY
    SUPERMEMORY_API_KEY
    BYOK_ENCRYPTION_SECRET
)

for var in "${PROD_VARS[@]}"; do
    if [ -n "${!var:-}" ]; then
        pass "$var is set"
    else
        fail "$var is NOT set (required in production)"
    fi
done

# Optional but recommended
OPTIONAL_VARS=(
    AGENT_RESUME_URL
    CONVEX_DEPLOY_KEY
    METRICS_BEARER_TOKEN
    SENTRY_DSN
    NEXT_PUBLIC_SENTRY_DSN
    DAYTONA_API_KEY
    E2B_API_KEY
    STEEL_API_KEY
    ANTHROPIC_API_KEY
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

if [ -n "${BYOK_ENCRYPTION_SECRET:-}" ]; then
    KEY_LEN=${#BYOK_ENCRYPTION_SECRET}
    if [ "$KEY_LEN" -ge 32 ]; then
        pass "BYOK_ENCRYPTION_SECRET length is sufficient ($KEY_LEN chars)"
    else
        fail "BYOK_ENCRYPTION_SECRET is too short ($KEY_LEN chars, need ≥32)"
    fi
else
    warn "BYOK_ENCRYPTION_SECRET not set — BYOK routes must stay disabled"
fi

if [ -n "${WORKOS_COOKIE_PASSWORD:-}" ]; then
    SECRET_LEN=${#WORKOS_COOKIE_PASSWORD}
    if [ "$SECRET_LEN" -ge 32 ]; then
        pass "WORKOS_COOKIE_PASSWORD length is sufficient ($SECRET_LEN chars)"
    else
        fail "WORKOS_COOKIE_PASSWORD is too short ($SECRET_LEN chars, need ≥32)"
    fi
fi

if [ -n "${CONVEX_SERVICE_SECRET:-}" ]; then
    SECRET_LEN=${#CONVEX_SERVICE_SECRET}
    if [ "$SECRET_LEN" -ge 32 ]; then
        pass "CONVEX_SERVICE_SECRET length is sufficient ($SECRET_LEN chars)"
    else
        fail "CONVEX_SERVICE_SECRET is too short ($SECRET_LEN chars, need ≥32)"
    fi
fi

if [ -n "${BOT_APPROVAL_WEBHOOK_SECRET:-}" ]; then
    SECRET_LEN=${#BOT_APPROVAL_WEBHOOK_SECRET}
    if [ "$SECRET_LEN" -ge 32 ]; then
        pass "BOT_APPROVAL_WEBHOOK_SECRET length is sufficient ($SECRET_LEN chars)"
    else
        fail "BOT_APPROVAL_WEBHOOK_SECRET is too short ($SECRET_LEN chars, need ≥32)"
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
            STATUS_OUTPUT=$(npx prisma migrate status 2>&1)
            STATUS_CODE=$?
            cd "$REPO_ROOT"

            if echo "$STATUS_OUTPUT" | grep -qi "have not yet been applied"; then
                fail "Pending database migrations detected"
            elif echo "$STATUS_OUTPUT" | grep -qi "failed"; then
                fail "Failed migrations detected"
            elif [ "$STATUS_CODE" -ne 0 ]; then
                fail "Could not verify migration status (prisma exited $STATUS_CODE)"
            elif ! echo "$STATUS_OUTPUT" | grep -Eqi "database schema is up to date|already in sync"; then
                fail "Could not confirm database migrations are up to date"
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
    fail "Redis not configured — production rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN"
fi

# ============================================
# 6. OPTIONAL SELF-HOSTED QDRANT CONNECTIVITY
# ============================================
header "Optional Qdrant Connectivity"

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
        warn "Qdrant unreachable (HTTP $HTTP_CODE) — self-hosted vector memory may not work"
    fi
else
    warn "QDRANT_URL not set — assuming SuperMemory/Convex memory path"
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
