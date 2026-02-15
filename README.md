# PetForce

A household-centric pet CRM. Think Salesforce, but for your pets. Families, roommates, and pet sitters collaborate in shared **Households** to manage pet care, health tracking, feeding schedules, finances, and more — all from a single dashboard.

## Features

| Feature | What it does |
|---------|-------------|
| **Households** | Shared spaces with role-based access (Owner, Admin, Member, Sitter) |
| **Pet Profiles** | Detailed records — breed, weight, medical info, microchip, photo uploads |
| **Health Tracking** | Vet visits, vaccinations (with overdue alerts), and medications |
| **Feeding Schedules** | Daily feeding plans with completion tracking per pet |
| **Calendar** | Unified view of activities, feedings, health appointments, birthdays, and 150+ pet holidays |
| **Finance** | Expense tracking by category and pet, merged with health record costs, monthly analytics |
| **Activity Timeline** | Log walks, play sessions, grooming, and other activities |
| **Household Theming** | Custom colors and avatars per household |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 14 (App Router) |
| Mobile | Expo SDK 51 (React Native) |
| UI | Tamagui (cross-platform) |
| API | Hono + tRPC v10 |
| Database | Drizzle ORM + PostgreSQL (Supabase) |
| Auth | Clerk |
| Storage | Supabase Storage (pet photos) |
| Validation | Zod |

## Quick Start

### Prerequisites

- Node.js >= 20
- pnpm 9.x (`npm install -g pnpm`)
- PostgreSQL database (or a [Supabase](https://supabase.com) project)
- [Clerk](https://clerk.com) account (for authentication)

### Setup

```bash
# Clone and install
git clone https://github.com/betforce1211-gif/PetForce-Opus.git
cd PetForce-Opus
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — fill in DATABASE_URL, Clerk keys, Supabase keys

# Push database schema
pnpm --filter=@petforce/db db:push

# Start everything
pnpm dev
```

### Services

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001 |
| Mobile | Expo Go (port 8081) |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `API_PORT` | API server port (default: 3001) |
| `NEXT_PUBLIC_API_URL` | API URL for the web app |

See `.env.example` for the full template.

## Project Structure

```
apps/
  web/          Next.js web app
  mobile/       Expo React Native app
  api/          Hono + tRPC API server

packages/
  ui/           Shared Tamagui component library
  core/         Shared types, Zod schemas, constants
  db/           Drizzle ORM schema + PostgreSQL client
  config/       Shared TypeScript + ESLint configs

docs/           Documentation
tests/          E2E and integration tests
infra/          Docker, CI/CD, deployment configs
```

## Commands

```bash
pnpm dev                        # Start all apps
pnpm dev --filter=@petforce/web # Start web only
pnpm dev --filter=api           # Start API only
pnpm build                      # Build everything
pnpm lint                       # Lint everything
pnpm format                     # Format with Prettier
```

## Documentation

- [User Guide](docs/user-guide/README.md) — how to use PetForce
- [Developer Setup](docs/dev/setup.md) — environment setup for contributors
- [Architecture](CLAUDE.md) — system architecture and conventions

## License

Private — not open source.
