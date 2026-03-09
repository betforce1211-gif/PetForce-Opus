# Deployment Pipeline

**Goal:** Deploy web app and API to production, set up automated CI/CD

**Owner:** DevOps/Infra agent

**Status:** Not started

---

## Steps

- [ ] Add Dockerfile to `apps/api/`
- [ ] Deploy API to Railway or Fly.io
- [ ] Connect web app to Vercel
- [ ] Configure production environment variables (Supabase, Clerk)
- [ ] Set up staging Supabase instance for preview deployments
- [ ] Add E2E tests to CI workflow (GitHub Actions)
- [ ] Add deploy-on-merge workflow (main → production)
- [ ] Add `drizzle-kit migrate` step to deploy pipeline

## Decision Log

_No decisions yet._

## Notes

- API needs a health check endpoint for Railway/Fly.io probes
- Clerk test mode uses `+clerk_test` email suffix — staging should use the same Clerk instance in test mode
- E2E tests require Playwright browsers installed in CI runner
