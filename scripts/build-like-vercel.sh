#!/usr/bin/env bash

set -euo pipefail

corepack enable || true

if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
  pnpm run build
elif [ -f package-lock.json ]; then
  npm ci
  npm run build
elif [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
  yarn build
else
  npm install
  npm run build
fi
