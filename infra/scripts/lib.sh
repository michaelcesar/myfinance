#!/usr/bin/env bash
#
# Funções comuns dos scripts do infra/. Carregado com `source`, não executado.
#
# Todos os comandos do compose passam por `compose`, que fixa o arquivo e o
# diretório do projeto: os scripts funcionam de qualquer diretório, e o
# compose sempre lê o infra/.env certo.
#
# Notas:
#   - docker compose apontado para infra/docker-compose.yml. FM_ENV_FILE troca o
#     arquivo de variáveis que o compose interpola (padrão: infra/.env). O ci-
#     local.sh aponta para um arquivo vazio, para o stack descartável não herdar
#     nada da configuração real; COMPOSE_PROJECT_NAME no ambiente troca o nome
#     do projeto (o `name:` do compose cede a ele).
#   - Lê uma chave de infra/.env sem executar o arquivo (nada de `source`). Uso:
#     env_value CHAVE [padrão]
#   - Falha com mensagem se o infra/.env não existir.

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
    echo "infra/.env não existe. Rode primeiro: make setup (ou scripts/setup.sh)." >&2
    exit 1
  fi
}
