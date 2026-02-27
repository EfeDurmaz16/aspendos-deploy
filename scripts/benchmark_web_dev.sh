#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT_DIR/apps/web"
PORT="${PORT:-3010}"
READY_TIMEOUT_SECONDS="${READY_TIMEOUT_SECONDS:-120}"
ROUTE_TIMEOUT_SECONDS="${ROUTE_TIMEOUT_SECONDS:-40}"

LOG_FILE="$(mktemp -t aspendos-web-dev-bench.log.XXXXXX)"
PID_FILE="$(mktemp -t aspendos-web-dev-bench.pid.XXXXXX)"

ROUTES=("/compare" "/features" "/features/memory" "/chat")

cleanup() {
    if [[ -f "$PID_FILE" ]]; then
        if kill -0 "$(cat "$PID_FILE")" >/dev/null 2>&1; then
            kill "$(cat "$PID_FILE")" >/dev/null 2>&1 || true
        fi
    fi
}

trap cleanup EXIT

echo "Starting Next.js dev server on :$PORT"
(
    cd "$APP_DIR"
    bun run dev -- --port "$PORT" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
)

echo "Waiting for server readiness..."
for _ in $(seq 1 "$READY_TIMEOUT_SECONDS"); do
    if rg -n "Ready in" "$LOG_FILE" >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

if ! rg -n "Ready in" "$LOG_FILE" >/dev/null 2>&1; then
    echo "Server did not become ready in ${READY_TIMEOUT_SECONDS}s"
    tail -n 120 "$LOG_FILE"
    exit 1
fi

READY_LINE="$(rg -n "Ready in" "$LOG_FILE" | tail -n 1)"
echo "Ready: $READY_LINE"
echo
echo "Route first-compile benchmark (timeout=${ROUTE_TIMEOUT_SECONDS}s)"

for route in "${ROUTES[@]}"; do
    echo "Requesting $route"
    BEFORE_LINES="$(wc -l <"$LOG_FILE" | tr -d ' ')"
    STATUS="$(curl --max-time "$ROUTE_TIMEOUT_SECONDS" -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT$route" || true)"
    sleep 1

    AFTER_LOG="$(tail -n +"$((BEFORE_LINES + 1))" "$LOG_FILE" || true)"
    COMPILED_LINE="$(printf '%s\n' "$AFTER_LOG" | rg "Compiled ${route} in|Compiling ${route}|GET ${route}" | tail -n 1 || true)"

    if [[ -z "$COMPILED_LINE" ]]; then
        COMPILED_LINE="(no compile line captured)"
    fi

    echo "  status=$STATUS"
    echo "  $COMPILED_LINE"
done

echo
echo "Raw log: $LOG_FILE"
