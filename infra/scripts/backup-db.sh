#!/usr/bin/env bash
#
# Database backup of the local stack: pg_dump in custom format (-Fc,
# compressed, selectively restorable with pg_restore) from the `postgres`
# container to
#
#   infra/backups/finance-manager-YYYYMMDD-HHMMSS.dump
#
# then deletes the oldest ones, keeping the newest N. N comes from BACKUP_KEEP
# in the environment, then BACKUP_KEEP in infra/.env, then 14.
#
# The dump is written as `.partial` and only gets its final name after
# pg_restore can read its index, so a truncated dump (full disk, container
# died) is never mistaken for a good backup nor counted for rotation.
# Files are mode 600 and the folder 700. BACKUP_DIR in the environment
# overrides the folder (ci-local.sh uses a temporary one). User and database
# come from the container's own environment; no secret is read here.
#
# Usage:
#   scripts/backup-db.sh             (or: make backup)
#   BACKUP_KEEP=30 scripts/backup-db.sh

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

KEEP="${BACKUP_KEEP:-$(env_value BACKUP_KEEP 14)}"
if ! [[ "$KEEP" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_KEEP must be an integer >= 1 (got: '$KEEP')." >&2
  exit 1
fi

if [[ -z "$(compose ps --status running -q postgres)" ]]; then
  echo "The database container is not running. Start the stack with: make up" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

FILE="$BACKUP_DIR/finance-manager-$(date +%Y%m%d-%H%M%S).dump"
PARTIAL="$FILE.partial"
trap 'rm -f "$PARTIAL"' EXIT

echo "▶ pg_dump -> ${FILE}"
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$PARTIAL"

echo "▶ Verifying the dump (pg_restore --list)"
compose exec -T postgres pg_restore --list < "$PARTIAL" > /dev/null
mv "$PARTIAL" "$FILE"
trap - EXIT

echo "▶ Keeping the newest ${KEEP} backups"
mapfile -t OLD < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'finance-manager-*.dump' -printf '%f\n' | sort -r | tail -n "+$((KEEP + 1))")
for old in "${OLD[@]}"; do
  rm -f -- "$BACKUP_DIR/$old"
  echo "  removed: $old"
done

echo "✅ Backup ready: ${FILE} ($(du -h "$FILE" | cut -f1))"
