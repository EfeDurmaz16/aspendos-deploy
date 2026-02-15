#!/bin/bash
# Yula OS - Deploy Script
# Usage:
#   ./deploy.sh frontend   - Deploy frontend node
#   ./deploy.sh backend    - Deploy backend node
#   ./deploy.sh all        - Deploy both (single node)

set -euo pipefail

# ============================================
# CONFIG - Update these
# ============================================
FRONTEND_HOST="frontend.yula.dev"   # CX22 #1 IP or hostname
BACKEND_HOST="backend.yula.dev"     # CX22 #2 IP or hostname
DEPLOY_USER="deploy"
REPO_URL="https://github.com/EfeDurmaz16/aspendos-deploy.git"
DEPLOY_DIR="/opt/yula"

# ============================================
# COLORS
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ============================================
# DEPLOY FUNCTION
# ============================================
deploy_node() {
    local host=$1
    local profile=$2

    log "Deploying ${profile} to ${host}..."

    ssh "${DEPLOY_USER}@${host}" bash <<REMOTE
set -euo pipefail

# Pull latest code
if [ ! -d "${DEPLOY_DIR}" ]; then
    git clone ${REPO_URL} ${DEPLOY_DIR}
else
    cd ${DEPLOY_DIR}
    git fetch origin main
    git reset --hard origin/main
fi

cd ${DEPLOY_DIR}/deploy

# Build and restart
docker compose --profile ${profile} build --no-cache
docker compose --profile ${profile} up -d --remove-orphans

# Cleanup old images
docker image prune -f

# Show status
docker compose --profile ${profile} ps

echo "Deploy complete!"
REMOTE

    log "${profile} deployed to ${host} successfully!"
}

# ============================================
# MAIN
# ============================================
case "${1:-}" in
    frontend)
        deploy_node "$FRONTEND_HOST" "frontend"
        ;;
    backend)
        deploy_node "$BACKEND_HOST" "backend"
        ;;
    all)
        HOST="${FRONTEND_HOST}"
        if [ -n "${2:-}" ]; then HOST="$2"; fi
        log "Deploying all services to ${HOST}..."
        ssh "${DEPLOY_USER}@${HOST}" bash <<REMOTE
set -euo pipefail
if [ ! -d "${DEPLOY_DIR}" ]; then
    git clone ${REPO_URL} ${DEPLOY_DIR}
else
    cd ${DEPLOY_DIR} && git fetch origin main && git reset --hard origin/main
fi
cd ${DEPLOY_DIR}/deploy
docker compose --profile frontend --profile backend build --no-cache
docker compose --profile frontend --profile backend up -d --remove-orphans
docker image prune -f
docker compose --profile frontend --profile backend ps
REMOTE
        log "All services deployed!"
        ;;
    status)
        HOST="${2:-$FRONTEND_HOST}"
        ssh "${DEPLOY_USER}@${HOST}" "cd ${DEPLOY_DIR}/deploy && docker compose ps"
        ;;
    logs)
        HOST="${2:-$FRONTEND_HOST}"
        SERVICE="${3:-}"
        if [ -n "$SERVICE" ]; then
            ssh "${DEPLOY_USER}@${HOST}" "cd ${DEPLOY_DIR}/deploy && docker compose logs -f ${SERVICE}"
        else
            ssh "${DEPLOY_USER}@${HOST}" "cd ${DEPLOY_DIR}/deploy && docker compose logs -f --tail=100"
        fi
        ;;
    *)
        echo "Usage: $0 {frontend|backend|all [host]|status [host]|logs [host] [service]}"
        exit 1
        ;;
esac
