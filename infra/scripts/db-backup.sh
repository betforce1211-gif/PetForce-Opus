#!/usr/bin/env bash
# Automated PostgreSQL backup script for PetForce.
# Dumps the database, compresses it, and uploads to cloud storage (S3-compatible).
#
# Required env vars:
#   DATABASE_URL          — PostgreSQL connection string
#   BACKUP_BUCKET         — S3-compatible bucket name (e.g., "petforce-backups")
#   BACKUP_ENDPOINT       — S3-compatible endpoint URL (e.g., Cloudflare R2, AWS S3, MinIO)
#   AWS_ACCESS_KEY_ID     — S3 access key
#   AWS_SECRET_ACCESS_KEY — S3 secret key
#
# Optional env vars:
#   BACKUP_RETENTION_DAYS — Delete backups older than N days (default: 30)
#   BACKUP_REGION         — S3 region (default: "auto")
#   SLACK_WEBHOOK_URL     — Slack webhook for failure alerts

set -euo pipefail

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
REGION="${BACKUP_REGION:-auto}"
TIMESTAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
FILENAME="petforce-${TIMESTAMP}.sql.gz"
TMPDIR="$(mktemp -d)"
TMPFILE="${TMPDIR}/${FILENAME}"

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

# --- Validate required env vars ---
missing=()
for var in DATABASE_URL BACKUP_BUCKET BACKUP_ENDPOINT AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done

if [ ${#missing[@]} -gt 0 ]; then
  echo "Error: Missing required environment variables: ${missing[*]}"
  exit 1
fi

# --- Alert helper ---
alert_failure() {
  local message="$1"
  echo "BACKUP FAILED: $message" >&2
  if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
    curl -sf -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"🚨 PetForce DB backup failed: ${message}\"}" \
      || echo "Warning: Slack alert also failed" >&2
  fi
}

# --- Step 1: Dump database ---
echo "Starting backup at ${TIMESTAMP}..."
if ! pg_dump "$DATABASE_URL" --no-owner --no-privileges --clean --if-exists | gzip > "$TMPFILE"; then
  alert_failure "pg_dump failed"
  exit 1
fi

FILESIZE=$(wc -c < "$TMPFILE" | tr -d ' ')
echo "Dump complete: ${FILENAME} (${FILESIZE} bytes)"

# Sanity check — empty or tiny dumps indicate a problem
if [ "$FILESIZE" -lt 1024 ]; then
  alert_failure "Dump file suspiciously small (${FILESIZE} bytes)"
  exit 1
fi

# --- Step 2: Upload to S3-compatible storage ---
S3_PATH="s3://${BACKUP_BUCKET}/daily/${FILENAME}"

echo "Uploading to ${S3_PATH}..."
if ! aws s3 cp "$TMPFILE" "$S3_PATH" \
    --endpoint-url "$BACKUP_ENDPOINT" \
    --region "$REGION" \
    --quiet; then
  alert_failure "S3 upload failed"
  exit 1
fi

echo "Upload complete."

# --- Step 3: Prune old backups ---
echo "Pruning backups older than ${RETENTION_DAYS} days..."
CUTOFF_DATE="$(date -u -v-${RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null || date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d)"

aws s3 ls "s3://${BACKUP_BUCKET}/daily/" \
    --endpoint-url "$BACKUP_ENDPOINT" \
    --region "$REGION" \
  | while read -r line; do
      file_date=$(echo "$line" | awk '{print $NF}' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)
      file_name=$(echo "$line" | awk '{print $NF}')
      if [ -n "$file_date" ] && [[ "$file_date" < "$CUTOFF_DATE" ]]; then
        echo "  Deleting old backup: $file_name"
        aws s3 rm "s3://${BACKUP_BUCKET}/daily/${file_name}" \
            --endpoint-url "$BACKUP_ENDPOINT" \
            --region "$REGION" \
            --quiet
      fi
    done

echo "Backup complete: ${FILENAME}"
