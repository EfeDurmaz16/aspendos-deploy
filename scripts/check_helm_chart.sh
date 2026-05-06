#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHART_DIR="$ROOT_DIR/infra/helm/aspendos"
VALUES_FILE="$CHART_DIR/values.yaml"
SECRET_TEMPLATE="$CHART_DIR/templates/secret.yaml"

fail() {
  echo "[ERROR] $*" >&2
  exit 1
}

[[ -f "$VALUES_FILE" ]] || fail "Missing Helm values file: $VALUES_FILE"
[[ -f "$SECRET_TEMPLATE" ]] || fail "Missing Helm secret template: $SECRET_TEMPLATE"

grep -Eq '^  port: 8080$' "$VALUES_FILE" || fail "Helm API port must match the API image PORT=8080"
grep -Eq '^  port: 3000$' "$VALUES_FILE" || fail "Helm web port must match the web image PORT=3000"
grep -q 'name: {{ .Release.Name }}-env' "$SECRET_TEMPLATE" || fail "Helm env secret must be named <release>-env"

required_env=(
  DATABASE_URL
  NEXT_PUBLIC_CONVEX_URL
  CONVEX_SERVICE_SECRET
  AI_GATEWAY_API_KEY
  SUPERMEMORY_API_KEY
  WORKOS_CLIENT_ID
  WORKOS_API_KEY
  WORKOS_COOKIE_PASSWORD
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  BOT_APPROVAL_WEBHOOK_SECRET
  AGIT_REPO_PATH
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
)

for name in "${required_env[@]}"; do
  grep -Eq "^  ${name}: " "$VALUES_FILE" || fail "Helm values missing required env key: $name"
done

if command -v helm >/dev/null 2>&1; then
  helm template yula "$CHART_DIR" >/dev/null
else
  echo "[WARN] helm command not found; static Helm chart checks passed, render check skipped."
fi

echo "[INFO] Helm chart check passed."
