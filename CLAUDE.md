# PetForce — Architecture Guide

## What is PetForce?

PetForce is a household-centric pet CRM. Think Salesforce, but for pets. The core concept is the **Household** — a shared space where family members, sitters, and others collaborate on pet care.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 14 (App Router) |
| Mobile | Expo SDK 51+ (React Native) |
| Cross-platform UI | Tamagui |
| API | tRPC + Hono |
| Database | Drizzle ORM + PostgreSQL (Supabase) |
| Auth | Clerk |
| Validation | Zod |

## Monorepo Structure

```
apps/web/        → Next.js web app (:3000)
apps/mobile/     → Expo React Native app
apps/api/        → Hono + tRPC API server (:3001)
packages/ui/     → Shared Tamagui component library
packages/core/   → Shared types, Zod schemas, business logic
packages/db/     → Drizzle schema + PostgreSQL client
packages/config/ → Shared TypeScript + ESLint configs
docs/            → User guides, config guides, API docs, runbooks
tests/           → E2E tests, integration tests, fixtures, helpers
infra/           → Docker, CI/CD, deployment configs, scripts
.github/         → GitHub Actions workflows
```

## Core Domain Model

```
Household (theme, name, avatar)
  ├── Members (role: owner | admin | member | sitter)
  ├── Pets (species, breed, name, medical info)
  ├── Activities (walks, feedings, vet visits, medications)
  └── Settings (theme colors, notifications, permissions)
```

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start all apps in parallel
pnpm build            # Build all packages and apps
pnpm lint             # Lint entire monorepo
pnpm dev --filter=web # Start only the web app
pnpm dev --filter=api # Start only the API
```

## Multi-Agent Team

This project uses 9 specialized Claude Code agents, each in its own git worktree:

| Agent | Worktree | Branch | Owns |
|-------|----------|--------|------|
| **Architect** | `~/PetForce Opus4.6/` | `main` | Architecture, schema design, cross-cutting concerns |
| **Backend** | `~/petforce-backend/` | `agent/backend` | tRPC routers, Drizzle schema, API middleware |
| **Web Frontend** | `~/petforce-web/` | `agent/web` | Next.js pages, layouts, web-specific hooks |
| **Mobile** | `~/petforce-mobile/` | `agent/mobile` | Expo screens, native navigation, push notifications |
| **Design System** | `~/petforce-design-system/` | `agent/design-system` | Tamagui components, theming, household customization |
| **Core/Shared** | `~/petforce-core/` | `agent/core` | Types, Zod schemas, shared business logic |
| **Documentation** | `~/petforce-docs/` | `agent/docs` | User guides, config guides, API docs, runbooks |
| **QA/Testing** | `~/petforce-tests/` | `agent/tests` | E2E tests, integration tests, coverage, test utilities |
| **DevOps/Infra** | `~/petforce-infra/` | `agent/infra` | CI/CD, Docker, deployments, monitoring, scripts |

## Conventions

- **Package naming:** `@petforce/<name>` (e.g., `@petforce/core`)
- **Imports:** Use workspace protocol (`workspace:*`) for internal deps
- **Types:** Define in `@petforce/core`, consume everywhere
- **Validation:** Zod schemas in `@petforce/core`, used by both frontend and backend
- **Theming:** Each Household has `primaryColor`, `secondaryColor`, and `avatar`
- **Database:** All schema changes go through `packages/db/`, use `drizzle-kit` for migrations
- **API:** All endpoints are tRPC procedures in `apps/api/src/routers/`

## Environment Variables

See `.env.example` for required variables. Never commit `.env` files.
