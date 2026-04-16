#!/bin/bash
set -e

cd /Users/efebarandurmaz/Desktop/aspendos-deploy

# Install dependencies (idempotent)
bun install

# Ensure biome is linked
ln -sf ../@biomejs/biome/bin/biome node_modules/.bin/biome 2>/dev/null || true

# Ensure FIDES and AGIT SDKs are linked (if not already)
if [ -d "$HOME/fides/packages/sdk" ] && ! grep -q "@fides/sdk" services/api/package.json 2>/dev/null; then
  echo "Note: @fides/sdk not yet linked in services/api — will be added in core-invariants milestone"
fi

if [ -d "$HOME/agit/ts-sdk" ] && ! grep -q "@agit/sdk" services/api/package.json 2>/dev/null; then
  echo "Note: @agit/sdk not yet linked in services/api — will be added in core-invariants milestone"
fi

echo "Init complete."
