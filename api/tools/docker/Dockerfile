# syntax=docker/dockerfile:1
# =============================================================================
# Finance Manager API (financial-api, NestJS) — imagem de produção
# =============================================================================
# Este arquivo vive em tools/docker/, mas o contexto de build é a RAIZ do repo:
#
#   docker build -f tools/docker/Dockerfile -t financial-api .
#   docker build -f tools/docker/Dockerfile --build-arg APP_VERSION=1.2.0 -t financial-api:1.2.0 .
#
# O `.dockerignore` fica na raiz (o Docker só o lê do contexto, não daqui).
#
# Multi-stage: devDependencies e TypeScript ficam nos estágios de build; a
# imagem final leva só `dist/`, as dependências de produção e o package.json.
#
# Migrations: não rodam no boot. Uma migration que falha no meio de um boot
# derruba a aplicação inteira, e dois boots em paralelo podem rodá-la duas
# vezes. A imagem carrega tudo que o CLI do TypeORM precisa sem ts-node —
# `typeorm` e `dotenv` são dependências de produção, `dist/config/datasource.js`
# e `dist/database/migrations/*.js` saem do `pnpm run build` — então rode-as
# como job one-off ANTES de subir a nova versão:
#
#   docker run --rm -e POSTGRES_URI=... financial-api npm run migration:run:prod
#
# No stack local (infra/docker-compose.yml) isso é o serviço `migrate`, do
# qual a API depende com `service_completed_successfully`.

# ----------------------------------------------------------------- base
#
# Notas:
#   - pnpm via Corepack, na versão fixada em package.json (`packageManager`).
#   - O `.npmrc` e o `pnpm-workspace.yaml` vêm junto de propósito: eles mudam a
#     resolução (engine-strict, onlyBuiltDependencies), e sem eles o `--frozen-lockfile`
#     poderia reprovar ou instalar algo diferente do testado.
#   - --frozen-lockfile falha se o lock estiver desatualizado, em vez de
#     resolver versões diferentes das testadas.
#   - `build` = `nest build` (src → dist) + `build:migrations`
#     (database/migrations/*.ts → dist/database/migrations/*.js). As guardas
#     depois dele pegam um build que termina com código 0 e saída vazia — sem
#     elas, o problema só apareceria no `docker compose up`.
#   - dumb-init como PID 1: encaminha SIGTERM ao Node (o `docker stop` encerra a
#     API de forma limpa em vez de esperar o timeout e matar com SIGKILL) e
#     recolhe processos zumbis.
#   - O `npm run migration:run:prod` não deve tentar falar com o registro.
#   - Versão gravada na imagem, não vinda de configuração em tempo de execução:
#     a imagem sabe a própria versão. Sem o argumento a variável fica vazia.
#   - Usuário sem privilégios: a imagem do Node já traz o `node` (uid/gid 1000).
#   - GET /health confere o processo e um `SELECT 1` no banco. Com o banco fora,
#     o container fica `unhealthy` — no compose isso só segura quem depende da
#     API (o web); não reinicia nada.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY database/migrations ./database/migrations
RUN pnpm run build \
 && test -s dist/main.js \
 && test -s dist/config/datasource.js \
 && ls dist/database/migrations/*.js >/dev/null

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prod

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

ARG APP_VERSION=
ENV APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="Finance Manager API" \
      org.opencontainers.image.version="${APP_VERSION}"

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
