# Finance Manager Web

Web app of Finance Manager, a personal finance system. It runs locally only; there is no deploy.

- Next.js 16 (App Router), React, TypeScript (strict)
- TanStack Query for server state, Tailwind v4 design tokens, Formik + Yup for forms
- Screens: Visão geral, Previsão, Análises, Lançamentos, Investimentos, Livros, Recorrentes, Contas and Configurações (including backup)
- The UI text is in Brazilian Portuguese

## Requirements

- Node, version in `.nvmrc`
- pnpm through Corepack (`corepack enable`); the version is pinned in `package.json`

## Development

The API must be running on `http://localhost:3001`. The web app only calls `/api/*`, which `next.config.ts` rewrites to `API_URL` (default `http://localhost:3001`), so the browser sees a single origin. To use another address, copy `.env.example` to `.env.local` and set `API_URL`.

```bash
pnpm install
pnpm dev   # http://localhost:3000
```

## Checks

```bash
pnpm lint        # ESLint + Prettier
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest, including the code style guard tests
```

`scripts/ci-local.sh` runs the CI jobs (credential scan, lint, typecheck, tests, audit, production build and Docker image build) on a clean clone inside Docker. GitHub runs the same jobs from `../.github/workflows/web.yml`. The repository's pre-push hook calls it when `web/` changes; enable the hooks once per clone, from the repository root, with `git config core.hooksPath .githooks`.

## Running everything together

The full stack (database, API and web) runs with Docker Compose. See [`../infra`](../infra/README.md). The app is served at http://localhost:8080.

## Local-only files

`docs/`, `CLAUDE.md` and `AGENTS.md` are local-only and are not versioned.
