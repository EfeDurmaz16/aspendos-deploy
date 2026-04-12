#!/usr/bin/env bash
# YULA Load Test — 100 concurrent users, 5 minutes
# Requires: bun add -g autocannon

set -euo pipefail

API_URL="${API_URL:-http://localhost:8787}"
DURATION="${DURATION:-300}"
CONNECTIONS="${CONNECTIONS:-100}"

echo "=== YULA Load Test ==="
echo "Target: ${API_URL}"
echo "Duration: ${DURATION}s"
echo "Connections: ${CONNECTIONS}"
echo ""

echo "--- Health Check ---"
autocannon -c 10 -d 10 "${API_URL}/health"

echo ""
echo "--- Chat Stream (POST) ---"
autocannon \
  -c "${CONNECTIONS}" \
  -d "${DURATION}" \
  -m POST \
  -H "Content-Type=application/json" \
  -b '{"messages":[{"role":"user","content":"Hello"}]}' \
  "${API_URL}/chat"

echo ""
echo "=== Load Test Complete ==="
