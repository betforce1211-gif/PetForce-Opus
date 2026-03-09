# Deployment Pipeline

**Goal:** Deploy web app and API to production, set up automated CI/CD

**Owner:** DevOps/Infra agent

**Status:** In progress

---

## Steps

- [x] Add Dockerfile to `apps/api/`
- [ ] Deploy API to Railway or Fly.io
- [ ] Connect web app to Vercel
- [ ] Configure production environment variables (Supabase, Clerk)
- [ ] Set up staging Supabase instance for preview deployments
- [ ] Add E2E tests to CI workflow (GitHub Actions)
- [x] Add deploy-on-merge workflow (main → production)
- [x] Add `drizzle-kit migrate` step to deploy pipeline

## Decision Log

- **2026-03-09:** Multi-stage Dockerfile (deps → build → runner) for minimal image size.
- **2026-03-09:** Deploy workflow runs db:push before deploying new code.
- **2026-03-09:** Vercel handles web deploy via GitHub integration.
- **2026-03-09:** Health check endpoint already exists at GET /health.

## Notes

- API needs a health check endpoint for Railway/Fly.io probes
- Clerk test mode uses `+clerk_test` email suffix — staging should use the same Clerk instance in test mode
- E2E tests require Playwright browsers installed in CI runner
