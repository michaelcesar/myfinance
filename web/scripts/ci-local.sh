#!/usr/bin/env bash
#
# Runs locally the jobs of .github/workflows/ci.yml before the code reaches
# GitHub: credential scan, lint (ESLint + Prettier), typecheck, tests (Vitest,
# including the code style guards), dependency audit, production build and
# Docker image build. The credential scan runs first on purpose: a key that
# reaches GitHub cannot be taken back.
#
# It checks a clean clone of a commit, never the working tree, so untracked
# files, local docs, the dev server's .next and the local node_modules cannot
# hide a failure GitHub would see. Each job runs in a node:22 container with
# Corepack; downloads are cached in the financial-web-ci-cache volume. The
# production build uses API_URL=http://api:3001 (same as the local stack image)
# and never touches the working tree's .next. The image build comes last
# because the local stack runs the image, so a broken Dockerfile must fail
# before the push.
#
# Usage:
#   scripts/ci-local.sh            # check HEAD
#   scripts/ci-local.sh <commit>   # check another commit
#
# Called by .githooks/pre-push for each commit being pushed. Exits with an
# error at the first failing job.

set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
COMMIT="$(git -C "$REPO" rev-parse --verify "${1:-HEAD}^{commit}")"
CACHE_VOLUME="financial-web-ci-cache"
WORKDIR="$(mktemp -d -t financial-web-ci-XXXXXX)"

cleanup() {
  docker run --rm -v "$WORKDIR":/w alpine:3 sh -c 'rm -rf /w/repo' >/dev/null 2>&1 || true
  rmdir "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "▶ Local CI for ${COMMIT:0:12} (clean clone, node:22)"
git clone --quiet --no-hardlinks "$REPO" "$WORKDIR/repo"
git -C "$WORKDIR/repo" checkout --quiet "$COMMIT"

echo "▶ Tracked credentials"
if git -C "$WORKDIR/repo" ls-files | grep -E '(^secure/|\.pem$|\.p12$|\.key$|-service-account\.json$|(^|/)\.env(\.local|\.production|\.development|\.staging)?$)'; then
  echo "Credential file is tracked: remove it and use an environment variable."
  exit 1
fi
echo "No tracked credentials."

docker volume create "$CACHE_VOLUME" >/dev/null
docker run --rm -v "$CACHE_VOLUME":/cache alpine:3 \
  sh -c "mkdir -p /cache/corepack /cache/pnpm && chown -R $(id -u):$(id -g) /cache"

docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e CI=true \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e COREPACK_HOME=/cache/corepack \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e PNPM_HOME=/cache/pnpm \
  -v "$WORKDIR/repo":/repo \
  -v "$CACHE_VOLUME":/cache \
  -w /repo \
  node:22 bash -s <<'CONTAINER'
set -euo pipefail
step() { printf '\n▶ %s\n' "$1"; }

mkdir -p /tmp/bin
corepack enable --install-directory /tmp/bin
export PATH="/tmp/bin:$PATH"

step "Dependencies (pnpm install --frozen-lockfile)"
pnpm install --frozen-lockfile

step "Lint (ESLint + Prettier)"
pnpm run lint

step "Typecheck (tsc --noEmit)"
pnpm run typecheck

step "Tests (Vitest, including the code style guards)"
pnpm run test

step "Vulnerabilities (pnpm audit --audit-level=high)"
pnpm audit --audit-level=high

step "Production build (next build, standalone)"
API_URL=http://api:3001 pnpm run build
test -s .next/standalone/server.js || { echo ".next/standalone/server.js is empty or missing"; exit 1; }
CONTAINER

echo "▶ Docker image build"
docker build -q --build-arg API_URL=http://api:3001 -t financial-web:ci "$WORKDIR/repo" >/dev/null

echo "▶ Local CI passed for ${COMMIT:0:12}"
