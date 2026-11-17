#!/usr/bin/env bash
#
# Local CI for the Finance Manager stack: proves docker-compose.yml, both
# images and the scripts work together end to end, without touching the real
# stack or its data.
#
# Jobs, in order (stops at the first failure):
#   1. docker compose config -q, and the required APP_SECRET failing early;
#   2. real-stack names (project `finance`; containers `postgres`, `back-end`,
#      `front-end`) and only the front-end publishing a port, on 127.0.0.1;
#   3. shellcheck on scripts/*.sh (koalaman/shellcheck-alpine image);
#   4. build of the back-end and front-end images from ../api and ../web (the
#      working tree, not a commit: what `make rebuild` would start);
#   5. throwaway stack up: project `fm-ci-<pid>`, random free port, APP_SECRET
#      and database password generated on the spot, no infra/.env (compose
#      reads an empty variables file), containers prefixed `fm-ci-<pid>-` so
#      it coexists with the real stack; waits for postgres, back-end (with
#      migrations) and front-end to be healthy;
#   6. smoke tests through the published port and the front-end /api proxy:
#      /entrar page, redirect without session, /api/health, first-user
#      sign-up, login, /api/auth/me, sign-up closed for a second user, a
#      recurrence that generates pending entries, and the app backup round
#      trip (export + import with matching counts); the backup tests run only
#      if the API source has the backup and recurrences modules;
#   7. database backup and restore with the real scripts (backup-db.sh, delete
#      the users, restore-db.sh --yes, login works again).
#
# Everything is torn down at the end, volumes, network and CI image tags
# included, also on failure (EXIT trap), in which case container logs are
# printed first. Random port range: 30000-49999.
#
# Usage: scripts/ci-local.sh   (or: make ci)
# Needs: docker (compose v2), curl, jq, openssl.

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

for tool in docker curl jq openssl; do
  command -v "$tool" >/dev/null || { echo "Missing tool: $tool" >&2; exit 1; }
done

WORKDIR="$(mktemp -d -t finance-manager-ci-XXXXXX)"
export FM_ENV_FILE="$WORKDIR/ci.env"
: > "$FM_ENV_FILE"
export COMPOSE_PROJECT_NAME="fm-ci-$$"
export FM_CONTAINER_PREFIX="fm-ci-$$-"
export IMAGE_TAG="ci-$$"
export BACKUP_DIR="$WORKDIR/backups"
export BACKUP_KEEP=3

free_port() {
  local port
  for _ in $(seq 1 50); do
    port=$((RANDOM % 20000 + 30000))
    if ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

APP_PORT="$(free_port)"
APP_SECRET="ci-$(openssl rand -hex 32)"
POSTGRES_PASSWORD="$(openssl rand -hex 16)"
export APP_PORT APP_SECRET POSTGRES_PASSWORD
export ALLOW_SIGNUP=false
BASE="http://127.0.0.1:${APP_PORT}"

cleanup() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    echo
    echo "❌ Failed (code $status). Container logs:"
    compose logs --no-color --tail=80 2>/dev/null || true
  fi
  echo "▶ Tearing down the CI stack ($COMPOSE_PROJECT_NAME, with volumes)"
  compose down --volumes --remove-orphans --timeout 5 >/dev/null 2>&1 || true
  docker image rm "finance-back-end:${IMAGE_TAG}" "finance-front-end:${IMAGE_TAG}" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
  exit "$status"
}
trap cleanup EXIT

step() { printf '\n▶ %s\n' "$1"; }
fail() { echo "✗ $1" >&2; exit 1; }

http() {
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-sS -o "$WORKDIR/body" -w '%{http_code}' -X "$method" --max-time 30)
  [[ -n "$data" ]] && args+=(-H 'Content-Type: application/json' --data "$data")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  curl "${args[@]}" "${BASE}${path}"
}

expect() {
  local want="$1" got
  shift
  got="$(http "$@")"
  if [[ "$got" != "$want" ]]; then
    echo "Response body:" >&2
    head -c 2000 "$WORKDIR/body" >&2 || true
    echo >&2
    fail "$1 $2 -> $got (expected $want)"
  fi
  echo "  ✓ $1 $2 → $got"
}

echo "▶ Local stack CI (project $COMPOSE_PROJECT_NAME, port $APP_PORT)"

step "docker compose config"
compose config -q
if APP_SECRET='' compose config -q >/dev/null 2>&1; then
  fail "compose accepted an empty APP_SECRET: the \${APP_SECRET:?} guard should reject it"
fi
echo "  ✓ valid; a missing APP_SECRET is rejected"

step "Names: project finance, containers postgres, back-end and front-end"
names="$(FM_CONTAINER_PREFIX='' COMPOSE_PROJECT_NAME='' compose config --format json | jq -r '.name + " " + ([.services[].container_name] | sort | join(" "))')"
[[ "$names" == "finance back-end front-end postgres" ]] || fail "real stack names: '$names' (expected 'finance back-end front-end postgres')"
echo "  ✓ finance: postgres, back-end, front-end"

step "Published ports: front-end only, on 127.0.0.1 only"
compose config --format json > "$WORKDIR/config.json"
published="$(jq -r '.services | to_entries[] | select(.value.ports != null) | .key' "$WORKDIR/config.json" | sort | tr '\n' ' ')"
[[ "$published" == "front-end " ]] || fail "services with a published port: '${published}' (expected only 'front-end')"
non_loopback="$(jq -r '[.services["front-end"].ports[] | select(.host_ip != "127.0.0.1")] | length' "$WORKDIR/config.json")"
[[ "$non_loopback" == "0" ]] || fail "the front-end publishes a port outside 127.0.0.1"
echo "  ✓ front-end only, on 127.0.0.1"

step "shellcheck (scripts/*.sh)"
docker run --rm -v "$INFRA_DIR":/mnt:ro -w /mnt koalaman/shellcheck-alpine:v0.10.0 \
  sh -c 'shellcheck scripts/*.sh'
echo "  ✓ no warnings"

step "Building the images (back-end and front-end)"
compose build --quiet

step "Throwaway stack up (postgres, then back-end with migrations, then front-end)"
compose up -d --wait --wait-timeout 300
compose ps -a

step "Smoke tests (published port, front-end /api proxy)"
bound="$(compose port front-end 3000)"
[[ "$bound" == "127.0.0.1:${APP_PORT}" ]] || fail "front-end published on '$bound' (expected 127.0.0.1:${APP_PORT})"
echo "  ✓ front-end on $bound"

expect 200 GET /entrar
expect 307 GET /visao-geral
expect 200 GET /api/health
[[ "$(jq -r '.data.status' "$WORKDIR/body")" == "ok" ]] || fail "/api/health without status ok"

expect 200 GET /api/auth/signup-status
[[ "$(jq -r '.data.signupOpen' "$WORKDIR/body")" == "true" ]] || fail "sign-up should be open for the first user"

EMAIL="ci@finance-manager.local"
PASSWORD="ci-$(openssl rand -hex 8)"
expect 201 POST /api/auth/register "$(jq -nc --arg e "$EMAIL" --arg p "$PASSWORD" '{name: "CI", email: $e, password: $p}')"
[[ -n "$(jq -r '.data.accessToken // empty' "$WORKDIR/body")" ]] || fail "register without accessToken"

LOGIN_JSON="$(jq -nc --arg e "$EMAIL" --arg p "$PASSWORD" '{email: $e, password: $p}')"
expect 200 POST /api/auth/login "$LOGIN_JSON"
TOKEN="$(jq -r '.data.accessToken // empty' "$WORKDIR/body")"
[[ -n "$TOKEN" ]] || fail "login without accessToken"

expect 200 GET /api/auth/me "" "$TOKEN"
[[ "$(jq -r '.data.email' "$WORKDIR/body")" == "$EMAIL" ]] || fail "/api/auth/me returned a different user"

expect 403 POST /api/auth/register '{"name":"Other","email":"other@finance-manager.local","password":"other-password-123"}'

if [[ -d "$INFRA_DIR/../api/src/modules/backup" ]]; then
  if [[ -d "$INFRA_DIR/../api/src/modules/recurrences" ]]; then
    expect 200 GET /api/ledgers "" "$TOKEN"
    LEDGER_ID="$(jq -r '.data.data[0].ledgerId' "$WORKDIR/body")"
    expect 201 POST /api/accounts "$(jq -nc --arg l "$LEDGER_ID" '{ledgerId: $l, name: "CI account", type: "CHECKING"}')" "$TOKEN"
    ACCOUNT_ID="$(jq -r '.data.accountId' "$WORKDIR/body")"
    expect 201 POST /api/recurrences "$(jq -nc --arg a "$ACCOUNT_ID" --arg m "$(date +%Y-%m-01)" '{accountId: $a, kind: "EXPENSE", description: "Rent CI", amountCents: 100000, dayOfMonth: 5, startMonth: $m}')" "$TOKEN"
    [[ "$(jq -r '.data.pendingCount' "$WORKDIR/body")" == "3" ]] || fail "recurrence did not generate the 3 pending months"
    echo "  ✓ recurrence generates the current month and the next 2"
  fi
  expect 200 GET /api/backup/export "" "$TOKEN"
  [[ "$(jq -r '.data.format' "$WORKDIR/body")" == "finance-manager-backup" ]] || fail "export without format=finance-manager-backup"
  echo "  ✓ export in the finance-manager-backup format"
  jq -c '.data' "$WORKDIR/body" > "$WORKDIR/backup.json"
  expect 200 POST /api/backup/import "$(cat "$WORKDIR/backup.json")" "$TOKEN"
  [[ "$(jq -c '.data.counts' "$WORKDIR/body")" == "$(jq -c '.counts' "$WORKDIR/backup.json")" ]] || fail "import returned different counts than the export"
  echo "  ✓ import of its own export with the same counts"
  if [[ -d "$INFRA_DIR/../api/src/modules/recurrences" ]]; then
    [[ "$(jq -r '.data.counts.recurrences' "$WORKDIR/body")" == "1" ]] || fail "import without the recurrence"
    echo "  ✓ backup carries the recurrence"
  fi
  expect 400 POST /api/backup/import '{"format":"something-else","version":1,"data":{}}' "$TOKEN"
else
  echo "  (api/src/modules/backup does not exist: backup export not tested)"
fi

step "Database backup and restore (backup-db.sh / restore-db.sh)"
"$INFRA_DIR/scripts/backup-db.sh"
DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'finance-manager-*.dump' | head -n 1)"
[[ -s "$DUMP" ]] || fail "backup-db.sh did not produce the dump"

compose exec -T postgres sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SET client_min_messages TO warning; TRUNCATE user_account CASCADE"'
expect 401 POST /api/auth/login "$LOGIN_JSON"

"$INFRA_DIR/scripts/restore-db.sh" "$DUMP" --yes
expect 200 POST /api/auth/login "$LOGIN_JSON"

printf '\n✅ Local stack CI passed\n'
