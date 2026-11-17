# syntax=docker/dockerfile:1
# Finance Manager API (NestJS): multi-stage production image.
#
# Lives in tools/docker/ but the build context is the repo ROOT, where the
# .dockerignore is read:
#   docker build -f tools/docker/Dockerfile -t financial-api .
#   docker build -f tools/docker/Dockerfile --build-arg APP_VERSION=1.2.0 -t financial-api:1.2.0 .
#
# Only dist/, production dependencies and package.json reach the final image.
# pnpm comes from Corepack at the version pinned in package.json. .npmrc and
# pnpm-workspace.yaml are copied on purpose: they change resolution, and without
# them --frozen-lockfile could install something different from what was tested.
# The build is followed by guards so an empty output fails here, not at runtime.
#
# Migrations do not run on boot. Run them as a one-off job before starting a new
# version (node only, no ts-node; locally this is the `migrate` service of
# infra/docker-compose.yml):
#   docker run --rm -e POSTGRES_URI=... financial-api npm run migration:run:prod
#
# dumb-init is PID 1 so SIGTERM reaches Node and zombies are reaped. The app
# runs as the unprivileged `node` user. APP_VERSION is baked into the image.
# GET /health checks the process and a `SELECT 1`; an unhealthy container is
# not restarted, it only holds back dependents.

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
