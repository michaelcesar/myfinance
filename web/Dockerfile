# syntax=docker/dockerfile:1
#
# Production image of the Finance Manager web app (Next.js standalone).
#
#   docker build --build-arg API_URL=http://api:3001 -t financial-web .
#
# API_URL is a build argument, not a runtime variable: next.config.ts rewrites
# /api/:path* to API_URL and Next bakes the rewrites into routes-manifest.json
# during `next build`. Changing the API address requires a rebuild. The local
# stack (infra/docker-compose.yml) uses http://api:3001.
#
# Multi-stage: deps (pnpm install --frozen-lockfile), build (next build with
# output: 'standalone'), runtime with only .next/standalone, .next/static and
# public/. pnpm comes from Corepack at the version pinned in package.json, and
# .npmrc is copied so engine-strict applies. The runtime runs as the
# unprivileged node user behind dumb-init (PID 1: forwards SIGTERM, reaps
# zombies) and binds 0.0.0.0 so the healthcheck and compose can reach it. The
# healthcheck requests /entrar, the only public screen, and checks the Next
# server only, not the API.

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
