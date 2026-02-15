# Runbooks

[Ops / Developer]

Operational procedures for common tasks and incident response.

---

## Table of Contents

- [Database Migrations](#database-migrations)
- [Adding a New Column Safely](#adding-a-new-column-safely)
- [Resetting the Database](#resetting-the-database)
- [Deployment](#deployment)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [Incident Response](#incident-response)

---

## Database Migrations

### Using Drizzle Kit (interactive)

Best for local development. Drizzle Kit may prompt about constraints — requires a terminal.

```bash
cd packages/db

# Load env vars
export $(grep -v '^#' .env.local | xargs)

# Generate migration SQL (optional, for version control)
npx drizzle-kit generate

# Push schema directly to the database
npx drizzle-kit push
```

### Using Raw SQL (non-interactive)

Best for CI/CD, scripts, or when `drizzle-kit push` prompts are blocking. Use when you know exactly what SQL to run.

```bash
cd packages/db
export $(grep -v '^#' .env.local | xargs)

# Run SQL directly via the postgres driver
node -e "
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL);
  sql\`ALTER TABLE pets ADD COLUMN IF NOT EXISTS avatar_url TEXT\`
    .then(() => { console.log('Done'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
"
```

Or with tsx:

```bash
../../apps/api/node_modules/.bin/tsx -e "
  import postgres from 'postgres';
  const sql = postgres(process.env.DATABASE_URL!);
  await sql\`ALTER TABLE pets ADD COLUMN IF NOT EXISTS avatar_url TEXT\`;
  console.log('Done');
  process.exit(0);
"
```

### Migration Safety Rules

1. **Always use `IF NOT EXISTS` / `IF EXISTS`** — makes migrations idempotent
2. **Push schema changes before declaring done** — Drizzle `select()` queries ALL defined columns. If the schema defines a column that doesn't exist in the database, every query on that table fails
3. **Never drop columns in production without removing them from the schema first** — reverse of the above: schema references a missing column = crash
4. **Test locally before pushing to production** — use a local PostgreSQL or a Supabase branch

### Migration Order

When adding a new feature that touches DB + API + frontend:

1. Add columns/tables to `packages/db/src/schema.ts`
2. Push the schema to the database (SQL or `drizzle-kit push`)
3. Build `@petforce/db` to verify the schema compiles
4. Add types/schemas to `@petforce/core`
5. Add API router in `apps/api`
6. Add frontend components in `apps/web`
7. Run `pnpm build` to verify everything compiles

---

## Adding a New Column Safely

Example: adding a `notes` column to the `pets` table.

### Step 1: Update the schema

```ts
// packages/db/src/schema.ts
export const pets = pgTable("pets", {
  // ... existing columns
  notes: text("notes"),  // new column
});
```

### Step 2: Push to database

```bash
cd packages/db
export $(grep -v '^#' .env.local | xargs)

# Option A: Drizzle Kit (may prompt)
npx drizzle-kit push

# Option B: Raw SQL (no prompts)
node -e "
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL);
  sql\`ALTER TABLE pets ADD COLUMN IF NOT EXISTS notes TEXT\`
    .then(() => { console.log('Done'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
"
```

### Step 3: Verify

```bash
pnpm build
```

If the build passes, the column is live and queries will work.

---

## Resetting the Database

**Warning: This destroys all data.** Only use in development.

### Drop and recreate (local PostgreSQL)

```bash
dropdb petforce
createdb petforce
cd packages/db
export $(grep -v '^#' .env.local | xargs)
npx drizzle-kit push
```

### Supabase

1. Go to your Supabase project dashboard
2. **SQL Editor** > run: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
3. Re-push the schema:
   ```bash
   cd packages/db
   export $(grep -v '^#' .env.local | xargs)
   npx drizzle-kit push
   ```

---

## Deployment

### Current Architecture

| Service | Host | Deploy method |
|---------|------|--------------|
| Web (Next.js) | Vercel | Auto-deploy from `main` |
| API (Hono) | Railway / Fly.io | Docker-based deploy |
| Database | Supabase | Managed PostgreSQL |
| Storage | Supabase Storage | Managed object storage |
| Auth | Clerk | Managed auth service |
| Mobile | EAS (Expo) | EAS Build on demand |

### Deploying the Web App

The Next.js web app deploys automatically to Vercel on push to `main`.

**Required Vercel env vars:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_API_URL` (production API URL)

**Manual deploy:**
```bash
npx vercel --prod
```

### Deploying the API

The API runs as a standalone Node.js server. Deploy with Docker or directly.

**Environment variables needed in production:**
- `DATABASE_URL`
- `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_PORT`

**Build and run:**
```bash
cd apps/api
pnpm build
node dist/index.js
```

### Deploying Database Changes

Schema changes must be pushed **before** deploying new API/web code that depends on them.

```bash
# 1. Push schema to production database
cd packages/db
DATABASE_URL="<production-url>" npx drizzle-kit push

# 2. Deploy API (new code expects new columns)
# 3. Deploy Web
```

### Pre-deploy Checklist

- [ ] `pnpm build` passes locally
- [ ] `pnpm lint` passes locally
- [ ] Database schema pushed to production
- [ ] Environment variables set in hosting platform
- [ ] API `/health` endpoint returns `{ status: "ok" }` after deploy

---

## Health Checks

### API health endpoint

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Database connectivity

```bash
cd packages/db
export $(grep -v '^#' .env.local | xargs)
node -e "
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL);
  sql\`SELECT 1 as ok\`.then(r => {
    console.log('DB OK:', r);
    process.exit(0);
  }).catch(e => {
    console.error('DB FAIL:', e.message);
    process.exit(1);
  });
"
```

### Web app

```bash
curl -s http://localhost:3000 | head -1
# Should return HTML
```

### Full stack check

```bash
# Start all services
pnpm dev

# Wait for startup, then verify:
curl -s http://localhost:3001/health  # API
curl -s http://localhost:3000 -o /dev/null -w "%{http_code}"  # Web (expect 200 or 307)
```

---

## Troubleshooting

### "column X does not exist" errors

**Cause:** Schema defines a column that hasn't been pushed to the database yet. Drizzle `select()` queries ALL defined columns.

**Fix:** Push the schema change:
```bash
cd packages/db
export $(grep -v '^#' .env.local | xargs)
npx drizzle-kit push
```

Or use raw SQL:
```sql
ALTER TABLE <table_name> ADD COLUMN IF NOT EXISTS <column_name> <type>;
```

### Dashboard stuck on "Loading..."

**Cause:** Usually a query error that goes unhandled. The component waits for data that never arrives.

**Fix:** Check browser console for tRPC errors. Common causes:
- API not running (start with `pnpm dev --filter=api`)
- Missing/expired auth token (sign out and back in)
- Database column mismatch (see above)
- Missing env vars in the API

### API env vars not loading

**Cause:** `tsx watch` doesn't auto-load `.env.local`. ESM imports are hoisted, so inline env loading runs after `@petforce/db` reads `DATABASE_URL`.

**Fix:** The API uses `env.cjs` as a preload script. Make sure the dev command includes:
```
tsx --require ./env.cjs watch src/index.ts
```

### Clerk JWT verification fails (JWKS error)

**Cause:** `@clerk/backend` `verifyToken({ secretKey })` tries to fetch JWKS from Clerk's servers. This can fail in some environments (cold starts, network issues).

**Fix:** Use `CLERK_JWT_KEY` instead — direct PEM public key verification with no network calls:
1. Clerk dashboard > API Keys > Advanced > copy PEM public key
2. Set `CLERK_JWT_KEY` in `.env.local` (replace newlines with `\n`)

### Stale auth token in the web app

**Cause:** Clerk's `getToken()` was captured in a closure during first render.

**Fix:** The `providers.tsx` uses a `useRef` pattern to always get the latest `getToken`. If you see stale token errors, sign out and back in.

### Pet photos not uploading

**Cause:** Missing Supabase env vars or bucket not configured.

**Fix:**
1. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `apps/api/.env.local`
2. Verify the `pet-avatars` bucket exists in Supabase Storage
3. Verify the bucket is set to public
4. Check API logs for specific error messages

### `drizzle-kit push` hangs or prompts unexpectedly

**Cause:** Drizzle Kit is interactive and prompts about constraint changes.

**Fix:** Use raw SQL instead:
```bash
node -e "
  const postgres = require('postgres');
  const sql = postgres(process.env.DATABASE_URL);
  sql\`<your SQL here>\`
    .then(() => { console.log('Done'); process.exit(0); })
    .catch(e => { console.error(e); process.exit(1); });
"
```

### Playwright E2E tests fail with "about:blank" or UNAUTHORIZED

**Cause:** Clerk session expired during the test run.

**Fix:** The test suite uses `safeGoto()` which handles re-authentication. If tests are consistently failing:
1. Check that `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set in `tests/.env`
2. Verify the test user account exists in Clerk
3. Run tests with `--workers=1` to avoid session conflicts

### Build fails in `@petforce/web` with tRPC type errors

**Cause:** The tRPC client export needs an explicit type annotation.

**Fix:** In `apps/web/src/lib/trpc.ts`, ensure:
```ts
export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> = createTRPCReact<AppRouter>();
```

---

## Incident Response

### Severity Levels

| Level | Description | Response time |
|-------|-------------|---------------|
| **P1 — Outage** | App completely down, data loss risk | Immediate |
| **P2 — Degraded** | Major feature broken, auth failures | Within 1 hour |
| **P3 — Minor** | Cosmetic issue, non-critical feature broken | Within 1 day |

### P1 — App is down

1. **Check API health:** `curl https://<production-api>/health`
2. **Check Supabase status:** [status.supabase.com](https://status.supabase.com)
3. **Check Clerk status:** [status.clerk.com](https://status.clerk.com)
4. **Check hosting provider status** (Vercel / Railway / Fly.io)
5. **Check API logs** in the hosting provider dashboard
6. **If database is unreachable:** Check Supabase dashboard for connection limits, paused projects, or region outages
7. **If auth is broken:** Check Clerk dashboard for API key expiration or plan limits
8. **Rollback if needed:** Deploy the previous working commit

### P2 — Feature broken after deploy

1. **Identify the breaking commit:** `git log --oneline -10`
2. **Check if it's a schema mismatch:** New code expects columns that haven't been pushed
3. **Fix forward or rollback:**
   - If schema issue: push the missing migration to production
   - If code bug: fix, push to `main`, auto-deploy triggers
   - If unclear: revert the commit and deploy

### Database Backup

Supabase provides automatic daily backups on paid plans. For manual snapshots:

```bash
# Export using pg_dump
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Restore
psql "$DATABASE_URL" < backup-20240101.sql
```
