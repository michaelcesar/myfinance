#!/usr/bin/env bash
#
# Shared functions for the infra/ scripts. Sourced, not executed.
#
# `compose` wraps docker compose pinned to infra/docker-compose.yml and the
# infra/ project directory, so scripts work from any directory and always read
# the right infra/.env. FM_ENV_FILE replaces the interpolation file (default
# infra/.env); ci-local.sh points it at an empty file so the throwaway stack
# inherits nothing from the real config. COMPOSE_PROJECT_NAME in the
# environment overrides the compose `name:`.
#
# `env_value KEY [default]` reads a key from that file without sourcing it.
# `require_env_file` exits with a message if infra/.env is missing.

INFRA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export INFRA_DIR

compose() {
  local args=(--project-directory "$INFRA_DIR" -f "$INFRA_DIR/docker-compose.yml")
  if [[ -n "${FM_ENV_FILE:-}" ]]; then
    args+=(--env-file "$FM_ENV_FILE")
  fi
  docker compose "${args[@]}" "$@"
}

env_value() {
  local key="$1" default="${2:-}" value="" file="${FM_ENV_FILE:-$INFRA_DIR/.env}"
  if [[ -f "$file" ]]; then
    value="$(grep -E "^${key}=" "$file" | tail -n 1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//" || true)"
  fi
  printf '%s' "${value:-$default}"
}

require_env_file() {
  if [[ ! -f "$INFRA_DIR/.env" ]]; then
    echo "infra/.env does not exist. Run first: make setup (or scripts/setup.sh)." >&2
    exit 1
  fi
}
