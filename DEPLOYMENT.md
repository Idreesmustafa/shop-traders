# Deployment runbook

This monorepo deploys three Vercel projects backed by a single MongoDB Atlas cluster. `main` deploys to production; every pull request gets its own preview URL that becomes the staging environment.

## One-time setup

### MongoDB Atlas

1. Create an Atlas project and an M0 cluster (free) for staging, plus an M10+ cluster for production once traffic warrants it.
2. Enable IP access from `0.0.0.0/0` (Vercel's IPs are dynamic; use SRV auth). If your compliance posture requires it, prefer Atlas Private Endpoints later.
3. Create a database user per environment (`shop_traders_prod`, `shop_traders_stg`) with `readWrite` on the shop-traders database only.
4. Copy the connection strings — each will become `MONGODB_URI` on its matching Vercel project + environment.

Atlas provides a replica set on every tier, so the transactions the app depends on work everywhere.

### Vercel — three projects

Create three Vercel projects from this same GitHub repository. On each project, set **Root Directory** to the app folder listed below. `vercel.json` is already committed inside each folder.

| Project name           | Root directory | Framework preset |
| ---------------------- | -------------- | ---------------- |
| `shop-traders-api`     | `apps/api`     | Other            |
| `shop-traders-web`     | `apps/web`     | Vite             |
| `shop-traders-admin`   | `apps/admin`   | Vite             |

Vercel's monorepo install/build hooks are already wired to run `pnpm install --frozen-lockfile` and the workspace-scoped build at the repo root (see each `vercel.json`).

### Environment variables

Set these per environment (Production / Preview / Development) in each Vercel project.

**`shop-traders-api`**:

| Variable                    | Notes                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| `NODE_ENV`                  | `production` (auto on prod), `development` on Preview if desired   |
| `MONGODB_URI`               | Atlas SRV URI for the target environment                           |
| `JWT_SECRET`                | 32+ char random string — rotate with intent, invalidates sessions  |
| `COOKIE_SECRET`             | 32+ char random string                                             |
| `CORS_ORIGINS`              | `https://shop.example.com,https://admin.example.com`               |
| `ACCESS_TOKEN_TTL_MINUTES`  | Default 15                                                         |
| `REFRESH_TOKEN_TTL_DAYS`    | Default 30                                                         |
| `LOG_LEVEL`                 | `info` in prod                                                     |
| `SYNC_INDEXES`              | `false` in prod (see index sync section)                            |

**`shop-traders-web`** and **`shop-traders-admin`**:

No runtime env vars required — the API is reached via a browser fetch to the API's domain. If the web app talks to a different origin than its own, extend `CORS_ORIGINS` on the API accordingly.

### DNS

Point three subdomains at Vercel:

- `api.example.com` → `shop-traders-api`
- `shop.example.com` → `shop-traders-web`
- `admin.example.com` → `shop-traders-admin`

The auth cookies use `sameSite=strict`, which means the browser only sends them to the same origin. When shop and API run under different subdomains, either (a) proxy `/api` from `shop.example.com` to `api.example.com` at the CDN, or (b) switch cookies to `sameSite=lax` — decide before production.

## Index sync on deploy

Production runs with `SYNC_INDEXES=false`. Every schema change ships with a deploy step that runs the sync script:

```bash
pnpm --filter @shop/api sync-indexes
```

Run it manually against staging first, then production, right after a deploy that changes a `*.model.ts`. Rerunning is safe — `Model.syncIndexes()` is idempotent.

## Vercel Cron

BUILD-PLAN adds a nightly reconciliation endpoint in Phase 7. When it lands, register it via a Cron in the API project:

```json
{
  "crons": [{ "path": "/api/v1/cron/reconcile", "schedule": "17 21 * * *" }]
}
```

(21:17 UTC = 02:17 Asia/Karachi.) The endpoint needs a shared-secret header check so only Vercel can invoke it.

## Backups

Atlas M10+ tiers have automated snapshots on by default. On M0 during early staging, run a nightly `mongodump` from a scheduled GitHub Action to Vercel Blob or S3. A backup is only a backup once you have tested the restore path against staging.

## Seeding

Before flipping DNS on a fresh environment, seed a demo tenant so the login page works:

```bash
MONGODB_URI=... SEED_PASSWORD=... pnpm --filter @shop/api seed
```

The seed script refuses to run against `NODE_ENV=production`.

## First deploy checklist

- [ ] Atlas clusters + users created
- [ ] Three Vercel projects created, root directories set
- [ ] Env vars set on all three projects for Production and Preview
- [ ] DNS pointed at the three Vercel projects
- [ ] `pnpm --filter @shop/api sync-indexes` run against production URI once
- [ ] Seed script run against staging (never production)
- [ ] Log into `shop.example.com` with the seeded owner user
- [ ] Log into `admin.example.com` with the seeded super_admin user
- [ ] `/health` returns 200 from `api.example.com`
