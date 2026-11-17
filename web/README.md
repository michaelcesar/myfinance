# Financial Web

Front-end of **Financial** — personal finance and the finances of each of your companies in one place,
with an interface inspired by Apple's design language (system fonts and colors, translucent
materials, sheets, segmented controls, spring animations, light and dark themes).

- Next.js 16 (App Router, Cache Components) · React 19.3 · TypeScript (strict)
- Tailwind CSS v4 design tokens · Motion · Radix primitives · TanStack Query 5 · Recharts 3
- Talks to [`financial-api`](../api) through a same-origin `/api/*` rewrite

## Screens

Overview (consolidated net worth, period results, one card per ledger, 12-month cash flow, income
by origin, expenses by category, upcoming, allocation) · Personal and each company (summary,
transactions, accounts, income, investments) · Transactions · Accounts · Income sources · Clients ·
Investments · Settings (appearance, profile, password, categories). A global "+" opens the
expense / income / transfer sheet from anywhere.

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env.local   # API_URL, defaults to http://localhost:3001
pnpm dev                     # http://localhost:3000 — the API must be running
```

## Scripts

| Script | What it does |
|---|---|
| `dev` / `build` / `start` | Next.js dev server / production build / serve the build |
| `lint` / `format` | ESLint + Prettier check / write |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest (units, components and code-style guards) |
| `precommit` | lint + typecheck + test |

## License

UNLICENSED — private project.
