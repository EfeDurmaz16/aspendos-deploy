#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[INFO] Verifying generated brand assets..."
bun run brand:generate

BRAND_DIFF="$(
  git status --short -- \
    apps/web/public/logo.png \
    apps/web/public/logo.svg \
    apps/web/public/favicon.svg \
    apps/web/public/favicon.ico \
    apps/web/public/apple-touch-icon.png \
    apps/web/public/icons \
    apps/web/public/og \
    apps/web/public/screenshots || true
)"
if [[ -n "$BRAND_DIFF" ]]; then
  echo "$BRAND_DIFF"
  echo "[ERROR] Generated brand assets are out of date. Run bun run brand:generate and commit the result." >&2
  exit 1
fi

echo "[INFO] Checking tracked local/generated artifact paths..."
TRACKED_LOCAL_ARTIFACTS="$(
  git ls-files \
    apps/yula-video/build \
    klaros/build \
    klaros/test-output \
    .claude/worktrees \
    .worktrees || true
)"
if [[ -n "$TRACKED_LOCAL_ARTIFACTS" ]]; then
  echo "$TRACKED_LOCAL_ARTIFACTS"
  echo "[ERROR] Local worktree/build/test-output artifacts are tracked. Remove them from git before release." >&2
  exit 1
fi

echo "[INFO] Verifying Convex generated API symlink..."
LINK_PATH="apps/web/src/lib/convex/_generated"
EXPECTED_TARGET="../../../../../convex/_generated"

if [[ ! -L "$LINK_PATH" ]]; then
  echo "[ERROR] $LINK_PATH must be a symlink to repo-root convex/_generated." >&2
  exit 1
fi

ACTUAL_TARGET="$(readlink "$LINK_PATH")"
if [[ "$ACTUAL_TARGET" != "$EXPECTED_TARGET" ]]; then
  echo "[ERROR] $LINK_PATH points to $ACTUAL_TARGET; expected $EXPECTED_TARGET." >&2
  exit 1
fi

RESOLVED_TARGET="$(node -e "const fs=require('fs'), path=require('path'); const link=process.argv[1]; console.log(path.resolve(path.dirname(link), fs.readlinkSync(link)))" "$LINK_PATH")"
EXPECTED_RESOLVED="$ROOT_DIR/convex/_generated"
if [[ "$RESOLVED_TARGET" != "$EXPECTED_RESOLVED" ]]; then
  echo "[ERROR] $LINK_PATH resolves to $RESOLVED_TARGET; expected $EXPECTED_RESOLVED." >&2
  exit 1
fi

echo "[INFO] Generated artifact checks passed."
