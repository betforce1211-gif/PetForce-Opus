# PetForce — Architecture Guide

## What is PetForce?

PetForce is a household-centric pet CRM. Think Salesforce, but for pets. The core concept is the **Household** — a shared space where family members, sitters, and others collaborate on pet care.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 16 (App Router) |
| Mobile | Expo SDK 55 (React Native) |
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

## Product Development Principles

Every team member must read `docs/dev/product-principles.md` before writing any code. These 14 principles are non-negotiable and define how we build PetForce:

1. **The Household is the Product** — multi-player coordination, not solo pet tracking
2. **Capture the Moment** — sub-3-second logging or people will not use it
3. **Run the App from the Lock Screen** — actionable notifications, no app-open required
4. **Data In, Insight Out** — every data point serves a future insight
5. **Architect for a Billion Users** — partitioned tables, read replicas, horizontal-ready
6. **Trust the Schema, Ship the Feature** — schema is sacred, UI iterates fast
7. **Zero Trust Security** — verify household membership on every API call, no exceptions
8. **Document Everything** — docs are deliverables, PRs without docs are incomplete
9. **Test Like the Customer Depends on It** — unit + E2E on every PR, no database mocks
10. **Reliability is the Product** — offline-first, multi-region, automated failover
11. **GitHub is the Source of Truth** — no PR = did not happen
12. **Earn the Right to Complexity** — phases in order, no skipping
13. **Multi-Platform Parity** — web and mobile match every sprint
14. **Build for the Household That Grows** — 1 pet to 10, 1 member to grandma

If a feature violates any of these, it does not ship.

## Conventions

- **Package naming:** `@petforce/<name>` (e.g., `@petforce/core`)
- **Imports:** Use workspace protocol (`workspace:*`) for internal deps
- **Types:** Define in `@petforce/core`, consume everywhere
- **Validation:** Zod schemas in `@petforce/core`, used by both frontend and backend
- **Theming:** Each Household has `primaryColor`, `secondaryColor`, and `avatar`
- **Database:** All schema changes go through `packages/db/`, use `drizzle-kit` for migrations
- **API:** All endpoints are tRPC procedures in `apps/api/src/routers/`
- **PRs:** Always include `Closes #<issue>` in the PR description when working on a tracked issue. This auto-closes the issue on merge.
- **PR size:** Keep PRs under 400 lines of diff when possible. Larger changes should be split into stacked PRs.
- **PR template:** Fill out all sections — type of change, breaking changes, docs, screenshots (for UI changes), and test plan.
- **Breaking changes:** If a PR changes API contracts, DB schema, or shared types in `@petforce/core`, list affected packages and agents in the "Breaking changes" section.
- **Screenshots:** UI changes must include before/after screenshots or a recording in the PR.
- **Docs with PRs:** New features and enhancements must include documentation updates (API docs, user guide, or dev docs as appropriate). Note what was updated in the PR's Documentation section.
- **Branch protection:** `main` requires passing `lint-and-build` and `unit-tests` CI checks, 1 approving review, and stale reviews are dismissed on new pushes.
- **Code owners:** `.github/CODEOWNERS` auto-requests reviewers based on changed paths.

## Agent Tooling

### Installed
- **gstack** — .claude/skills/gstack — role-based workflow skills for Claude Code
- **Paperclip** — http://localhost:3100 — task orchestration, issue tracking, agent governance
- **petforce-guardrails** — .claude/skills/petforce-guardrails — auto-loads, read before touching packages/

### gstack (`.claude/skills/gstack`)
Available skills: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, `/learn`, `/paperclip`

Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

- **`/freeze` and `/guard` are mandatory** before any edit to `packages/db` or `packages/core`. Drizzle schema is the most dangerous surface — it's shared across all apps.
- `/investigate` auto-freezes to the module being debugged.
- If gstack skills aren't working, run: `cd .claude/skills/gstack && ./setup`

### Workflow for every feature
1. `/office-hours` — validate the idea before writing any code
2. `/plan-ceo-review` — product scope and priority check
3. `/plan-eng-review` — architecture review, identify shared package impact
4. Implement in a dedicated Conductor worktree
5. `/review` — code review
6. `/qa` — browser and integration testing
7. `/ship` — deploy via Railway

### Hard rules
- `/guard` is mandatory before ANY edit to `packages/db` or `packages/core`
- Never run `db:migrate` without first reading the generated SQL diff
- One Conductor session per app or package boundary — use Claude Peers if sessions need to coordinate
- Check Paperclip for open issues before starting new work

### Paperclip
Paperclip is the orchestration layer. Check it for task assignments before starting new work. Roles configured: CEO, CTO, Frontend Engineer, Mobile Engineer, QA, Doc Engineer. Approval gates on `packages/db/schema`, `packages/core`, and `infra/` changes.

### PetForce Guardrails (`.claude/skills/petforce-guardrails`)
Auto-loaded safety rules for protected surfaces, app boundaries, Drizzle migration rules, and Conductor workflow coordination. See `SKILL.md` for details.

## Deep-Dive Docs

This file is the map. For details, go deeper:

| Topic | Location |
|-------|----------|
| **Product principles (read first)** | `docs/dev/product-principles.md` |
| **Engineering standards** | `docs/dev/engineering-standards.md` |
| Architecture & domain model | `docs/dev/architecture.md` |
| Code conventions & patterns | `docs/dev/conventions.md` |
| Multi-agent workflow | `docs/dev/multi-agent.md` |
| Quality scores by domain | `docs/dev/quality-score.md` |
| Active execution plans | `docs/exec-plans/active/` |
| API reference (all 15 routers) | `docs/api/README.md` |
| Architecture Decision Records | `docs/adrs/README.md` |
| Design proposals (in-progress) | `docs/design/README.md` |
| Deployment topology | `docs/config/deployment.md` |
| Documentation index | `docs/README.md` |
| User guide | `docs/user-guide/README.md` |

## Scripts

| Script | What it does |
|--------|-------------|
| `infra/scripts/setup-env.sh` | Symlink env files from `~/.config/petforce/` |
| `infra/scripts/doc-gardener` | Scan for stale docs, missing test coverage |
| `infra/scripts/roadmap` | Push ideas to GitHub Issues |

## Environment Variables

All environment variables live in a single root `.env.local` file. Apps load it via `dotenv-cli` in their dev/build scripts. See `.env.example` for required variables. Never commit `.env` files.

Test-only credentials (email, password, OTP code) live in `tests/.env`.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Paperclip status, sync issues, "what's paperclip doing", audit drift → invoke paperclip
