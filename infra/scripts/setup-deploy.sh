#!/usr/bin/env bash
# Sets up the full deployment pipeline: GitHub secrets, Railway env vars, Vercel project.
# Run once after cloning, or whenever secrets change.
#
# Prerequisites:
#   - gh CLI authenticated (gh auth login)
#   - railway CLI authenticated (railway login)
#   - vercel CLI authenticated (npx vercel login)
#   - ~/.config/petforce/.env.local populated with real credentials
#   - ~/.config/petforce/tests.env populated with test credentials
#
# Usage: bash infra/scripts/setup-deploy.sh

set -euo pipefail

CONFIG_DIR="$HOME/.config/petforce"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }

# ── Preflight checks ──
echo "=== Deployment Setup ==="
echo ""

# Check local env files exist
[ -f "$CONFIG_DIR/.env.local" ] || fail "$CONFIG_DIR/.env.local not found. Run: bash infra/scripts/setup-env.sh"
[ -f "$CONFIG_DIR/tests.env" ]  || fail "$CONFIG_DIR/tests.env not found. Run: bash infra/scripts/setup-env.sh"
ok "Local env files found"

# Check CLIs
command -v gh       >/dev/null 2>&1 || fail "GitHub CLI (gh) not installed"
command -v railway  >/dev/null 2>&1 || fail "Railway CLI not installed. Run: npm install -g @railway/cli"
command -v npx      >/dev/null 2>&1 || fail "npx not found"
ok "CLIs available (gh, railway, npx)"

# Check auth
gh auth status >/dev/null 2>&1 || fail "Not logged into GitHub. Run: gh auth login"
ok "GitHub CLI authenticated"

# Detect repo
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null) || fail "Not in a GitHub repo"
ok "GitHub repo: $REPO"

# ── Helper: read env value ──
env_val() {
  local file="$1" key="$2"
  grep "^${key}=" "$file" | head -1 | cut -d'=' -f2-
}

# ── 1. GitHub Secrets (from .env.local) ──
echo ""
echo "--- GitHub Secrets ---"

ENV_KEYS=(DATABASE_URL CLERK_SECRET_KEY CLERK_JWT_KEY NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY)
for key in "${ENV_KEYS[@]}"; do
  value=$(env_val "$CONFIG_DIR/.env.local" "$key")
  if [ -n "$value" ]; then
    gh secret set "$key" --body "$value" --repo "$REPO" 2>/dev/null
    ok "GitHub secret: $key"
  else
    warn "Skipped $key (not found in .env.local)"
  fi
done

# Test secrets (from tests.env)
TEST_KEYS=(TEST_USER_EMAIL TEST_USER_PASSWORD)
for key in "${TEST_KEYS[@]}"; do
  value=$(env_val "$CONFIG_DIR/tests.env" "$key")
  if [ -n "$value" ]; then
    gh secret set "$key" --body "$value" --repo "$REPO" 2>/dev/null
    ok "GitHub secret: $key"
  else
    warn "Skipped $key (not found in tests.env)"
  fi
done

# ── 2. Railway ──
echo ""
echo "--- Railway ---"

if railway status >/dev/null 2>&1; then
  ok "Railway project linked"

  # Set env vars on Railway service
  RAILWAY_KEYS=(DATABASE_URL CLERK_SECRET_KEY CLERK_JWT_KEY NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY)
  for key in "${RAILWAY_KEYS[@]}"; do
    value=$(env_val "$CONFIG_DIR/.env.local" "$key")
    if [ -n "$value" ]; then
      railway variables set "${key}=${value}" >/dev/null 2>&1
      ok "Railway var: $key"
    else
      warn "Skipped $key (not found in .env.local)"
    fi
  done
  railway variables set "API_PORT=3001" "NODE_ENV=production" >/dev/null 2>&1
  ok "Railway var: API_PORT=3001"
  ok "Railway var: NODE_ENV=production"

  # Set Railway token as GitHub secret
  echo ""
  echo "  To set RAILWAY_TOKEN as a GitHub secret:"
  echo "  1. Go to your Railway project → Settings → Tokens"
  echo "  2. Create a project token"
  echo "  3. Run: gh secret set RAILWAY_TOKEN --body <token> --repo $REPO"
  # Check if already set
  if gh secret list --repo "$REPO" 2>/dev/null | grep -q RAILWAY_TOKEN; then
    ok "GitHub secret: RAILWAY_TOKEN (already set)"
  else
    warn "GitHub secret: RAILWAY_TOKEN (not set — see instructions above)"
  fi
else
  warn "Railway not linked. Run: railway init && railway add --service petforce-api && railway service link petforce-api"
fi

# ── 3. Vercel ──
echo ""
echo "--- Vercel ---"

VERCEL_DIR="$REPO_ROOT/apps/web/.vercel"
if [ -f "$VERCEL_DIR/project.json" ]; then
  ORG_ID=$(grep -o '"orgId":"[^"]*"' "$VERCEL_DIR/project.json" | cut -d'"' -f4)
  PROJECT_ID=$(grep -o '"projectId":"[^"]*"' "$VERCEL_DIR/project.json" | cut -d'"' -f4)

  if [ -n "$ORG_ID" ] && [ -n "$PROJECT_ID" ]; then
    gh secret set VERCEL_ORG_ID --body "$ORG_ID" --repo "$REPO" 2>/dev/null
    ok "GitHub secret: VERCEL_ORG_ID"
    gh secret set VERCEL_PROJECT_ID --body "$PROJECT_ID" --repo "$REPO" 2>/dev/null
    ok "GitHub secret: VERCEL_PROJECT_ID"
  fi
else
  warn "Vercel not linked. Run: cd apps/web && npx vercel link --yes"
fi

# Check Vercel token
if gh secret list --repo "$REPO" 2>/dev/null | grep -q VERCEL_TOKEN; then
  ok "GitHub secret: VERCEL_TOKEN (already set)"
else
  echo ""
  echo "  To set VERCEL_TOKEN as a GitHub secret:"
  echo "  1. Go to vercel.com → Account Settings → Tokens"
  echo "  2. Create a token"
  echo "  3. Run: gh secret set VERCEL_TOKEN --body <token> --repo $REPO"
  warn "GitHub secret: VERCEL_TOKEN (not set — see instructions above)"
fi

# ── Summary ──
echo ""
echo "=== Summary ==="
echo ""
echo "GitHub secrets:"
gh secret list --repo "$REPO" 2>/dev/null | while read -r name rest; do
  ok "$name"
done

echo ""
echo "Done. To deploy, push to main or create a PR for preview deployments."
