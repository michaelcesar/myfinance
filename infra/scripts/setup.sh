#!/usr/bin/env bash
#
# Primeira configuração do stack local: cria infra/.env a partir do
# .env.example com segredos novos.
#
#   - APP_SECRET: 48 bytes aleatórios em base64 (assina os JWT);
#   - POSTGRES_PASSWORD: 24 bytes em hex (entra na URL de conexão, então só
#     [0-9a-f], sem caractere que precise de escape).
#
# Não sobrescreve nada: se infra/.env já existe, sai sem tocar nele — trocar
# o APP_SECRET derruba as sessões, e trocar a senha do banco depois de criado
# o volume deixa a API sem acesso.
#
# Uso: scripts/setup.sh   (ou: make setup)
#
# Notas:
#   - Arquivo criado já com permissão 600: os segredos nunca ficam legíveis por
#     outros usuários, nem por um instante.
#   - `|` como delimitador do sed: base64 pode ter `/` e `+`, mas nunca `|`.

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

ENV_FILE="$INFRA_DIR/.env"
EXAMPLE="$INFRA_DIR/.env.example"

if [[ -f "$ENV_FILE" ]]; then
  echo "infra/.env já existe — nada a fazer (apague-o à mão se quiser recriar)."
  exit 0
fi

command -v openssl >/dev/null || { echo "openssl não encontrado." >&2; exit 1; }

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

echo "infra/.env criado com APP_SECRET e POSTGRES_PASSWORD novos (permissão 600)."
echo "Próximo passo: make up   →   http://localhost:$(env_value APP_PORT 8080)"
