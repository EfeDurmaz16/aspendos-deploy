#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ALLOWLIST="$ROOT_DIR/scripts/convex_service_secret_surface.allowlist"

if [[ ! -f "$ALLOWLIST" ]]; then
  echo "[ERROR] Missing $ALLOWLIST" >&2
  exit 1
fi

tmp_actual="$(mktemp)"
tmp_expected="$(mktemp)"
trap 'rm -f "$tmp_actual" "$tmp_expected"' EXIT

duplicate_helpers="$(
  grep -R --line-number --include='*.ts' 'function requireServiceSecret' "$ROOT_DIR/convex" \
    | grep -v '/_generated/' \
    | grep -v '/lib/serviceSecret.ts:' || true
)"
if [[ -n "$duplicate_helpers" ]]; then
  echo "$duplicate_helpers" >&2
  echo "[ERROR] Convex service secret checks must use convex/lib/serviceSecret.ts." >&2
  exit 1
fi

while IFS= read -r file; do
  module="${file#"$ROOT_DIR"/convex/}"
  module="${module%.ts}"
  module="${module//\//.}"

  awk -v module="$module" '
    function flush() {
      if (in_function && has_service_secret) {
        print module "." function_name
      }
      in_function = 0
      has_service_secret = 0
      function_name = ""
    }

    /^export const [A-Za-z0-9_]+ = (query|mutation|action)\(\{/ {
      flush()
      function_name = $3
      in_function = 1
      has_service_secret = 0
      next
    }

    /^export const [A-Za-z0-9_]+ = / {
      flush()
      next
    }

    in_function && /service_secret/ {
      has_service_secret = 1
    }

    END {
      flush()
    }
  ' "$file"
done < <(find "$ROOT_DIR/convex" \
  -path "$ROOT_DIR/convex/_generated" -prune -o \
  -name '*.ts' -type f -print | sort) | sort > "$tmp_actual"

grep -vE '^\s*(#|$)' "$ALLOWLIST" | sort > "$tmp_expected"

if ! diff -u "$tmp_expected" "$tmp_actual"; then
  cat >&2 <<'MSG'
[ERROR] Convex public service-secret surface changed.
Update scripts/convex_service_secret_surface.allowlist only after reviewing why
the public API needs another service-secret-backed function.
MSG
  exit 1
fi

echo "[INFO] Convex public service-secret surface matches allowlist."
