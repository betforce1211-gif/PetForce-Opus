[Developer]

# Developer Setup Guide

## Prerequisites

- Node.js >= 20
- pnpm 9.x (`npm install -g pnpm`)
- PostgreSQL (or use Docker via `infra/docker/docker-compose.yml`)

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/betforce1211-gif/PetForce-Opus.git
cd PetForce-Opus

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your database URL and Clerk keys

# 4. Push database schema
pnpm --filter=@petforce/db db:push

# 5. Start all apps
pnpm dev
```

## Services

| App | URL | Port |
|-----|-----|------|
| Web | http://localhost:3000 | 3000 |
| API | http://localhost:3001 | 3001 |
| Mobile | Expo Go app | 8081 |

## Running E2E Tests

E2E tests use Playwright and require a running dev server plus test credentials.

### 1. Set up test credentials

```bash
cp tests/.env.example tests/.env
```

Edit `tests/.env` with real Clerk test user credentials:
- **TEST_USER_EMAIL**: Must have `+clerk_test` suffix (e.g., `yourname+clerk_test@gmail.com`)
- **TEST_USER_PASSWORD**: The password for the test user
- **CLERK_TEST_CODE**: Always `424242` in Clerk test mode

Create the test user in your Clerk dashboard if it doesn't exist yet.

### 2. Install Playwright browsers

```bash
npx playwright install
```

### 3. Run the tests

```bash
# Start the dev server first
pnpm dev

# In another terminal, run E2E tests
pnpm test:e2e

# Run a specific test file
pnpm test:e2e -- --grep "feeding"

# Run with visible browser
pnpm test:e2e -- --headed
```

Tests take ~8 minutes with 2 parallel workers.

## Multi-Agent Development

See [multi-agent.md](./multi-agent.md) for the worktree-based multi-agent workflow.
