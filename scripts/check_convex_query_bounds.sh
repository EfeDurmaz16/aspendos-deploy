#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d convex ]]; then
  exit 0
fi

UNBOUNDED_COLLECTS="$(
  rg -n --glob '!_generated/**' --glob '!**/_generated/**' '\.collect\(' convex || true
)"
UNINDEXED_QUERY_FILTERS="$(
  rg -n --glob '!_generated/**' --glob '!**/_generated/**' '\.filter\(\s*\(?q\b' convex || true
)"

if [[ -n "$UNBOUNDED_COLLECTS" ]]; then
  echo "$UNBOUNDED_COLLECTS"
  echo "[ERROR] Unbounded Convex .collect() queries detected. Use indexed .take(limit) or paginate()." >&2
  exit 1
fi

if [[ -n "$UNINDEXED_QUERY_FILTERS" ]]; then
  echo "$UNINDEXED_QUERY_FILTERS"
  echo "[ERROR] Convex query .filter() usage detected. Add an index and use .withIndex() instead." >&2
  exit 1
fi

echo "[INFO] Convex query bounds check passed."
