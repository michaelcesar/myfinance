#!/usr/bin/env bash
#
# Backup do banco do stack local: pg_dump em formato custom (-Fc, comprimido,
# restaurável seletivamente com pg_restore) do container `postgres` para
#
#   infra/backups/finance-manager-AAAAMMDD-HHMMSS.dump
#
# e apaga os mais antigos, mantendo os N mais recentes. N vem, nesta ordem, de
# BACKUP_KEEP no ambiente, de BACKUP_KEEP em infra/.env, ou 14.
#
# O dump é gravado primeiro como `.partial` e só ganha o nome final depois de
# o pg_restore conseguir ler o índice dele: um dump cortado (disco cheio,
# container caiu no meio) nunca é confundido com um backup bom — nem conta
# para a rotação.
#
# Os arquivos têm permissão 600 e a pasta 700: são seus dados financeiros.
# BACKUP_DIR no ambiente troca a pasta (o ci-local.sh usa uma temporária).
#
# Uso:
#   scripts/backup-db.sh             (ou: make backup)
#   BACKUP_KEEP=30 scripts/backup-db.sh
#
# Notas:
#   - Usuário e banco vêm do ambiente do próprio container: o script não precisa
#     conhecer a senha nem ler segredos do infra/.env.

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

KEEP="${BACKUP_KEEP:-$(env_value BACKUP_KEEP 14)}"
if ! [[ "$KEEP" =~ ^[1-9][0-9]*$ ]]; then
  echo "BACKUP_KEEP precisa ser um inteiro >= 1 (recebido: '$KEEP')." >&2
  exit 1
fi

if [[ -z "$(compose ps --status running -q postgres)" ]]; then
  echo "O container do banco não está rodando. Suba o stack com: make up" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$INFRA_DIR/backups}"
umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

FILE="$BACKUP_DIR/finance-manager-$(date +%Y%m%d-%H%M%S).dump"
PARTIAL="$FILE.partial"
trap 'rm -f "$PARTIAL"' EXIT

echo "▶ pg_dump → ${FILE}"
compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$PARTIAL"

echo "▶ Conferindo o dump (pg_restore --list)"
compose exec -T postgres pg_restore --list < "$PARTIAL" > /dev/null
mv "$PARTIAL" "$FILE"
trap - EXIT

echo "▶ Mantendo os ${KEEP} backups mais recentes"
mapfile -t OLD < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'finance-manager-*.dump' -printf '%f\n' | sort -r | tail -n "+$((KEEP + 1))")
for old in "${OLD[@]}"; do
  rm -f -- "$BACKUP_DIR/$old"
  echo "  removido: $old"
done

echo "✅ Backup pronto: ${FILE} ($(du -h "$FILE" | cut -f1))"
