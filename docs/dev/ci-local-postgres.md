# CI Local PostgreSQL — Switchback Runbook

## What changed

As of March 2026, CI E2E tests use a **local Postgres 16 service container** instead of Supabase-hosted PostgreSQL. This eliminates Supabase egress charges during CI runs.

**Why:** The Supabase free tier egress quota was exceeded (11 GB / 5 GB = 221%), causing all CI E2E tests to fail with `PostgresError: Tenant or user not found`.

**What still uses Supabase:** Only **object storage** (pet avatars and pet photos). Auth remains on Clerk. The database layer (Drizzle ORM + `postgres` driver) connects to whichever PostgreSQL instance `DATABASE_URL` points to.

---

## Files modified

| File | Change | Revert action |
|------|--------|---------------|
| `packages/core/src/env.ts` | Made `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` optional in `supabaseEnvSchema` | Make them required again (remove `.optional()`) |
| `apps/api/src/lib/supabase-storage.ts` | Added `isStorageConfigured()` guard and runtime check in `getSupabase()` | Can keep — the guard is safe even when credentials are present |
| `.github/workflows/ci.yml` | Added Postgres service container; hardcoded `DATABASE_URL` to localhost; removed Supabase secrets and IPv4 workarounds from e2e-tests job | Restore Supabase secrets and pooler step (see below) |

---

## How to switch back to Supabase for CI

Follow these steps when upgrading Supabase or preparing for production CI:

### 1. Ensure Supabase project is active

- Log in to the [Supabase Dashboard](https://supabase.com/dashboard)
- Verify the project is not paused
- Check egress usage is within limits (or upgrade to Pro plan)

### 2. Verify GitHub Secrets

These secrets must be set in **Settings > Secrets and variables > Actions**:

| Secret | Description | Where to find |
|--------|-------------|---------------|
| `DATABASE_URL` | Supabase direct connection string | Supabase > Settings > Database > Connection string > URI |
| `DATABASE_POOLER_URL` | Supabase pooler connection (IPv4) | Supabase > Settings > Database > Connection pooling > Connection string |
| `SUPABASE_URL` | Project API URL | Supabase > Settings > API > Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) | Supabase > Settings > API > service_role key |
| `CLERK_SECRET_KEY` | Clerk backend secret | Clerk Dashboard > API Keys |
| `CLERK_JWT_KEY` | Clerk JWT public key | Clerk Dashboard > API Keys > Advanced > JWT Public Key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | Clerk Dashboard > API Keys |
| `TEST_USER_EMAIL` | E2E test user email (`+clerk_test` suffix) | `tests/.env` |
| `TEST_USER_PASSWORD` | E2E test user password | `tests/.env` |

### 3. Revert `.github/workflows/ci.yml`

Replace the `e2e-tests` job configuration:

**Remove** the `services:` block (Postgres container).

**Restore** the job-level `env:` block:

```yaml
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
      CLERK_JWT_KEY: ${{ secrets.CLERK_JWT_KEY }}
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      NEXT_PUBLIC_API_URL: http://127.0.0.1:3001
      NEXT_PUBLIC_WEB_URL: http://localhost:3000
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
      TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      CLERK_TEST_CODE: "424242"
```

**Restore** the IPv4 pooler step (before migrations):

```yaml
      - name: Use Supabase pooler for IPv4 connectivity
        run: |
          # GHA runners can't route IPv6, and Supabase direct DB hostnames
          # (db.xxx.supabase.co) are IPv6-only. Use the pooler URL which supports IPv4.
          echo "Using DATABASE_POOLER_URL secret for IPv4-only pooler connection"
          echo "DATABASE_URL=$DATABASE_POOLER_URL" >> "$GITHUB_ENV"
        env:
          DATABASE_POOLER_URL: ${{ secrets.DATABASE_POOLER_URL }}
```

**Restore** `NODE_OPTIONS` on the migration step:

```yaml
      - name: Run database migrations
        run: pnpm --filter=@petforce/db db:migrate
        env:
          NODE_OPTIONS: "--dns-result-order=ipv4first"
```

**Restore** `--dns-result-order=ipv4first` on the API server start:

```yaml
          node --dns-result-order=ipv4first dist/index.js > /tmp/api.log 2>&1 &
```

### 4. Optionally restore required Supabase env vars

In `packages/core/src/env.ts`, change `supabaseEnvSchema`:

```ts
export const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.url({ error: "SUPABASE_URL must be a valid URL" }),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string({ error: "SUPABASE_SERVICE_ROLE_KEY is required" })
    .min(1, "SUPABASE_SERVICE_ROLE_KEY must not be empty"),
});
```

This makes the API server fail-fast if Supabase credentials are missing, which is the desired behavior for production.

---

## RLS considerations

- Migration `0006_enable-rls-all-tables.sql` enables Row-Level Security on all 19 tables
- This SQL runs on **any** PostgreSQL instance (not Supabase-specific)
- The `postgres` superuser **bypasses RLS** on both Supabase and local Postgres
- No explicit `CREATE POLICY` statements exist — RLS is defense-in-depth against direct Supabase Dashboard access with the anon key
- **No behavioral difference** between local Postgres and Supabase for the API (both use a superuser/service-role connection)

---

## Supabase Storage setup for production

When Supabase is active, two storage buckets are needed:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `pet-avatars` | Yes | One avatar per pet, upserted on upload |
| `pet-photos` | Yes | Gallery photos, up to 50 per pet |

Create via Supabase Dashboard > Storage, or via the API. Both buckets use public URLs (unauthenticated downloads). Upload authorization is handled at the API layer (Clerk JWT + household membership).

File constraints (enforced in `apps/api/src/routes/upload.ts`):
- Avatars: 5 MB max, JPEG/PNG/WebP
- Photos: 10 MB max, JPEG/PNG/WebP
- MIME type validated via magic bytes (not just Content-Type header)

---

## Local development

For local development without Supabase, use the existing `docker-compose.yml`:

```bash
docker compose up -d postgres   # Start local Postgres
pnpm --filter=@petforce/db db:push  # Push schema
pnpm dev                         # Start all apps
```

The API will start without Supabase credentials. File upload endpoints will return 500 errors — this is expected.
