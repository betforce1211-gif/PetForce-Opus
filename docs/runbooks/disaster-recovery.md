# Disaster Recovery Runbook

[Ops / Developer]

Procedures for database backup, point-in-time recovery, and disaster recovery for PetForce.

---

## Table of Contents

- [Backup Strategy Overview](#backup-strategy-overview)
- [Supabase PITR (Point-in-Time Recovery)](#supabase-pitr-point-in-time-recovery)
- [Nightly pg_dump Backups](#nightly-pgdump-backups)
- [Restore Procedures](#restore-procedures)
- [Recovery Time Metrics](#recovery-time-metrics)
- [Verification Scripts](#verification-scripts)
- [Escalation](#escalation)

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

> **Action required:** Run `bash infra/scripts/verify-pitr.sh` to confirm PITR is enabled on your Supabase project. Update this section with the results.

| Property | Value |
|----------|-------|
| Enabled | _Run verify-pitr.sh to confirm_ |
| Retention window | 7 days (Supabase Pro default) |
| Granularity | Per-second |
| Earliest restore point | _Run verify-pitr.sh to check_ |

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

1. If within PITR window: restore to the timestamp before the migration
2. Otherwise: restore from nightly backup, then replay safe migrations
3. Fix the migration script before re-applying

---

## Recovery Time Metrics

> **Action required:** Run `bash infra/scripts/test-restore.sh` and record the actual times below.

| Metric | Value | Last tested |
|--------|-------|------------|
| pg_dump duration | _pending_ | _pending_ |
| Restore duration (staging) | _pending_ | _pending_ |
| Total recovery time | _pending_ | _pending_ |
| Database size | _pending_ | _pending_ |

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
