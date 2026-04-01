# Disaster Recovery Runbook

[Ops / Developer]

Comprehensive disaster recovery procedures for PetForce covering database restore, migration rollback, secret recovery, full redeployment, and incident communication.

---

## Table of Contents

- [RTO/RPO Targets](#rtorpo-targets)
- [Backup Strategy Overview](#backup-strategy-overview)
- [Supabase PITR (Point-in-Time Recovery)](#supabase-pitr-point-in-time-recovery)
- [Nightly pg_dump Backups](#nightly-pgdump-backups)
- [Restore Procedures](#restore-procedures)
- [Migration Rollback Procedures](#migration-rollback-procedures)
- [Environment & Secret Recovery](#environment--secret-recovery)
- [App Redeployment from Scratch](#app-redeployment-from-scratch)
- [Recovery Time Metrics](#recovery-time-metrics)
- [Verification Scripts](#verification-scripts)
- [Escalation](#escalation)
- [Incident Communication Template](#incident-communication-template)

---

## RTO/RPO Targets

| Scenario | RTO (Recovery Time) | RPO (Max Data Loss) |
|----------|-------------------|---------------------|
| Accidental data loss (< 7 days) | 15 minutes | Seconds (PITR) |
| Accidental data loss (> 7 days) | 30 minutes | 24 hours (nightly dump) |
| Corrupted migration | 10 minutes (rollback script) | Zero (schema-only) |
| Full Supabase outage | 1 hour | 24 hours (nightly dump) |
| Compromised secrets | 30 minutes | N/A |
| Full redeployment from scratch | 2 hours | 24 hours (nightly dump) |

---

## Backup Strategy Overview

PetForce uses a two-layer backup strategy:

| Layer | Method | Frequency | Retention | RPO |
|-------|--------|-----------|-----------|-----|
| **Supabase PITR** | WAL-based continuous archiving | Continuous | 7 days (configurable) | Seconds |
| **Nightly pg_dump** | Logical dump to S3-compatible storage | Daily at 03:00 UTC | 30 days | 24 hours |

**RPO** = Recovery Point Objective (max data loss in a disaster).

PITR provides near-zero RPO for the last 7 days. The nightly dumps provide a longer-term safety net with 30-day retention.

---

## Supabase PITR (Point-in-Time Recovery)

### What is PITR?

Point-in-Time Recovery lets you restore your database to any specific second within the retention window. It works by continuously archiving PostgreSQL WAL (Write-Ahead Log) files.

### Status

**Verified 2026-04-01** via direct database query (PostgreSQL settings).

| Property | Value |
|----------|-------|
| WAL level | `logical` (PITR-compatible) |
| Archive mode | `on` |
| Archive timeout | `2min` (WAL segments archived every 2 minutes) |
| Max WAL senders | `5` |
| PostgreSQL version | `17.6` |
| Retention window | 7 days (Supabase Pro default) |
| Granularity | Per-second |
| Earliest restore point | Requires `SUPABASE_ACCESS_TOKEN` — run `verify-pitr.sh` |

> **Note:** WAL-level settings confirm PITR infrastructure is active. Full PITR add-on status confirmation via Supabase Management API requires a `SUPABASE_ACCESS_TOKEN` (personal access token). Generate one at Supabase Dashboard → Account → Access Tokens and run `bash infra/scripts/verify-pitr.sh`.

### How to enable PITR

1. Go to Supabase Dashboard → Project Settings → Add-ons
2. Enable "Point in Time Recovery"
3. Requires **Pro plan** or higher
4. PITR is billed per GB of WAL storage

### How to restore with PITR

1. Go to Supabase Dashboard → Database → Backups → Point in Time
2. Select the target timestamp (any second within the retention window)
3. Click "Restore" — this creates a new database branch or restores in-place
4. **Warning:** In-place restore replaces the current database state. All data after the selected timestamp is lost.
5. Verify the restored data using `bash infra/scripts/test-restore.sh`

### PITR vs. daily backups

| Scenario | Use PITR | Use nightly dump |
|----------|----------|-----------------|
| Accidental DELETE/UPDATE in last 7 days | ✓ | |
| Schema migration gone wrong (< 7 days) | ✓ | |
| Need to recover data from > 7 days ago | | ✓ |
| Migrate to a different hosting provider | | ✓ |
| Set up a staging environment | | ✓ |
| Full disaster — Supabase region outage | | ✓ |

---

## Nightly pg_dump Backups

### Configuration

- **Script:** `infra/scripts/db-backup.sh`
- **CI workflow:** `.github/workflows/db-backup.yml`
- **Schedule:** Daily at 03:00 UTC
- **Retention:** 30 days (configurable via `BACKUP_RETENTION_DAYS`)
- **Storage:** S3-compatible bucket (configured via GitHub Secrets)
- **Alerts:** Slack webhook on failure

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | Production PostgreSQL connection string |
| `BACKUP_BUCKET` | S3-compatible bucket name |
| `BACKUP_ENDPOINT` | S3-compatible endpoint URL |
| `BACKUP_AWS_ACCESS_KEY_ID` | S3 access key |
| `BACKUP_AWS_SECRET_ACCESS_KEY` | S3 secret key |
| `BACKUP_REGION` | S3 region (default: "auto") |
| `SLACK_WEBHOOK_URL` | Slack webhook for failure alerts |

### Manual backup

```bash
export DATABASE_URL="<production-url>"
export BACKUP_BUCKET="petforce-backups"
export BACKUP_ENDPOINT="https://your-s3-endpoint"
export AWS_ACCESS_KEY_ID="xxx"
export AWS_SECRET_ACCESS_KEY="xxx"

bash infra/scripts/db-backup.sh
```

### Trigger via GitHub Actions

Go to Actions → "Nightly DB Backup" → "Run workflow" to trigger manually.

---

## Restore Procedures

### Scenario 1: Accidental data loss (< 7 days ago)

**Use Supabase PITR.**

1. Identify the exact timestamp before the data loss
2. Go to Supabase Dashboard → Database → Backups → Point in Time
3. Restore to the target timestamp
4. Verify with `bash infra/scripts/test-restore.sh`
5. Estimated recovery time: **5–15 minutes** (depends on database size)

### Scenario 2: Accidental data loss (> 7 days ago)

**Use nightly pg_dump.**

1. Identify the most recent good backup from S3 storage
2. Download the backup:
   ```bash
   aws s3 cp "s3://${BACKUP_BUCKET}/daily/petforce-YYYY-MM-DDTHHMMSSZ.sql.gz" ./restore.sql.gz \
     --endpoint-url "$BACKUP_ENDPOINT"
   gunzip restore.sql.gz
   ```
3. Restore to staging first:
   ```bash
   STAGING_DATABASE_URL="<staging-url>" psql "$STAGING_DATABASE_URL" < restore.sql
   ```
4. Verify the restored data
5. If good, restore to production:
   ```bash
   psql "$DATABASE_URL" < restore.sql
   ```

### Scenario 3: Full Supabase outage

1. Provision a new PostgreSQL instance (another Supabase project, AWS RDS, etc.)
2. Restore from the latest nightly dump in S3
3. Update `DATABASE_URL` in all deployment environments
4. Redeploy the API
5. Verify all services are healthy

### Scenario 4: Corrupted migration / schema error

**Use the rollback script** (preferred) or PITR (fallback).

1. Identify the migration number that caused the issue
2. Preview the rollback SQL:
   ```bash
   bash infra/scripts/rollback-migration.sh <number> --dry-run
   ```
3. Execute the rollback:
   ```bash
   bash infra/scripts/rollback-migration.sh <number>
   ```
4. If the rollback script fails or no rollback file exists, use PITR to restore to the timestamp before the migration
5. Fix the migration script before re-applying

See [Migration Rollback Procedures](#migration-rollback-procedures) for full details.

---

## Migration Rollback Procedures

### Overview

Every Drizzle migration in `packages/db/drizzle/` has a corresponding `.rollback.sql` file that reverses its changes. The `infra/scripts/rollback-migration.sh` script executes these rollbacks safely.

### Available rollback files

| Migration | Rollback file |
|-----------|---------------|
| 0000 | `0000_remarkable_tigra.rollback.sql` |
| 0001 | `0001_crazy_wendigo.rollback.sql` |
| 0002 | `0002_secret_synch.rollback.sql` |
| 0003 | `0003_ordinary_wildside.rollback.sql` |
| 0004 | `0004_add_text_length_constraints.rollback.sql` |
| 0005 | `0005_add-missing-fk-indexes.rollback.sql` |
| 0006 | `0006_enable-rls-all-tables.rollback.sql` |
| 0007 | `0007_add-full-text-search.rollback.sql` |
| 0008 | `0008_reporting-composite-indexes.rollback.sql` |

### Step-by-step rollback

1. **Identify the bad migration.** Check recent deploys and `packages/db/drizzle/meta/_journal.json`.

2. **Dry-run first** to see what SQL will execute:
   ```bash
   bash infra/scripts/rollback-migration.sh 0008 --dry-run
   ```

3. **Execute the rollback** (prompts for confirmation):
   ```bash
   export DATABASE_URL="<production-url>"
   bash infra/scripts/rollback-migration.sh 0008
   ```

4. **Remove the journal entry.** After a successful rollback, remove the migration entry from `packages/db/drizzle/meta/_journal.json` so `drizzle-kit` can re-apply it later.

5. **Update the Drizzle schema.** Revert the corresponding changes in `packages/db/src/schema.ts` to match the rolled-back database state.

6. **Rebuild and redeploy:**
   ```bash
   pnpm build
   # Deploy API with reverted schema
   ```

### Rolling back multiple migrations

Roll back in reverse order (newest first):

```bash
bash infra/scripts/rollback-migration.sh 0008
bash infra/scripts/rollback-migration.sh 0007
```

### When no rollback file exists

If a migration was applied manually (not via Drizzle), write a manual rollback SQL script or use PITR to restore the database to a point before the migration.

---

## Environment & Secret Recovery

### Where secrets live

| Location | Secrets stored | Access |
|----------|---------------|--------|
| `~/.config/petforce/.env.local` | All app secrets (local dev) | Developer machine |
| `~/.config/petforce/tests.env` | Test credentials | Developer machine |
| GitHub Actions Secrets | Production secrets for CI/CD | Repo admins |
| Railway environment variables | API production secrets | Railway dashboard |
| Vercel environment variables | Web production secrets | Vercel dashboard |
| Clerk Dashboard | Auth API keys, JWT keys | Clerk account owner |
| Supabase Dashboard | Database URL, service role key | Supabase account owner |

### Required secrets (complete list)

| Secret | Source | Used by |
|--------|--------|---------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection string | API, DB scripts |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys | API |
| `CLERK_JWT_KEY` | Clerk Dashboard → API Keys → Advanced → PEM public key | API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys | Web, Mobile |
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Service role key | API |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Database → REST API | API (rate limiting) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Database → REST API | API (rate limiting) |
| `BACKUP_BUCKET` | Your S3-compatible storage provider | Backup script |
| `BACKUP_ENDPOINT` | Your S3-compatible storage provider | Backup script |
| `AWS_ACCESS_KEY_ID` | Your S3-compatible storage provider | Backup script |
| `AWS_SECRET_ACCESS_KEY` | Your S3-compatible storage provider | Backup script |

### Recovery procedure: compromised secrets

1. **Rotate immediately** at the source:
   - **Clerk:** Dashboard → API Keys → Rotate keys
   - **Supabase:** Dashboard → Settings → Database → Reset password; Settings → API → Generate new service role key
   - **Upstash:** Console → Database → Reset REST token
   - **S3/backup:** Regenerate access keys in your storage provider

2. **Update all locations** where the old secret was stored:
   ```bash
   # Update local dev config
   vim ~/.config/petforce/.env.local

   # Update GitHub Actions secrets
   gh secret set CLERK_SECRET_KEY --body "<new-value>"
   gh secret set DATABASE_URL --body "<new-value>"
   # ... repeat for each rotated secret

   # Update Railway
   railway variables set "CLERK_SECRET_KEY=<new-value>"

   # Update Vercel (web env vars)
   npx vercel env rm NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
   npx vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
   ```

3. **Redeploy all services** to pick up new secrets:
   ```bash
   # API (Railway)
   railway up

   # Web (Vercel) — trigger redeploy
   npx vercel --prod
   ```

4. **Verify** all services are healthy:
   ```bash
   curl https://<production-api>/health
   curl -s https://<production-web> -o /dev/null -w "%{http_code}"
   ```

### Recovery procedure: lost local env files

If `~/.config/petforce/` is lost, reconstruct it:

1. Copy the template: `cp .env.example ~/.config/petforce/.env.local`
2. Fill in each value from the source dashboards listed above
3. Re-run env setup: `bash infra/scripts/setup-env.sh`
4. Verify: `pnpm dev` (all services should start)

---

## App Redeployment from Scratch

Use this when you need to rebuild the entire PetForce stack from zero (new infrastructure, total outage, or migration to new providers).

### Prerequisites

- Git access to the PetForce repository
- Node.js 20+ and pnpm installed
- CLI tools: `gh`, `railway`, `vercel` (Vercel via npx)
- Account access: Supabase, Clerk, Vercel, Railway (or alternative hosting)
- S3-compatible storage for backups

### Step 1: Provision infrastructure

1. **Database:** Create a new Supabase project (or alternative PostgreSQL)
   - Note the `DATABASE_URL` from Settings → Database
   - Enable PITR if on Pro plan (Settings → Add-ons)

2. **Auth:** Create or verify Clerk application
   - Note `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_JWT_KEY`

3. **API hosting:** Create Railway service (or Fly.io)
   ```bash
   railway init
   railway add --service petforce-api
   railway service link petforce-api
   ```

4. **Web hosting:** Link Vercel project
   ```bash
   cd apps/web
   npx vercel link --yes
   ```

### Step 2: Configure secrets

```bash
# Populate local env from template
cp .env.example ~/.config/petforce/.env.local
# Edit with actual values from Step 1
vim ~/.config/petforce/.env.local

# Set up symlinks
bash infra/scripts/setup-env.sh

# Push secrets to all deployment targets
bash infra/scripts/setup-deploy.sh
```

### Step 3: Restore the database

If restoring from a backup:

```bash
# Download latest backup from S3
aws s3 ls "s3://${BACKUP_BUCKET}/daily/" --endpoint-url "$BACKUP_ENDPOINT"
aws s3 cp "s3://${BACKUP_BUCKET}/daily/<latest-file>.sql.gz" ./restore.sql.gz \
  --endpoint-url "$BACKUP_ENDPOINT"
gunzip restore.sql.gz

# Restore to new database
psql "$DATABASE_URL" < restore.sql
```

If starting fresh (no backup):

```bash
cd packages/db
export $(grep -v '^#' ../../.env.local | xargs)
npx drizzle-kit push
```

### Step 4: Build and deploy

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Deploy API
cd apps/api
railway up
# Or for Fly.io: fly deploy

# Deploy Web
cd ../web
npx vercel --prod
```

### Step 5: Verify

```bash
# API health
curl https://<production-api>/health
# Expected: {"status":"ok"}

# Web accessibility
curl -s https://<production-web> -o /dev/null -w "%{http_code}"
# Expected: 200 or 307

# Database connectivity (from API logs or Railway dashboard)
# Look for successful startup with no connection errors
```

### Step 6: Restore backup pipeline

```bash
# Verify GitHub Actions secrets are set
gh secret list

# Trigger a manual backup to confirm the pipeline works
# GitHub → Actions → "Nightly DB Backup" → Run workflow
```

### Full redeployment checklist

- [ ] New PostgreSQL instance provisioned
- [ ] PITR enabled (if Pro plan)
- [ ] Clerk app configured with correct keys
- [ ] All secrets populated in `~/.config/petforce/.env.local`
- [ ] `setup-env.sh` and `setup-deploy.sh` run successfully
- [ ] Database restored from backup (or fresh schema pushed)
- [ ] API deployed and `/health` returns OK
- [ ] Web deployed and accessible
- [ ] Nightly backup pipeline tested
- [ ] Slack webhook configured for backup alerts

---

## Recovery Time Metrics

> **Partial data recorded 2026-04-01.** Full restore test requires `pg_dump`/`psql` tools and a `STAGING_DATABASE_URL`.

| Metric | Value | Last tested |
|--------|-------|------------|
| Database size | 24 MB | 2026-04-01 |
| Public tables | 21 | 2026-04-01 |
| pg_dump duration | _pending — requires pg tools_ | _pending_ |
| Restore duration (staging) | _pending — requires staging DB_ | _pending_ |
| Total recovery time | _pending_ | _pending_ |

**Target RTO (Recovery Time Objective):** < 30 minutes for full database restore.

---

## Verification Scripts

### Verify PITR status

```bash
# Requires SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF
bash infra/scripts/verify-pitr.sh
```

Get your access token from: Supabase Dashboard → Account → Access Tokens

### Test a restore

```bash
# Requires DATABASE_URL (source) and STAGING_DATABASE_URL (target)
bash infra/scripts/test-restore.sh
```

**Warning:** The staging database will be overwritten during the test.

---

## Escalation

| Severity | Scenario | Action |
|----------|----------|--------|
| **P1** | Production data loss, no PITR available | Restore from nightly backup immediately. Notify team. |
| **P1** | Supabase region outage | Provision new instance, restore from S3 backup. |
| **P2** | PITR disabled or backup failures | Re-enable PITR, fix backup pipeline, verify within 1 hour. |
| **P3** | Backup older than expected | Check GitHub Actions logs, verify S3 credentials. |

Contact the Supabase support team for P1 issues affecting their managed services: https://supabase.com/dashboard/support

---

## Incident Communication Template

Use these templates when communicating about an active incident. Post updates to the team Slack channel and any relevant status page.

### Initial notification

```
INCIDENT: [P1/P2/P3] — [Brief description]
TIME: [When it started, UTC]
IMPACT: [What users/features are affected]
STATUS: Investigating
LEAD: [Who is handling it]

We are aware of [describe the issue]. We are investigating and will provide updates every [15/30/60] minutes.
```

### Progress update

```
UPDATE — [P1/P2/P3] [Brief description]
TIME: [Current time, UTC]
STATUS: [Investigating / Identified / Mitigating / Resolved]

What we know:
- [Root cause or current hypothesis]

What we're doing:
- [Current actions being taken]

Next update in [15/30/60] minutes.
```

### Resolution notification

```
RESOLVED — [Brief description]
TIME: [Resolution time, UTC]
DURATION: [Total incident duration]

Root cause: [What caused the issue]
Resolution: [What was done to fix it]
Data impact: [Any data loss or corruption, with RPO if applicable]

Follow-up:
- [ ] Post-mortem scheduled for [date]
- [ ] [Any preventive actions to be taken]
```

### Post-mortem outline

After any P1 or P2 incident, write a post-mortem covering:

1. **Timeline** — minute-by-minute account of what happened
2. **Root cause** — what broke and why
3. **Impact** — users affected, duration, data loss
4. **Response** — what was done to resolve it
5. **Lessons learned** — what went well, what didn't
6. **Action items** — concrete follow-ups with owners and due dates
