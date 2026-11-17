#!/usr/bin/env bash
#
# Runs locally the same jobs as .github/workflows/api.yml before the code reaches
# GitHub: committed credentials scan, lint (ESLint + Prettier), typecheck, unit
# tests (with the executable guards), dependency audit, build, migrations from an
# empty database (compiled, plain `node`, as the image runs them), the migrations
# vs entities check, e2e against a real Postgres and the Docker image build.
#
# It checks a clean clone of a commit (the whole repository, then the jobs run
# inside this app's folder), never the working tree, so untracked
# files, local docs and local node_modules cannot hide a failure GitHub would
# see. Each job runs in a node:22 container with Corepack; downloads are cached
# in the `financial-api-ci-cache` volume. A throwaway postgres:16-alpine (one
# network per run) holds two databases: `financial_test` for e2e (schema created
# by `synchronize`) and an empty `financial_migrations` where the compiled
# migrations run from scratch. They are separate on purpose: migrations over a
# synchronized schema prove nothing. A second migration run must apply nothing,
# and `schema:log` must report no difference between migrations and entities.
#
# Usage:
#   scripts/ci-local.sh            # check HEAD
#   scripts/ci-local.sh <commit>   # check another commit
#
# Called by .githooks/pre-push for each pushed commit. Exits on the first
# failing job.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(git -C "$APP_DIR" rev-parse --show-toplevel)"
APP_PREFIX="$(git -C "$APP_DIR" rev-parse --show-prefix)"
COMMIT="$(git -C "$REPO" rev-parse --verify "${1:-HEAD}^{commit}")"
CACHE_VOLUME="financial-api-ci-cache"
NETWORK="financial-api-ci-$$"
PG_NAME="financial-api-ci-pg-$$"
WORKDIR="$(mktemp -d -t financial-api-ci-XXXXXX)"

cleanup() {
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  docker run --rm -v "$WORKDIR":/w alpine:3 sh -c 'rm -rf /w/repo' >/dev/null 2>&1 || true
  rmdir "$WORKDIR" 2>/dev/null || true
}
trap cleanup EXIT

echo "▶ Local CI for ${COMMIT:0:12} (clean clone, node:22)"
git clone --quiet --no-hardlinks "$REPO" "$WORKDIR/repo"
git -C "$WORKDIR/repo" checkout --quiet "$COMMIT"

echo "▶ Committed credentials"
if git -C "$WORKDIR/repo" ls-files | grep -E '(^secure/|\.pem$|\.p12$|\.key$|-service-account\.json$|(^|/)\.env(\.local|\.production|\.development|\.staging)?$)'; then
  echo "Credential file is committed, remove it and use an environment variable."
  exit 1
fi
echo "No committed credentials."

docker volume create "$CACHE_VOLUME" >/dev/null
docker run --rm -v "$CACHE_VOLUME":/cache alpine:3 \
  sh -c "mkdir -p /cache/corepack /cache/pnpm && chown -R $(id -u):$(id -g) /cache"

docker network create "$NETWORK" >/dev/null
docker run -d --rm --name "$PG_NAME" --network "$NETWORK" \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=financial_test \
  postgres:16-alpine >/dev/null

echo "▶ Waiting for Postgres"
for _ in $(seq 1 60); do
  if docker exec "$PG_NAME" pg_isready -U postgres -d financial_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$PG_NAME" psql -q -U postgres -d financial_test -c 'CREATE DATABASE financial_migrations' >/dev/null

docker run --rm -i \
  --network "$NETWORK" \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e CI=true \
  -e COREPACK_HOME=/cache/corepack \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e PNPM_HOME=/cache/pnpm \
  -e POSTGRES_URI="postgresql://postgres:postgres@${PG_NAME}:5432/financial_test" \
  -e MIGRATIONS_URI="postgresql://postgres:postgres@${PG_NAME}:5432/financial_migrations" \
  -v "$WORKDIR/repo/$APP_PREFIX":/repo \
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

step "Unit tests (Jest, with the executable guards)"
pnpm run test

step "Vulnerabilities (pnpm audit --audit-level=high)"
pnpm audit --audit-level=high

step "Build"
pnpm run build
test -s dist/main.js || { echo "dist/main.js empty or missing"; exit 1; }
test -s dist/config/datasource.js || { echo "dist/config/datasource.js empty or missing"; exit 1; }

step "Migrations from an empty database (compiled, migration:run:prod)"
POSTGRES_URI="$MIGRATIONS_URI" pnpm run migration:run:prod

step "Migrations: second run has nothing pending"
POSTGRES_URI="$MIGRATIONS_URI" pnpm run --silent migration:run:prod | tee /tmp/migrate-again.log
grep -q 'No migrations are pending' /tmp/migrate-again.log

step "Migrations cover the entities (schema:log shows no differences)"
POSTGRES_URI="$MIGRATIONS_URI" node ./node_modules/typeorm/cli.js -d dist/config/datasource.js schema:log | tee /tmp/schema-log.log
grep -q 'Your schema is up to date' /tmp/schema-log.log

step "e2e against a real Postgres"
pnpm run test:e2e
CONTAINER

echo "▶ Docker image build"
docker build -q -f "$WORKDIR/repo/${APP_PREFIX}tools/docker/Dockerfile" -t financial-api:ci "$WORKDIR/repo/$APP_PREFIX" >/dev/null

echo "▶ Local CI passed for ${COMMIT:0:12}"
