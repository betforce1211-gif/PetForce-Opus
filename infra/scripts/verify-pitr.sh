#!/usr/bin/env bash
# Verify Supabase PITR (Point-in-Time Recovery) status.
#
# Required env vars:
#   SUPABASE_ACCESS_TOKEN  — Supabase Management API personal access token
#   SUPABASE_PROJECT_REF   — Supabase project reference ID (from dashboard URL)
#
# Usage:
#   export SUPABASE_ACCESS_TOKEN="sbp_xxx"
#   export SUPABASE_PROJECT_REF="abcdefghijklmnop"
#   bash infra/scripts/verify-pitr.sh

set -euo pipefail

# --- Validate required env vars ---
for var in SUPABASE_ACCESS_TOKEN SUPABASE_PROJECT_REF; do
  if [ -z "${!var:-}" ]; then
    echo "Error: $var is not set."
    echo ""
    echo "To get these values:"
    echo "  SUPABASE_ACCESS_TOKEN: https://supabase.com/dashboard/account/tokens"
    echo "  SUPABASE_PROJECT_REF:  The ID in your project URL (https://supabase.com/dashboard/project/<ref>)"
    exit 1
  fi
done

API_BASE="https://api.supabase.com/v1"
AUTH_HEADER="Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"

echo "=== PetForce Supabase PITR Verification ==="
echo ""

# --- Step 1: Get project details ---
echo "1. Fetching project info..."
PROJECT_JSON=$(curl -sf \
  -H "$AUTH_HEADER" \
  "${API_BASE}/projects/${SUPABASE_PROJECT_REF}" 2>&1) || {
  echo "   Error: Failed to fetch project info. Check your SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF."
  exit 1
}

PROJECT_NAME=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('name','unknown'))" 2>/dev/null || echo "unknown")
PROJECT_REGION=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('region','unknown'))" 2>/dev/null || echo "unknown")
PROJECT_STATUS=$(echo "$PROJECT_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")

echo "   Project: ${PROJECT_NAME}"
echo "   Region:  ${PROJECT_REGION}"
echo "   Status:  ${PROJECT_STATUS}"
echo ""

# --- Step 2: Check PITR status via database backups endpoint ---
echo "2. Checking backup/PITR configuration..."
BACKUP_JSON=$(curl -sf \
  -H "$AUTH_HEADER" \
  "${API_BASE}/projects/${SUPABASE_PROJECT_REF}/database/backups" 2>&1) || {
  echo "   Error: Failed to fetch backup info."
  exit 1
}

PITR_ENABLED=$(echo "$BACKUP_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
pitr = data.get('pitr_enabled', data.get('physicalBackupData', {}).get('pitrEnabled', False))
print(str(pitr).lower())
" 2>/dev/null || echo "unknown")

echo "   PITR enabled: ${PITR_ENABLED}"

if [ "$PITR_ENABLED" = "true" ]; then
  echo "   ✓ Point-in-Time Recovery is ENABLED"

  # Extract PITR details if available
  EARLIEST_RESTORE=$(echo "$BACKUP_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
phys = data.get('physicalBackupData', {})
print(phys.get('earliestPhysicalBackupDateUnix', 'N/A'))
" 2>/dev/null || echo "N/A")

  if [ "$EARLIEST_RESTORE" != "N/A" ] && [ "$EARLIEST_RESTORE" != "None" ]; then
    EARLIEST_DATE=$(python3 -c "import datetime; print(datetime.datetime.fromtimestamp(int('${EARLIEST_RESTORE}')).isoformat())" 2>/dev/null || echo "$EARLIEST_RESTORE")
    echo "   Earliest restore point: ${EARLIEST_DATE}"
  fi
else
  echo "   ✗ Point-in-Time Recovery is NOT enabled"
  echo ""
  echo "   To enable PITR:"
  echo "   1. Go to https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/settings/addons"
  echo "   2. Enable the PITR add-on (requires Pro plan or higher)"
  echo "   3. Re-run this script to confirm"
fi

echo ""

# --- Step 3: List recent backups ---
echo "3. Recent backups:"
echo "$BACKUP_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
backups = data.get('backups', [])
if not backups:
    print('   No backup records found.')
else:
    for b in backups[:5]:
        status = b.get('status', 'unknown')
        inserted = b.get('inserted_at', 'unknown')
        print(f'   - {inserted} (status: {status})')
" 2>/dev/null || echo "   Could not parse backup list."

echo ""
echo "=== Verification complete ==="
echo ""
echo "Next steps:"
echo "  - If PITR is not enabled, follow the instructions above"
echo "  - Test a restore with: bash infra/scripts/test-restore.sh"
echo "  - Document results in the DR runbook: docs/runbooks/disaster-recovery.md"
