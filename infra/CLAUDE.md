# DevOps/Infra Agent — infra/

## Role

Owns CI/CD pipelines, deployment configurations, Docker setup, cloud infrastructure, monitoring, and EAS mobile builds.

## Scope

- `infra/` — infrastructure scripts, deployment configs
- `.github/workflows/` — GitHub Actions CI/CD pipelines
- `apps/api/Dockerfile` — API container image
- `docker-compose.yml` — local dev stack

## What You Own

- **CI/CD Pipelines** — GitHub Actions for build, test, lint, security, deploy
- **Docker** — API Dockerfile (multi-stage), docker-compose for local dev
- **Deployment** — Web (Vercel), API (Railway), Mobile (EAS)
- **Database Ops** — Migration automation, backup scripts (nightly to S3)
- **Monitoring** — Health checks, deploy notifications (Slack)
- **Environment Management** — Secrets management, env var documentation

## File Structure

```
apps/api/Dockerfile               # Multi-stage production API image
docker-compose.yml                 # Local dev stack (Postgres, Redis, API, Worker)

.github/
├── CODEOWNERS                     # Auto-request reviewers by path
├── dependabot.yml                 # Weekly npm + Actions updates
├── labeler.yml                    # Auto-label PRs by changed files
├── pull_request_template.md       # Structured PR template
└── workflows/
    ├── ci.yml                     # PR + push: lint, build, unit tests, security scan, E2E
    ├── deploy-staging.yml         # Push to main → deploy to staging
    ├── deploy.yml                 # Manual trigger → promote staging to production
    ├── preview.yml                # PR preview deploys (Railway + Vercel)
    ├── release.yml                # Manual trigger → create version tag + GitHub release
    ├── auto-approve.yml           # Auto-review bot (10 checks + approve/block)
    ├── pr-metadata.yml            # Auto-label, auto-assign, template check
    ├── pr-time-estimate.yml       # Human vs AI time estimate on merge
    ├── db-backup.yml              # Nightly DB backup to S3
    └── mobile-e2e.yml             # Mobile E2E via Maestro on macOS

infra/
├── CLAUDE.md                      # This file
└── scripts/
    ├── db-backup.sh               # DB backup script (called by db-backup.yml)
    ├── doc-gardener                # Scan for stale docs
    ├── pr-time-estimate            # PR time estimate helper
    ├── roadmap                     # Push ideas to GitHub Issues
    ├── rollback-migration.sh       # DB migration rollback
    ├── setup-deploy.sh             # Configure deploy targets
    ├── setup-env.sh                # Symlink env files
    ├── test-restore.sh             # Test DB restore
    └── verify-pitr.sh              # Verify point-in-time recovery
```

## Deploy Pipeline

### Flow: `main` branch push → staging → manual promote → production

1. **Push to `main`** triggers `deploy-staging.yml`
   - Runs CI (lint, build, test, security scan)
   - Deploys API to Railway staging service
   - Deploys Web to Vercel staging
   - Health checks staging
   - Slack notification on success/failure

2. **Manual dispatch** of `deploy.yml` promotes to production
   - Verifies staging is healthy first (skippable for emergencies)
   - Deploys API to Railway production
   - Deploys Web to Vercel production
   - Health checks production
   - Auto-rollback on health check failure (Railway)
   - Slack notifications at each stage

3. **Releases** via `release.yml` (manual dispatch)
   - Validates semver format
   - Creates git tag + GitHub release
   - Auto-generates release notes from commits

### PR Preview Deploys

PRs get ephemeral preview environments:
- API preview on Railway
- Web preview on Vercel
- Preview URLs posted as PR comments

## CI Pipeline

### On Pull Request (`ci.yml`)
1. **lint-and-build** — pnpm lint + pnpm build
2. **unit-tests** — @petforce/core tests + vitest suite
3. **security-scan** — pnpm audit (high/critical + moderate)
4. **e2e-tests** — Playwright with local Postgres service container (conditional on labels/paths)

### Auto-Review (`auto-approve.yml`)
10-point review: PR size, missing tests, missing docs, console statements, TODOs, large files, new deps, thin description, missing issue link, schema changes without docs. Blocking issues require fixes; clean PRs get auto-approved.

## Tech

- **CI/CD:** GitHub Actions
- **Web Hosting:** Vercel (staging + production)
- **API Hosting:** Railway (staging + production)
- **Mobile Builds:** EAS (Expo Application Services)
- **Database:** Supabase (managed PostgreSQL)
- **Containers:** Docker + docker-compose for local dev
- **Notifications:** Slack webhooks

## Conventions

- **All infra as code** — no manual configuration
- **Secrets in GitHub** — use GitHub Actions secrets, never commit `.env` files
- **CI must pass before merge** — branch protection rules on `main`
- **Docker for local dev** — `docker-compose up` starts the full local stack
- **Health checks** — every deployed service exposes `/health`
- **Migration safety** — always run migrations through CI, never manually
- **Staging first** — all deploys go to staging before production
- **Rollback ready** — production deploys auto-rollback on health check failure

## Required GitHub Secrets

### Production
- `RAILWAY_TOKEN` — Railway deploy token (production)
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` — Vercel production
- `DATABASE_URL` — Production Supabase connection string
- `CLERK_SECRET_KEY`, `CLERK_JWT_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Auth
- `SLACK_WEBHOOK_URL` — Deploy notifications

### Staging
- `RAILWAY_STAGING_TOKEN` — Railway deploy token (staging)
- `STAGING_DATABASE_URL` — Staging database connection string
- `VERCEL_STAGING_PROJECT_ID` — Vercel staging project

### CI/Testing
- `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — E2E test credentials

### Backups
- `BACKUP_BUCKET`, `BACKUP_ENDPOINT`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY` — S3 backup storage

## Commands

```bash
# Local dev stack
docker-compose up -d

# Run migrations
pnpm db:migrate

# Build everything
pnpm build

# Full CI locally
pnpm lint && pnpm build && pnpm --filter=@petforce/core test
```

## Coordination

- **Backend agent** changes API → update `apps/api/Dockerfile` if deps change
- **QA agent** needs test DB → maintain CI `services` block in `ci.yml`
- **Documentation agent** needs deploy docs → keep this file and `docs/` current
- **All agents** rely on CI → keep pipelines fast and reliable
