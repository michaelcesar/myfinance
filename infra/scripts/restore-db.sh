#!/usr/bin/env bash
#
# Restaura um backup feito por backup-db.sh no banco do stack local.
#
# O que acontece, em ordem:
#   1. confere que o arquivo é um dump legível (pg_restore --list);
#   2. pede confirmação (digite "restaurar"), a menos que receba --yes;
#   3. faz um backup de segurança do estado atual em
#      infra/backups/pre-restore-AAAAMMDD-HHMMSS.dump (fora da rotação do
#      backup-db.sh — apague à mão quando não precisar mais; BACKUP_DIR no
#      ambiente troca a pasta);
#   4. para `front-end` e `back-end` (ninguém escreve no banco durante a restauração);
#   5. apaga e recria o banco, e restaura o dump numa transação só — ou entra
#      tudo, ou nada; não sobra tabela de uma versão mais nova misturada com
#      dados de uma mais antiga;
#   6. sobe o stack de novo: o `back-end` aplica as migrations que o
#      backup ainda não tinha (restaurar um backup antigo numa versão nova do
#      código funciona) e volta, e só então o front-end volta.
#
# Uso:
#   scripts/restore-db.sh backups/finance-manager-20261117-103000.dump
#   make restore FILE=backups/finance-manager-20261117-103000.dump
#   scripts/restore-db.sh <arquivo> --yes     # sem pergunta (automação)
#
# Notas:
#   - Caminho relativo vale tanto a partir do diretório atual quanto de infra/.
#   - Daqui em diante uma falha deixa o banco vazio ou pela metade: o aviso diz
#     como voltar ao estado de antes.
#   - Conecta no banco `postgres` para poder apagar o da aplicação; --force
#     derruba conexões que tenham sobrado (o compose stop já fechou as da API).

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

usage() {
  echo "Uso: $0 <arquivo.dump> [--yes]" >&2
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
  echo "Arquivo não encontrado: $FILE" >&2
  exit 1
fi

if [[ -z "$(compose ps --status running -q postgres)" ]]; then
  echo "O container do banco não está rodando. Suba-o com: docker compose up -d postgres (ou make up)" >&2
  exit 1
fi

echo "▶ Conferindo o arquivo (pg_restore --list)"
if ! compose exec -T postgres pg_restore --list < "$FILE" > /dev/null; then
  echo "O arquivo não é um dump válido do pg_dump (formato custom)." >&2
  exit 1
fi

if [[ "$ASSUME_YES" != true ]]; then
  echo
  echo "Isto SUBSTITUI todos os dados atuais do Finance Manager por:"
  echo "  $FILE"
  echo "Um backup de segurança do estado atual é feito antes."
  read -r -p "Digite 'restaurar' para continuar: " answer
  if [[ "$answer" != "restaurar" ]]; then
    echo "Cancelado."
    exit 1
  fi
fi

BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
umask 077
mkdir -p "$BACKUP_DIR"
SAFETY="$BACKUP_DIR/pre-restore-$(date +%Y%m%d-%H%M%S).dump"
echo "▶ Backup de segurança → ${SAFETY}"
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$SAFETY"

on_error() {
  echo >&2
  echo "❌ A restauração falhou. front-end e back-end estão parados." >&2
  echo "   Para voltar ao estado anterior: $0 ${SAFETY} --yes" >&2
}
trap on_error ERR

echo "▶ Parando front-end e back-end"
compose stop front-end back-end

echo "▶ Recriando o banco e restaurando"
compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" && createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --single-transaction --exit-on-error' < "$FILE"

echo "▶ Subindo o stack (back-end aplica migrations pendentes, depois front-end)"
compose up -d --wait

trap - ERR
echo "✅ Restaurado de ${FILE}. Backup do estado anterior: ${SAFETY}"
