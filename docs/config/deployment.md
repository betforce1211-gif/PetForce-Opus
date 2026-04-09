<!-- owner: devops -->

# Deployment Topology

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Railway                           │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Next.js Web │  │  Hono + tRPC │                │
│  │  (apps/web)  │  │  (apps/api)  │                │
│  │  :3000       │  │  :3001       │                │
│  └──────┬───────┘  └──────┬───────┘                │
│         │                  │                        │
└─────────┼──────────────────┼────────────────────────┘
          │                  │
          │    ┌─────────────┴───────────────┐
          │    │       Supabase              │
          │    │  PostgreSQL + Storage (S3)  │
          │    └─────────────────────────────┘
          │
   ┌──────┴──────┐
   │    Clerk    │  ← Auth provider (JWT verification)
   └─────────────┘
```

## Environment Flow

1. Environment variables are configured in Railway dashboard per service
2. Locally, all env vars live in a single root `.env.local` file
3. Apps load vars via `dotenv-cli` in their dev/build scripts
4. See `.env.example` for required variables
5. Test credentials live in `tests/.env`

## Health Checks

- API: `GET /health` on port 3001
- Web: Next.js built-in health (Railway auto-detects)

## Deployment Workflow

1. `/ship` creates a PR with version bump and changelog
2. PR merges to `main` → Railway auto-deploys both web and API services
3. `/land-and-deploy` monitors the deployment and runs canary checks
4. `/canary` can be used post-deploy for ongoing monitoring

## Mobile

Expo (apps/mobile) is deployed separately via EAS Build. Not on Railway.
