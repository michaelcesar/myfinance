# syntax=docker/dockerfile:1
# =============================================================================
# Finance Manager web (financial-web, Next.js) — imagem de produção
# =============================================================================
#
#   docker build --build-arg API_URL=http://api:3001 -t financial-web .
#
# API_URL é argumento de BUILD, não variável de runtime: o `next.config.ts`
# reescreve `/api/:path*` para `API_URL`, e o Next grava os rewrites no
# `routes-manifest.json` durante o `next build`. Trocar `API_URL` no
# `docker run` não muda nada — mudar o endereço da API pede rebuild. No stack
# local (infra/docker-compose.yml) o valor é `http://api:3001`, o nome do
# serviço na rede interna do compose.
#
# Multi-stage: deps (pnpm install --frozen-lockfile) → build (next build com
# `output: 'standalone'`) → runtime só com `.next/standalone`, `.next/static`
# e `public/`. O runtime não tem pnpm nem `node_modules` completo: o
# `server.js` do standalone traz só o que o servidor de fato importa.

# ----------------------------------------------------------------- base
#
# Notas:
#   - pnpm via Corepack, na versão fixada em package.json (`packageManager`).
#   - O `.npmrc` vem junto: `engine-strict` faz parte do contrato do lockfile.
#   - --frozen-lockfile falha se o lock estiver desatualizado, em vez de
#     resolver versões diferentes das testadas.
#   - `public/` pode não existir num clone limpo (o Git não guarda pasta vazia),
#     e o COPY do runtime falharia sem ela. A guarda depois do build pega um
#     standalone vazio antes de a imagem existir.
#   - dumb-init como PID 1: encaminha SIGTERM ao Node (o `docker stop` encerra o
#     servidor de forma limpa em vez de esperar o timeout) e recolhe zumbis.
#   - Sem isto o `server.js` escuta só no hostname do container, e o healthcheck
#     (127.0.0.1) e o compose não alcançam o servidor.
#   - Usuário sem privilégios: a imagem do Node já traz o `node` (uid/gid 1000).
#   - /entrar é a única tela pública: as demais redirecionam para ela sem o
#     cookie de sessão. Confere só o servidor Next, não a API — a saúde da API é
#     do container dela.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="${PNPM_HOME}:${PATH}"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG API_URL=http://api:3001
ENV API_URL=${API_URL}
ENV NODE_ENV=production

RUN mkdir -p public \
 && pnpm run build \
 && test -s .next/standalone/server.js

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends dumb-init \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ARG APP_VERSION=
ENV APP_VERSION=${APP_VERSION}
LABEL org.opencontainers.image.title="Finance Manager web" \
      org.opencontainers.image.version="${APP_VERSION}"

COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/entrar',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
