# Deployment Pipeline

**Goal:** Deploy web app and API to production, set up automated CI/CD

**Owner:** DevOps/Infra agent

**Status:** Implementation complete — pending secrets configuration

---

## Steps

- [x] Add Dockerfile to `apps/api/`
- [x] Add deploy-on-merge workflow (main → production)
- [x] Add `drizzle-kit migrate` step to deploy pipeline
- [x] Add programmatic migration script (`packages/db/src/migrate.ts`)
- [x] Add `db:migrate` script to db package, turbo.json, root package.json
- [x] Complete `deploy.yml` with Railway CLI + Vercel CLI deploys
- [x] Add CI gate (deploy only runs after CI passes)
- [x] Add deploy concurrency lock (prevent parallel deploys)
- [x] Add health check verification after API deploy
- [x] Add PR preview deployments (`preview.yml`)
- [x] Add `docker-compose.yml` for local full-stack development
- [x] Add Railway preview environment cleanup on PR close
- [ ] Configure production environment variables (Supabase, Clerk) in Railway + Vercel
- [ ] Set up GitHub secrets: `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Set `API_PRODUCTION_URL` GitHub variable for health checks
- [ ] Set up staging Supabase instance for preview deployments
- [ ] First production deploy and smoke test

## Decision Log

- **2026-03-09:** Multi-stage Dockerfile (deps → build → runner) for minimal image size.
- **2026-03-09:** Deploy workflow runs db:migrate before deploying new code.
- **2026-03-09:** Vercel handles web deploy via CLI (not GitHub integration) for better control.
- **2026-03-09:** Health check endpoint already exists at GET /health.
- **2026-03-09:** Added `workflow_call` trigger to CI so deploy.yml can gate on it.
- **2026-03-09:** Preview deploys use Railway ephemeral environments + Vercel preview URLs.
- **2026-03-09:** Programmatic migration via `drizzle-orm/postgres-js/migrator` instead of `drizzle-kit push` (non-destructive, uses generated SQL files).
- **2026-03-09:** Production deploy concurrency lock prevents parallel deploys.

## Secrets Required

| Secret | Where | Purpose |
|--------|-------|---------|
| `RAILWAY_TOKEN` | GitHub Secrets | Railway CLI authentication |
| `VERCEL_TOKEN` | GitHub Secrets | Vercel CLI authentication |
| `VERCEL_ORG_ID` | GitHub Secrets | Vercel organization ID |
| `VERCEL_PROJECT_ID` | GitHub Secrets | Vercel project ID |
| `DATABASE_URL` | GitHub Secrets | Production Supabase PostgreSQL URL |
| `CLERK_SECRET_KEY` | GitHub Secrets + Railway | Clerk auth (API server) |
| `CLERK_JWT_KEY` | GitHub Secrets + Railway | Clerk JWT verification (API server) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Railway + Vercel | Clerk auth (frontend) |
| `SUPABASE_URL` | Railway | Supabase access (API server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | Supabase admin access (API server) |
| `API_PRODUCTION_URL` | GitHub Variables | Health check endpoint |

## Files Changed

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | Complete rewrite with Railway + Vercel + CI gate + health check |
| `.github/workflows/preview.yml` | New — PR preview deployments |
| `.github/workflows/ci.yml` | Added `workflow_call` trigger for reuse |
| `packages/db/src/migrate.ts` | New — programmatic migration runner |
| `packages/db/package.json` | Added `db:migrate` script |
| `turbo.json` | Added `db:migrate` task |
| `package.json` | Added `db:migrate` script |
| `docker-compose.yml` | New — local PostgreSQL + API for development |
