<!-- owner: architect -->

# Multi-Agent Workflow

[Developer]

PetForce uses 9 specialized Claude Code agents, each working in its own git worktree. This guide explains how the team is organized, how agents coordinate, and how to work with the system.

---

## Agent Roster

| Agent | Worktree | Branch | Scope |
|-------|----------|--------|-------|
| **Architect** | `~/PetForce Opus4.6/` | `main` | Architecture, schema design, cross-cutting concerns |
| **Backend** | `~/petforce-backend/` | `agent/backend` | tRPC routers, Drizzle schema, API middleware |
| **Web Frontend** | `~/petforce-web/` | `agent/web` | Next.js pages, layouts, web-specific hooks |
| **Mobile** | `~/petforce-mobile/` | `agent/mobile` | Expo screens, native navigation, push notifications |
| **Design System** | `~/petforce-design-system/` | `agent/design-system` | Tamagui components, theming, household customization |
| **Core/Shared** | `~/petforce-core/` | `agent/core` | Types, Zod schemas, shared business logic |
| **Documentation** | `~/petforce-docs/` | `agent/docs` | User guides, config guides, API docs, runbooks |
| **QA/Testing** | `~/petforce-tests/` | `agent/tests` | E2E tests, integration tests, coverage, test utilities |
| **DevOps/Infra** | `~/petforce-infra/` | `agent/infra` | CI/CD, Docker, deployments, monitoring, scripts |

---

## How Worktrees Work

Each agent has its own checkout of the repo (a git worktree), pointed at a dedicated branch. This means:

- Agents can work in parallel without merge conflicts
- Each agent sees the full repo but commits only to their branch
- Changes flow through PRs to `main`

### Creating a worktree

```bash
git worktree add ~/petforce-backend agent/backend
```

### Listing worktrees

```bash
git worktree list
```

### Removing a worktree

```bash
git worktree remove ~/petforce-backend
```

---

## Ownership Rules

Each agent owns specific directories and should only modify files within their scope:

| Agent | Primary directories |
|-------|-------------------|
| Backend | `apps/api/` |
| Web | `apps/web/` |
| Mobile | `apps/mobile/` |
| Design System | `packages/ui/` |
| Core | `packages/core/` |
| Documentation | `docs/` |
| QA/Testing | `tests/` |
| DevOps | `infra/`, `.github/` |
| Architect | `CLAUDE.md`, `packages/db/`, cross-cutting |

### Shared files

Some files are touched by multiple agents. Coordinate before modifying:

- `packages/db/src/schema.ts` — Backend + Architect
- `packages/core/src/schemas.ts` — Core + Backend
- `package.json` (root) — DevOps
- `.github/workflows/` — DevOps
- `CLAUDE.md` (root) — Architect

---

## Coordination Patterns

### Adding a new feature (end-to-end)

A typical feature touches multiple agents in sequence:

1. **Core** defines the Zod schemas and TypeScript types
2. **Backend** adds the Drizzle schema migration and tRPC router
3. **Design System** builds the UI components
4. **Web** integrates the components with tRPC hooks
5. **Mobile** builds the native screen
6. **QA** writes E2E tests
7. **Docs** updates user guide and API reference

### Schema changes

1. **Core** agent defines the Zod validation schema in `packages/core/src/schemas.ts`
2. **Backend** agent (or Architect) adds the Drizzle table in `packages/db/src/schema.ts`
3. **Backend** generates and runs the migration: `npx drizzle-kit generate` then `npx drizzle-kit push`
4. **Backend** creates the tRPC router procedures

### API changes

When the Backend agent adds or modifies an API endpoint:
1. Backend creates/modifies the router in `apps/api/src/routers/`
2. QA writes tests in `tests/e2e/`
3. Docs updates `docs/api/README.md`

---

## Environment Setup

All agents share the same environment credentials via symlinks:

```bash
# One-time: fill in credentials at ~/.config/petforce/
~/.config/petforce/.env.local    # Clerk, Supabase, DB
~/.config/petforce/tests.env     # Test user credentials

# Per worktree: run the setup script
bash infra/scripts/setup-env.sh
```

This creates symlinks so all worktrees read the same credentials. See [Configuration Guide](../config/README.md) for the full variable reference.

---

## Branch Strategy

```
main
  ├── agent/backend
  ├── agent/web
  ├── agent/mobile
  ├── agent/design-system
  ├── agent/core
  ├── agent/docs
  ├── agent/tests
  └── agent/infra
```

- Each agent works on their branch
- PRs merge into `main`
- Agents rebase on `main` before starting new work: `git pull --rebase origin main`
- Conflicts are resolved by the agent whose files are affected

---

## Communication

Agents coordinate through:

1. **CLAUDE.md files** — each directory has a CLAUDE.md describing ownership and conventions
2. **PR descriptions** — describe what changed and which other agents need to take action
3. **`.context/` directory** — gitignored workspace for sharing notes between agents
4. **Schema files** — `packages/core/src/schemas.ts` is the contract between frontend and backend

---

## Running the Full Stack

Any agent can start the full stack for testing:

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start web (3000) + API (3001) in parallel
pnpm dev --filter=web # Start only the web app
pnpm dev --filter=api # Start only the API
```

### Running tests

```bash
cd tests
npx playwright test                    # All E2E tests
npx playwright test feeding.test.ts    # Single file
npx playwright test --project=authenticated  # One project
```
