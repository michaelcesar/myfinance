#!/usr/bin/env bash
#
# CI local do stack do Finance Manager: prova que o docker-compose.yml, as
# duas imagens e os scripts funcionam juntos, de ponta a ponta, sem tocar no
# stack real nem nos seus dados.
#
# Jobs, em ordem (sai no primeiro que falhar):
#   1. docker compose config -q, e o APP_SECRET obrigatório falhando cedo;
#   2. nomes da pilha real (grupo `finance`; containers `postgres`, `back-end`,
#      `front-end`) e só o front-end publica porta, e só em 127.0.0.1;
#   3. shellcheck em scripts/*.sh (imagem koalaman/shellcheck-alpine);
#   4. build das imagens do back-end e do front-end (a partir de ../api e ../web — a
#      árvore de trabalho, não um commit: é o que `make rebuild` subiria);
#   5. stack descartável de pé: projeto `fm-ci-<pid>`, porta livre aleatória,
#      APP_SECRET e senha do banco gerados na hora, sem infra/.env (o compose
#      lê um arquivo de variáveis vazio, então nada da configuração real vaza);
#      containers com o prefixo `fm-ci-<pid>-` (convive com a pilha real no ar);
#      espera postgres, back-end (com as migrations) e front-end ficarem saudáveis;
#   6. smoke tests pela porta publicada, através do proxy /api do front-end:
#      tela /entrar, redirecionamento sem sessão, /api/health, cadastro do
#      primeiro usuário, login, /api/auth/me, cadastro fechado para o segundo
#      usuário e ida e volta do backup da aplicação (export + import);
#   7. backup e restauração do banco com os próprios scripts (backup-db.sh →
#      apaga os usuários → restore-db.sh --yes → o login volta a funcionar).
#
# Tudo é derrubado no final, com volumes, rede e as tags das imagens de CI —
# também quando um job falha (trap EXIT), e nesse caso os logs dos containers
# são impressos antes.
#
# Uso: scripts/ci-local.sh   (ou: make ci)
# Precisa de: docker (com compose v2), curl, jq, openssl.
#
# Notas:
#   - Arquivo de variáveis vazio: o stack de CI não lê o infra/.env real.
#   - Os containers da pilha real se chamam `postgres`, `back-end` e `front-
#     end`; o prefixo deixa esta pilha descartável subir ao lado dela sem
#     colidir nomes.
#   - Porta livre aleatória em 30000–49999: ninguém respondendo no loopback.
#   - Requisição HTTP: grava o corpo em $WORKDIR/body e devolve o status. Uso:
#     http MÉTODO CAMINHO [JSON] [TOKEN]
#   - Confere o status de uma requisição. Uso: expect STATUS MÉTODO CAMINHO
#     [JSON] [TOKEN]
#   - ALLOW_SIGNUP=false chegou à API: depois do primeiro usuário, o cadastro
#     fecha.
#   - Backup da aplicação (GET /api/backup/export + POST /api/backup/import). Só
#     roda se o módulo existe no código da API que foi buildado.
#   - Um recorrente antes do export: o round trip precisa levar recorrentes e os
#     lançamentos pendentes que ele gera (formato v2).
#   - Ida e volta pelo app: importar o próprio export substitui tudo pelo mesmo
#     conteúdo, e as contagens têm de bater com as do arquivo.
#   - Apaga os usuários (e tudo que depende deles): o login tem de falhar...
#   - ...e voltar a funcionar depois da restauração.

set -euo pipefail

# shellcheck source=lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

for tool in docker curl jq openssl; do
  command -v "$tool" >/dev/null || { echo "Ferramenta ausente: $tool" >&2; exit 1; }
done

WORKDIR="$(mktemp -d -t finance-manager-ci-XXXXXX)"
export FM_ENV_FILE="$WORKDIR/ci.env"
: > "$FM_ENV_FILE"
export COMPOSE_PROJECT_NAME="fm-ci-$$"
export FM_CONTAINER_PREFIX="fm-ci-$$-"
export IMAGE_TAG="ci-$$"
export BACKUP_DIR="$WORKDIR/backups"
export BACKUP_KEEP=3

free_port() {
  local port
  for _ in $(seq 1 50); do
    port=$((RANDOM % 20000 + 30000))
    if ! (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
      echo "$port"
      return 0
    fi
  done
  return 1
}

APP_PORT="$(free_port)"
APP_SECRET="ci-$(openssl rand -hex 32)"
POSTGRES_PASSWORD="$(openssl rand -hex 16)"
export APP_PORT APP_SECRET POSTGRES_PASSWORD
export ALLOW_SIGNUP=false
BASE="http://127.0.0.1:${APP_PORT}"

cleanup() {
  local status=$?
  if [[ $status -ne 0 ]]; then
    echo
    echo "❌ Falhou (código $status). Logs dos containers:"
    compose logs --no-color --tail=80 2>/dev/null || true
  fi
  echo "▶ Derrubando o stack de CI ($COMPOSE_PROJECT_NAME, com volumes)"
  compose down --volumes --remove-orphans --timeout 5 >/dev/null 2>&1 || true
  docker image rm "finance-back-end:${IMAGE_TAG}" "finance-front-end:${IMAGE_TAG}" >/dev/null 2>&1 || true
  rm -rf "$WORKDIR"
  exit "$status"
}
trap cleanup EXIT

step() { printf '\n▶ %s\n' "$1"; }
fail() { echo "✗ $1" >&2; exit 1; }

http() {
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-sS -o "$WORKDIR/body" -w '%{http_code}' -X "$method" --max-time 30)
  [[ -n "$data" ]] && args+=(-H 'Content-Type: application/json' --data "$data")
  [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
  curl "${args[@]}" "${BASE}${path}"
}

expect() {
  local want="$1" got
  shift
  got="$(http "$@")"
  if [[ "$got" != "$want" ]]; then
    echo "Corpo da resposta:" >&2
    head -c 2000 "$WORKDIR/body" >&2 || true
    echo >&2
    fail "$1 $2 → $got (esperado $want)"
  fi
  echo "  ✓ $1 $2 → $got"
}

echo "▶ CI local do stack (projeto $COMPOSE_PROJECT_NAME, porta $APP_PORT)"

step "docker compose config"
compose config -q
if APP_SECRET='' compose config -q >/dev/null 2>&1; then
  fail "o compose aceitou APP_SECRET vazio — o \${APP_SECRET:?} deveria barrar"
fi
echo "  ✓ válido; APP_SECRET ausente é recusado"

step "Nomes: grupo finance, containers postgres, back-end e front-end"
names="$(FM_CONTAINER_PREFIX='' COMPOSE_PROJECT_NAME='' compose config --format json | jq -r '.name + " " + ([.services[].container_name] | sort | join(" "))')"
[[ "$names" == "finance back-end front-end postgres" ]] || fail "nomes da pilha real: '$names' (esperado 'finance back-end front-end postgres')"
echo "  ✓ finance: postgres, back-end, front-end"

step "Portas publicadas: só o front-end, só em 127.0.0.1"
compose config --format json > "$WORKDIR/config.json"
published="$(jq -r '.services | to_entries[] | select(.value.ports != null) | .key' "$WORKDIR/config.json" | sort | tr '\n' ' ')"
[[ "$published" == "front-end " ]] || fail "serviços com porta publicada: '${published}' (esperado só 'front-end')"
non_loopback="$(jq -r '[.services["front-end"].ports[] | select(.host_ip != "127.0.0.1")] | length' "$WORKDIR/config.json")"
[[ "$non_loopback" == "0" ]] || fail "o front-end publica porta fora do 127.0.0.1"
echo "  ✓ só front-end, em 127.0.0.1"

step "shellcheck (scripts/*.sh)"
docker run --rm -v "$INFRA_DIR":/mnt:ro -w /mnt koalaman/shellcheck-alpine:v0.10.0 \
  sh -c 'shellcheck scripts/*.sh'
echo "  ✓ sem avisos"

step "Build das imagens (back-end e front-end)"
compose build --quiet

step "Stack descartável de pé (postgres → back-end com migrations → front-end)"
compose up -d --wait --wait-timeout 300
compose ps -a

step "Smoke tests (porta publicada, proxy /api do front-end)"
bound="$(compose port front-end 3000)"
[[ "$bound" == "127.0.0.1:${APP_PORT}" ]] || fail "front-end publicado em '$bound' (esperado 127.0.0.1:${APP_PORT})"
echo "  ✓ front-end em $bound"

expect 200 GET /entrar
expect 307 GET /visao-geral
expect 200 GET /api/health
[[ "$(jq -r '.data.status' "$WORKDIR/body")" == "ok" ]] || fail "/api/health sem status ok"

expect 200 GET /api/auth/signup-status
[[ "$(jq -r '.data.signupOpen' "$WORKDIR/body")" == "true" ]] || fail "cadastro deveria estar aberto para o primeiro usuário"

EMAIL="ci@finance-manager.local"
PASSWORD="ci-$(openssl rand -hex 8)"
expect 201 POST /api/auth/register "$(jq -nc --arg e "$EMAIL" --arg p "$PASSWORD" '{name: "CI", email: $e, password: $p}')"
[[ -n "$(jq -r '.data.accessToken // empty' "$WORKDIR/body")" ]] || fail "register sem accessToken"

LOGIN_JSON="$(jq -nc --arg e "$EMAIL" --arg p "$PASSWORD" '{email: $e, password: $p}')"
expect 200 POST /api/auth/login "$LOGIN_JSON"
TOKEN="$(jq -r '.data.accessToken // empty' "$WORKDIR/body")"
[[ -n "$TOKEN" ]] || fail "login sem accessToken"

expect 200 GET /api/auth/me "" "$TOKEN"
[[ "$(jq -r '.data.email' "$WORKDIR/body")" == "$EMAIL" ]] || fail "/api/auth/me devolveu outro usuário"

expect 403 POST /api/auth/register '{"name":"Outro","email":"outro@finance-manager.local","password":"outra-senha-123"}'

if [[ -d "$INFRA_DIR/../api/src/modules/backup" ]]; then
  if [[ -d "$INFRA_DIR/../api/src/modules/recurrences" ]]; then
    expect 200 GET /api/ledgers "" "$TOKEN"
    LEDGER_ID="$(jq -r '.data.data[0].ledgerId' "$WORKDIR/body")"
    expect 201 POST /api/accounts "$(jq -nc --arg l "$LEDGER_ID" '{ledgerId: $l, name: "Conta CI", type: "CHECKING"}')" "$TOKEN"
    ACCOUNT_ID="$(jq -r '.data.accountId' "$WORKDIR/body")"
    expect 201 POST /api/recurrences "$(jq -nc --arg a "$ACCOUNT_ID" --arg m "$(date +%Y-%m-01)" '{accountId: $a, kind: "EXPENSE", description: "Aluguel CI", amountCents: 100000, dayOfMonth: 5, startMonth: $m}')" "$TOKEN"
    [[ "$(jq -r '.data.pendingCount' "$WORKDIR/body")" == "3" ]] || fail "recorrente não gerou os 3 meses pendentes"
    echo "  ✓ recorrente gera o mês atual e os 2 seguintes"
  fi
  expect 200 GET /api/backup/export "" "$TOKEN"
  [[ "$(jq -r '.data.format' "$WORKDIR/body")" == "finance-manager-backup" ]] || fail "export sem format=finance-manager-backup"
  echo "  ✓ export no formato finance-manager-backup"
  jq -c '.data' "$WORKDIR/body" > "$WORKDIR/backup.json"
  expect 200 POST /api/backup/import "$(cat "$WORKDIR/backup.json")" "$TOKEN"
  [[ "$(jq -c '.data.counts' "$WORKDIR/body")" == "$(jq -c '.counts' "$WORKDIR/backup.json")" ]] || fail "import devolveu contagens diferentes do export"
  echo "  ✓ import do próprio export com as mesmas contagens"
  if [[ -d "$INFRA_DIR/../api/src/modules/recurrences" ]]; then
    [[ "$(jq -r '.data.counts.recurrences' "$WORKDIR/body")" == "1" ]] || fail "import sem o recorrente"
    echo "  ✓ backup leva o recorrente"
  fi
  expect 400 POST /api/backup/import '{"format":"outra-coisa","version":1,"data":{}}' "$TOKEN"
else
  echo "  (api/src/modules/backup não existe — export do backup não testado)"
fi

step "Backup e restauração do banco (backup-db.sh / restore-db.sh)"
"$INFRA_DIR/scripts/backup-db.sh"
DUMP="$(find "$BACKUP_DIR" -maxdepth 1 -name 'finance-manager-*.dump' | head -n 1)"
[[ -s "$DUMP" ]] || fail "backup-db.sh não gerou o dump"

compose exec -T postgres sh -c 'psql -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SET client_min_messages TO warning; TRUNCATE user_account CASCADE"'
expect 401 POST /api/auth/login "$LOGIN_JSON"

"$INFRA_DIR/scripts/restore-db.sh" "$DUMP" --yes
expect 200 POST /api/auth/login "$LOGIN_JSON"

printf '\n✅ CI local do stack passou\n'
