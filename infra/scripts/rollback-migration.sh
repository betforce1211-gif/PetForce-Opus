#!/usr/bin/env bash
#
# rollback-migration.sh — Roll back a specific Drizzle migration
#
# Usage:
#   ./infra/scripts/rollback-migration.sh <migration-number>
#   ./infra/scripts/rollback-migration.sh 0008
#   ./infra/scripts/rollback-migration.sh 0003 --dry-run
#
# Options:
#   --dry-run   Print the SQL that would be executed without running it
#
# The script finds the corresponding .rollback.sql file in packages/db/drizzle/
# and executes it against the database specified by DATABASE_URL.
#
# Environment:
#   DATABASE_URL  — Required. PostgreSQL connection string.
#                   Loaded automatically from .env.local if present.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DRIZZLE_DIR="$REPO_ROOT/packages/db/drizzle"

# ── Load DATABASE_URL from .env.local if not already set ──────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="$REPO_ROOT/.env.local"
  if [[ -f "$ENV_FILE" ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d'=' -f2-)"
    export DATABASE_URL
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set and could not be loaded from .env.local" >&2
  exit 1
fi

# ── Parse arguments ───────────────────────────────────────────────────────────
DRY_RUN=false
MIGRATION_NUM=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *)
      if [[ -z "$MIGRATION_NUM" ]]; then
        MIGRATION_NUM="$arg"
      else
        echo "ERROR: Unexpected argument: $arg" >&2
        echo "Usage: rollback-migration.sh <migration-number> [--dry-run]" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$MIGRATION_NUM" ]]; then
  echo "Usage: rollback-migration.sh <migration-number> [--dry-run]" >&2
  echo "" >&2
  echo "Available rollback files:" >&2
  for f in "$DRIZZLE_DIR"/*.rollback.sql; do
    [[ -f "$f" ]] && echo "  $(basename "$f" .rollback.sql)" >&2
  done
  exit 1
fi

# ── Zero-pad to 4 digits ─────────────────────────────────────────────────────
MIGRATION_NUM=$(printf "%04d" "$((10#$MIGRATION_NUM))")

# ── Find the rollback file ───────────────────────────────────────────────────
ROLLBACK_FILE=$(find "$DRIZZLE_DIR" -maxdepth 1 -name "${MIGRATION_NUM}_*.rollback.sql" | head -1)

if [[ -z "$ROLLBACK_FILE" || ! -f "$ROLLBACK_FILE" ]]; then
  echo "ERROR: No rollback file found for migration $MIGRATION_NUM" >&2
  echo "Expected pattern: ${DRIZZLE_DIR}/${MIGRATION_NUM}_*.rollback.sql" >&2
  exit 1
fi

echo "Migration rollback: $(basename "$ROLLBACK_FILE")"
echo "──────────────────────────────────────────────"

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY RUN] SQL that would be executed:"
  echo ""
  cat "$ROLLBACK_FILE"
  echo ""
  echo "[DRY RUN] No changes made."
  exit 0
fi

# ── Confirm before executing ─────────────────────────────────────────────────
echo "WARNING: This will execute rollback SQL against your database."
echo "File: $ROLLBACK_FILE"
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# ── Execute the rollback ─────────────────────────────────────────────────────
echo ""
echo "Executing rollback..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROLLBACK_FILE"
RESULT=$?

if [[ $RESULT -eq 0 ]]; then
  echo ""
  echo "Rollback completed successfully."
  echo ""
  echo "IMPORTANT: After rollback, you should also remove the migration entry"
  echo "from the Drizzle journal if you want drizzle-kit to re-apply it later:"
  echo "  packages/db/drizzle/meta/_journal.json"
else
  echo ""
  echo "ERROR: Rollback failed with exit code $RESULT" >&2
  exit $RESULT
fi
