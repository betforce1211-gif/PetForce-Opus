#!/usr/bin/env bash
# Symlinks env files from ~/.config/petforce/ into the current worktree.
# Run from any worktree root: bash infra/scripts/setup-env.sh

set -euo pipefail

# Skip in CI — env vars come from GitHub Actions secrets
if [ "${CI:-}" = "true" ]; then
  echo "CI detected, skipping env symlink setup"
  exit 0
fi

CONFIG_DIR="$HOME/.config/petforce"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Check that central config exists
if [ ! -d "$CONFIG_DIR" ]; then
  echo "Creating $CONFIG_DIR — fill in your credentials there."
  mkdir -p "$CONFIG_DIR"
  cp "$REPO_ROOT/.env.example" "$CONFIG_DIR/.env.local"
  cp "$REPO_ROOT/tests/.env.example" "$CONFIG_DIR/tests.env"
fi

if [ ! -f "$CONFIG_DIR/.env.local" ]; then
  echo "Error: $CONFIG_DIR/.env.local not found"
  exit 1
fi

if [ ! -f "$CONFIG_DIR/tests.env" ]; then
  echo "Error: $CONFIG_DIR/tests.env not found"
  exit 1
fi

# Symlink root .env.local
if [ -L "$REPO_ROOT/.env.local" ]; then
  echo ".env.local already symlinked"
elif [ -f "$REPO_ROOT/.env.local" ]; then
  echo "Warning: .env.local already exists as a regular file, skipping (remove it first to symlink)"
else
  ln -s "$CONFIG_DIR/.env.local" "$REPO_ROOT/.env.local"
  echo "Linked .env.local -> $CONFIG_DIR/.env.local"
fi

# Symlink tests/.env
if [ -L "$REPO_ROOT/tests/.env" ]; then
  echo "tests/.env already symlinked"
elif [ -f "$REPO_ROOT/tests/.env" ]; then
  echo "Warning: tests/.env already exists as a regular file, skipping (remove it first to symlink)"
else
  ln -s "$CONFIG_DIR/tests.env" "$REPO_ROOT/tests/.env"
  echo "Linked tests/.env -> $CONFIG_DIR/tests.env"
fi

echo "Done. Edit credentials at: $CONFIG_DIR/"
