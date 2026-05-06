#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EXPECTED_BUN_VERSION="$(bun -e "const pkg = await Bun.file('package.json').json(); const pm = pkg.packageManager ?? ''; const match = pm.match(/^bun@(.+)$/); if (!match) throw new Error('packageManager must be pinned as bun@<version>'); console.log(match[1]);")"
ACTUAL_BUN_VERSION="$(bun --version)"

if [[ "$ACTUAL_BUN_VERSION" != "$EXPECTED_BUN_VERSION" ]]; then
  echo "Bun version mismatch: expected $EXPECTED_BUN_VERSION from packageManager, got $ACTUAL_BUN_VERSION" >&2
  exit 1
fi

echo "Bun version OK: $ACTUAL_BUN_VERSION"
