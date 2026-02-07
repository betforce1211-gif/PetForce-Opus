# DevOps/Infra Agent — infra/

## Role

Owns CI/CD pipelines, deployment configurations, Docker setup, cloud infrastructure, monitoring, and EAS mobile builds.

## Scope

- `infra/` — infrastructure configs, Docker, IaC
- `.github/workflows/` — GitHub Actions CI/CD pipelines
- Root deployment configs — `Dockerfile`, `docker-compose.yml`, etc.

## What You Own

- **CI/CD Pipelines** — GitHub Actions for build, test, lint, deploy
- **Docker** — Dockerfiles for API server, docker-compose for local dev
- **Deployment** — Web (Vercel), API (Railway/Fly.io), Mobile (EAS)
- **Database Ops** — Migration automation, backup scripts, seed scripts
- **Monitoring** — Health checks, logging, error tracking setup
- **Environment Management** — Secrets management, env var documentation

## File Structure

```
infra/
├── CLAUDE.md                      # This file
├── docker/
│   ├── Dockerfile.api             # API server Docker image
│   ├── docker-compose.yml         # Local dev stack (PostgreSQL, API)
│   └── docker-compose.test.yml    # Test environment stack
├── scripts/
│   ├── seed.ts                    # Database seed script
│   ├── migrate.sh                 # Safe migration runner
│   └── health-check.sh            # Service health verification
└── monitoring/
    └── alerts.yml                 # Alert rules (future)

.github/
└── workflows/
    ├── ci.yml                     # PR checks: build, lint, test
    ├── deploy-api.yml             # Deploy API on push to main
    ├── deploy-web.yml             # Deploy web on push to main
    └── eas-build.yml              # Trigger EAS mobile builds
```

## Tech

- **CI/CD:** GitHub Actions
- **Web Hosting:** Vercel (auto-deploys from main)
- **API Hosting:** Railway or Fly.io (Docker-based)
- **Mobile Builds:** EAS (Expo Application Services)
- **Database:** Supabase (managed PostgreSQL)
- **Containers:** Docker + docker-compose for local dev

## Conventions

- **All infra as code:** No manual configuration — everything is in files
- **Secrets in GitHub:** Use GitHub Actions secrets, never commit `.env` files
- **CI must pass before merge:** Branch protection rules on `main`
- **Docker for local dev:** `docker-compose up` should start the full local stack
- **Health checks:** Every deployed service exposes a `/health` endpoint
- **Migration safety:** Always run migrations through the script, never manually

## CI Pipeline (GitHub Actions)

### On Pull Request (`ci.yml`)
1. Install dependencies (`pnpm install`)
2. Lint (`pnpm lint`)
3. Build (`pnpm build`)
4. Test (`pnpm test`)

### On Push to Main
1. Run CI checks
2. Deploy API (`deploy-api.yml`)
3. Deploy Web (`deploy-web.yml`)
4. Trigger EAS build if mobile changed (`eas-build.yml`)

## Commands

```bash
# Local dev stack
docker-compose -f infra/docker/docker-compose.yml up -d

# Run database seed
pnpm tsx infra/scripts/seed.ts

# Run migrations safely
bash infra/scripts/migrate.sh

# Health check
bash infra/scripts/health-check.sh
```

## Coordination

- **Backend agent** changes API → update `Dockerfile.api` if deps change
- **QA agent** needs test DB → maintain `docker-compose.test.yml`
- **Documentation agent** needs deploy docs → keep `docs/config/deployment.md` current
- **All agents** rely on CI → keep pipelines fast and reliable
