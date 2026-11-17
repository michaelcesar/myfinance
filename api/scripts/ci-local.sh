#!/usr/bin/env bash
#
# Roda localmente os mesmos jobs de .github/workflows/ci.yml antes do código
# chegar ao GitHub: varredura de credenciais, lint (ESLint + Prettier),
# typecheck, testes unitários (com as guardas executáveis), auditoria de
# dependências, build, migrations a partir de um banco vazio (compiladas, com
# `node` puro, como a imagem roda), e2e contra um Postgres real e build da
# imagem Docker.
#
# Confere um clone limpo de um commit, nunca a árvore de trabalho: arquivo não
# rastreado, docs locais e node_modules local não escondem uma falha que o
# GitHub veria. Cada job roda num container node:22 com Corepack; downloads
# ficam em cache no volume `financial-api-ci-cache`.
#
# O Postgres descartável (postgres:16-alpine, numa rede por execução) tem dois
# bancos: `financial_test`, onde o e2e cria o schema com `synchronize`, e
# `financial_migrations`, vazio, onde as migrations compiladas rodam do zero. Bancos
# separados de propósito: migration por cima de schema sincronizado não prova
# nada, e sync por cima de migration esconde divergência.
#
# Uso:
#   scripts/ci-local.sh            # confere o HEAD
#   scripts/ci-local.sh <commit>   # confere outro commit
#
# Chamado por .githooks/pre-push para cada commit a ser enviado. Sai com erro
# no primeiro job que falhar.
#
# Notas:
#   - Primeiro job, de propósito: chave que chega ao GitHub não volta atrás.
#   - O mesmo comando que o serviço `migrate` do infra/ roda na imagem: CLI do
#     TypeORM com `node` puro contra o datasource e as migrations compiladas.
#   - Rodar de novo não pode aplicar nada: migration que não se registra (ou que
#     o glob compilado não acha) apareceria aqui como pendente.
#   - Entidade alterada sem migration correspondente: o banco migrado do zero
#     diverge das entidades e o `schema:log` lista o SQL que faltaria.

set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
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

echo "▶ CI local para ${COMMIT:0:12} (clone limpo, node:22)"
git clone --quiet --no-hardlinks "$REPO" "$WORKDIR/repo"
git -C "$WORKDIR/repo" checkout --quiet "$COMMIT"

echo "▶ Credenciais versionadas"
if git -C "$WORKDIR/repo" ls-files | grep -E '(^secure/|\.pem$|\.p12$|\.key$|-service-account\.json$|(^|/)\.env(\.local|\.production|\.development|\.staging)?$)'; then
  echo "Arquivo de credencial versionado — remova e use variável de ambiente."
  exit 1
fi
echo "Nenhuma credencial versionada."

docker volume create "$CACHE_VOLUME" >/dev/null
docker run --rm -v "$CACHE_VOLUME":/cache alpine:3 \
  sh -c "mkdir -p /cache/corepack /cache/pnpm && chown -R $(id -u):$(id -g) /cache"

docker network create "$NETWORK" >/dev/null
docker run -d --rm --name "$PG_NAME" --network "$NETWORK" \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=financial_test \
  postgres:16-alpine >/dev/null

echo "▶ Aguardando o Postgres"
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
  -v "$WORKDIR/repo":/repo \
  -v "$CACHE_VOLUME":/cache \
  -w /repo \
  node:22 bash -s <<'CONTAINER'
set -euo pipefail
step() { printf '\n▶ %s\n' "$1"; }

mkdir -p /tmp/bin
corepack enable --install-directory /tmp/bin
export PATH="/tmp/bin:$PATH"

step "Dependências (pnpm install --frozen-lockfile)"
pnpm install --frozen-lockfile

step "Lint (ESLint + Prettier)"
pnpm run lint

step "Typecheck (tsc --noEmit)"
pnpm run typecheck

step "Testes unitários (Jest, com as guardas executáveis)"
pnpm run test

step "Vulnerabilidades (pnpm audit --audit-level=high)"
pnpm audit --audit-level=high

step "Build"
pnpm run build
test -s dist/main.js || { echo "dist/main.js vazio ou ausente"; exit 1; }
test -s dist/config/datasource.js || { echo "dist/config/datasource.js vazio ou ausente"; exit 1; }

step "Migrations a partir de um banco vazio (compiladas, migration:run:prod)"
POSTGRES_URI="$MIGRATIONS_URI" pnpm run migration:run:prod

step "Migrations: segunda execução sem pendências"
POSTGRES_URI="$MIGRATIONS_URI" pnpm run --silent migration:run:prod | tee /tmp/migrate-again.log
grep -q 'No migrations are pending' /tmp/migrate-again.log

step "Migrations cobrem as entidades (schema:log sem diferenças)"
POSTGRES_URI="$MIGRATIONS_URI" node ./node_modules/typeorm/cli.js -d dist/config/datasource.js schema:log | tee /tmp/schema-log.log
grep -q 'Your schema is up to date' /tmp/schema-log.log

step "e2e contra um Postgres real"
pnpm run test:e2e
CONTAINER

echo "▶ Build da imagem Docker"
docker build -q -f "$WORKDIR/repo/tools/docker/Dockerfile" -t financial-api:ci "$WORKDIR/repo" >/dev/null

echo "▶ CI local passou para ${COMMIT:0:12}"
