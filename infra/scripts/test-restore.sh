#!/usr/bin/env bash
# Test a database restore from Supabase backup to a staging/local instance.
#
# This script:
#   1. Takes a pg_dump from the production database
#   2. Restores it to a staging database
#   3. Runs basic verification queries
#   4. Reports timing for DR metrics
#
# Required env vars:
#   DATABASE_URL          — Production PostgreSQL connection string (read-only access is fine)
#   STAGING_DATABASE_URL  — Staging PostgreSQL connection string (will be overwritten!)
#
# Optional env vars:
#   SKIP_DUMP             — Set to "1" to restore from an existing dump file
#   DUMP_FILE             — Path to an existing dump file (used with SKIP_DUMP=1)

set -euo pipefail

# --- Validate required env vars ---
for var in DATABASE_URL STAGING_DATABASE_URL; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set."
    exit 1
  fi
done

# Safety: refuse to restore if staging URL looks like production
if [ "$DATABASE_URL" = "$STAGING_DATABASE_URL" ]; then
  echo "Error: DATABASE_URL and STAGING_DATABASE_URL are the same. Refusing to overwrite production."
  exit 1
fi

TMPDIR="$(mktemp -d)"
DUMP_FILE="${DUMP_FILE:-${TMPDIR}/petforce-restore-test.sql}"

cleanup() {
  rm -rf "$TMPDIR"
}
trap cleanup EXIT

echo "=== PetForce Restore Test ==="
echo "Started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# --- Step 1: Dump production database ---
DUMP_START=$(date +%s)

if [ "${SKIP_DUMP:-0}" = "1" ] && [ -f "$DUMP_FILE" ]; then
  echo "1. Skipping dump — using existing file: ${DUMP_FILE}"
else
  echo "1. Dumping production database..."
  if ! pg_dump "$DATABASE_URL" \
      --no-owner \
      --no-privileges \
      --clean \
      --if-exists \
      > "$DUMP_FILE"; then
    echo "   Error: pg_dump failed."
    exit 1
  fi
fi

DUMP_END=$(date +%s)
DUMP_DURATION=$((DUMP_END - DUMP_START))
DUMP_SIZE=$(wc -c < "$DUMP_FILE" | tr -d ' ')
echo "   Dump complete: $(echo "$DUMP_SIZE" | awk '{printf "%.1f MB", $1/1048576}') in ${DUMP_DURATION}s"
echo ""

# --- Step 2: Restore to staging ---
echo "2. Restoring to staging database..."
RESTORE_START=$(date +%s)

if ! psql "$STAGING_DATABASE_URL" -f "$DUMP_FILE" -q 2>/dev/null; then
  echo "   Warning: Some restore errors occurred (common for clean restores)."
  echo "   Continuing with verification..."
fi

RESTORE_END=$(date +%s)
RESTORE_DURATION=$((RESTORE_END - RESTORE_START))
echo "   Restore complete in ${RESTORE_DURATION}s"
echo ""

# --- Step 3: Verify restored data ---
echo "3. Verifying restored data..."
VERIFY_PASS=0
VERIFY_FAIL=0

verify_table() {
  local table="$1"
  local count
  count=$(psql "$STAGING_DATABASE_URL" -t -c "SELECT COUNT(*) FROM ${table};" 2>/dev/null | tr -d ' ') || {
    echo "   ✗ ${table}: MISSING"
    VERIFY_FAIL=$((VERIFY_FAIL + 1))
    return
  }
  echo "   ✓ ${table}: ${count} rows"
  VERIFY_PASS=$((VERIFY_PASS + 1))
}

# Core PetForce tables
verify_table "households"
verify_table "household_members"
verify_table "pets"
verify_table "activities"
verify_table "invitations"

echo ""

# --- Step 4: Report results ---
TOTAL_DURATION=$((RESTORE_END - DUMP_START))

echo "=== Restore Test Results ==="
echo ""
echo "Timing:"
echo "  Dump duration:    ${DUMP_DURATION}s"
echo "  Restore duration: ${RESTORE_DURATION}s"
echo "  Total duration:   ${TOTAL_DURATION}s"
echo ""
echo "Verification:"
echo "  Passed: ${VERIFY_PASS}"
echo "  Failed: ${VERIFY_FAIL}"
echo ""

if [ "$VERIFY_FAIL" -gt 0 ]; then
  echo "Result: PARTIAL — some tables could not be verified."
  echo "Action: Check the restore errors above and verify schema compatibility."
  exit 1
else
  echo "Result: SUCCESS — all core tables restored and verified."
fi

echo ""
echo "Record these timing values in docs/runbooks/disaster-recovery.md"
echo "  under 'Recovery Time Metrics' for DR planning."
