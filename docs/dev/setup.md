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
cp .env.example .env
# Edit .env with your database URL and Clerk keys

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

## Multi-Agent Development

See [multi-agent.md](./multi-agent.md) for the worktree-based multi-agent workflow.
