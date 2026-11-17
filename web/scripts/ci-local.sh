#!/usr/bin/env bash
#
# Roda localmente os mesmos jobs de .github/workflows/ci.yml antes do código
# chegar ao GitHub: varredura de credenciais, lint (ESLint + Prettier),
# typecheck, testes (Vitest, com as guardas de padrão de código), auditoria de
# dependências, build de produção e build da imagem Docker.
#
# Confere um clone limpo de um commit, nunca a árvore de trabalho: arquivo não
# rastreado, docs locais, o `.next` do dev server e o node_modules local não
# escondem uma falha que o GitHub veria. Cada job roda num container node:22
# com Corepack; downloads ficam em cache no volume `financial-web-ci-cache`.
#
# O build de produção roda dentro do container, no clone: nunca toca o `.next`
# da árvore de trabalho, que o `next dev` está usando.
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
#   - Mesmo API_URL da imagem do stack local: os rewrites saem do build.
#   - Último job: o que roda no stack local é a imagem, então um Dockerfile
#     quebrado tem de falhar antes do push.

set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
COMMIT="$(git -C "$REPO" rev-parse --verify "${1:-HEAD}^{commit}")"
CACHE_VOLUME="financial-web-ci-cache"
WORKDIR="$(mktemp -d -t financial-web-ci-XXXXXX)"

cleanup() {
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

docker run --rm -i \
  --user "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  -e CI=true \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e COREPACK_HOME=/cache/corepack \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e PNPM_HOME=/cache/pnpm \
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

step "Testes (Vitest, com as guardas de padrão de código)"
pnpm run test

step "Vulnerabilidades (pnpm audit --audit-level=high)"
pnpm audit --audit-level=high

step "Build de produção (next build, standalone)"
API_URL=http://api:3001 pnpm run build
test -s .next/standalone/server.js || { echo ".next/standalone/server.js vazio ou ausente"; exit 1; }
CONTAINER

echo "▶ Build da imagem Docker"
docker build -q --build-arg API_URL=http://api:3001 -t financial-web:ci "$WORKDIR/repo" >/dev/null

echo "▶ CI local passou para ${COMMIT:0:12}"
