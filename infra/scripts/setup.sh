#!/usr/bin/env bash
#
# First-time setup of the local stack: creates infra/.env from .env.example
# with fresh secrets.
#
#   - APP_SECRET: 48 random bytes in base64 (signs the JWTs);
#   - POSTGRES_PASSWORD: 24 random bytes in hex (it goes into the connection
#     URL, so only [0-9a-f], nothing that needs escaping).
#
# Never overwrites: if infra/.env exists it exits untouched, because changing
# APP_SECRET drops every session and changing the password after the volume
# exists locks the API out of the database. The file is created with mode 600
# and the sed delimiter is `|` (base64 can contain `/` and `+`, never `|`).
#
# Usage: scripts/setup.sh   (or: make setup)

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV_FILE="$INFRA_DIR/.env"
EXAMPLE="$INFRA_DIR/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  echo "infra/.env already exists: nothing to do (delete it by hand to recreate it)."
  exit 0
fi

command -v openssl >/dev/null || { echo "openssl not found." >&2; exit 1; }

APP_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
POSTGRES_PASSWORD="$(openssl rand -hex 24)"

umask 077
TMP="$(mktemp "$INFRA_DIR/.env.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

sed -e "s|^APP_SECRET=.*|APP_SECRET=${APP_SECRET}|" \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" \
    "$EXAMPLE" > "$TMP"
mv "$TMP" "$ENV_FILE"
trap - EXIT

echo "infra/.env created with new APP_SECRET and POSTGRES_PASSWORD (mode 600)."
echo "Next step: make up   ->   http://localhost:$(env_value APP_PORT 8080)"
