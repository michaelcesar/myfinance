#!/usr/bin/env bash
#
# Restores a backup made by backup-db.sh into the local stack's database.
#
# In order:
#   1. checks the file is a readable dump (pg_restore --list);
#   2. asks for confirmation (type "restore") unless --yes is given;
#   3. takes a safety backup of the current state to
#      infra/backups/pre-restore-YYYYMMDD-HHMMSS.dump (outside backup-db.sh
#      rotation, delete it by hand; BACKUP_DIR in the environment overrides the
#      folder);
#   4. stops `front-end` and `back-end` so nothing writes during the restore;
#   5. drops and recreates the database and restores the dump in a single
#      transaction (all or nothing), connecting to the `postgres` database and
#      using --force to drop leftover connections;
#   6. starts the stack again: `back-end` applies the migrations the backup
#      lacked (an old backup works on newer code), then `front-end` returns.
#
# From step 3 on, a failure leaves the database empty or half restored; the
# error message says how to go back to the previous state. A relative FILE
# resolves from the current directory or from infra/.
#
# Usage:
#   scripts/restore-db.sh backups/finance-manager-20261117-103000.dump
#   make restore FILE=backups/finance-manager-20261117-103000.dump
#   scripts/restore-db.sh <file> --yes     # no prompt (automation)

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  echo "Usage: $0 <file.dump> [--yes]" >&2
  exit 2
}

FILE=""
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --yes | -y) ASSUME_YES=true ;;
    -*) usage ;;
    *)
      if [[ -n "$FILE" ]]; then usage; fi
      FILE="$arg"
      ;;
  esac
done
[[ -n "$FILE" ]] || usage

if [[ ! -f "$FILE" && -f "$INFRA_DIR/$FILE" ]]; then
  FILE="$INFRA_DIR/$FILE"
fi
if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

if [[ -z "$(compose ps --status running -q postgres)" ]]; then
  echo "The database container is not running. Start it with: docker compose up -d postgres (or make up)" >&2
  exit 1
fi

echo "▶ Verifying the file (pg_restore --list)"
if ! compose exec -T postgres pg_restore --list < "$FILE" > /dev/null; then
  echo "The file is not a valid pg_dump dump (custom format)." >&2
  exit 1
fi

if [[ "$ASSUME_YES" != true ]]; then
  echo
  echo "This REPLACES all current Finance Manager data with:"
  echo "  $FILE"
  echo "A safety backup of the current state is taken first."
  read -r -p "Type 'restore' to continue: " answer
  if [[ "$answer" != "restore" ]]; then
    echo "Cancelled."
    exit 1
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
umask 077
mkdir -p "$BACKUP_DIR"
SAFETY="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
echo "▶ Safety backup -> ${SAFETY}"
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$SAFETY"

on_error() {
  echo >&2
  echo "❌ The restore failed. front-end and back-end are stopped." >&2
  echo "   To go back to the previous state: $0 ${SAFETY} --yes" >&2
}
trap on_error ERR

echo "▶ Stopping front-end and back-end"
compose stop front-end back-end

echo "▶ Recreating the database and restoring"
compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --single-transaction --exit-on-error' < "$FILE"

echo "▶ Starting the stack (back-end applies pending migrations, then front-end)"
compose up -d --wait

trap - ERR
echo "✅ Restored from ${FILE}. Backup of the previous state: ${SAFETY}"
