# shop-traders

Shop management SaaS monorepo. See `CLAUDE.md` for product scope and rules, `BUILD-PLAN.md` for the task-level roadmap.

## Prerequisites

- Node.js 22.x (`.nvmrc` pins the major)
- pnpm 10.x — enable via `corepack enable`; the exact version is pinned in `packageManager`

## Install

```bash
pnpm install
```

## Commands

Run from the repo root.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Watches every workspace with a `dev` script in parallel. |
| `pnpm build` | Builds every workspace with a `build` script. |
| `pnpm test` | Runs Vitest in every workspace that has tests. |
| `pnpm lint` | ESLint across the whole repo (flat config). |
| `pnpm typecheck` | TypeScript `--noEmit` in every workspace. |
| `pnpm format` | Prettier write. `pnpm format:check` to only check. |

## Layout

```
apps/
  api/      Express + Mongoose API (serves /api/v1 and /api/admin/v1)
  web/      Shop app (React + Vite + Tailwind + TanStack Query)
  admin/    Super-admin app (same stack, admin API only)
packages/
  shared/   zod schemas, module registry, money/tax/date utilities
```

## Deployment

See `DEPLOYMENT.md` for the Vercel + MongoDB Atlas runbook, environment variables, and first-deploy checklist. Each app carries its own `vercel.json` so a Vercel project just needs to point at its `apps/*` folder.
