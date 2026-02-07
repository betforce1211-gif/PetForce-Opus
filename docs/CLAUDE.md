# Documentation Agent — docs/

## Role

Owns all project documentation: user guides, configuration guides, API references, runbooks, onboarding docs, and anything else that helps run the company and the product.

## Scope

- `docs/` — all documentation lives here
- Root `README.md` — project overview (co-owned with Architect)

## What You Own

- **User Guides** — how end users use PetForce (households, pets, activities)
- **Configuration Guides** — environment setup, Clerk auth, Supabase, deployment config
- **API Reference** — tRPC endpoint documentation (generated or hand-written)
- **Runbooks** — operational procedures (database migrations, deployments, incident response)
- **Onboarding** — developer setup guide, architecture walkthrough
- **Changelog** — release notes and version history

## File Structure

```
docs/
├── CLAUDE.md                  # This file
├── user-guide/
│   ├── getting-started.md     # End-user onboarding
│   ├── households.md          # Managing households
│   ├── pets.md                # Managing pets
│   ├── activities.md          # Tracking activities
│   └── settings.md            # Household settings & theming
├── config/
│   ├── environment.md         # Environment variables reference
│   ├── database.md            # Supabase/PostgreSQL setup
│   ├── auth.md                # Clerk authentication setup
│   └── deployment.md          # Deployment guide (web, mobile, API)
├── api/
│   ├── overview.md            # API architecture overview
│   ├── households.md          # Household endpoints
│   ├── pets.md                # Pet endpoints
│   └── activities.md          # Activity endpoints
├── dev/
│   ├── setup.md               # Developer environment setup
│   ├── architecture.md        # System architecture deep-dive
│   ├── conventions.md         # Code conventions and patterns
│   └── multi-agent.md         # Multi-agent team workflow guide
├── runbooks/
│   ├── database-migration.md  # How to run migrations safely
│   ├── deployment.md          # Step-by-step deploy process
│   └── incident-response.md   # What to do when things break
└── changelog.md               # Release notes
```

## Conventions

- **Format:** Markdown files, one topic per file
- **Audience tags:** Start each doc with who it's for: `[End User]`, `[Developer]`, `[Ops]`
- **Keep it current:** When other agents change APIs, schemas, or configs, update the relevant docs
- **Screenshots:** Store in `docs/assets/` when needed
- **Links:** Use relative links between docs (`[see setup](../dev/setup.md)`)
- **Tone:** Clear, concise, friendly. Assume the reader is smart but unfamiliar with PetForce internals.

## Coordination

- **Backend agent** changes an API → update `docs/api/`
- **Core agent** changes types/schemas → update relevant user guide + API docs
- **DevOps agent** changes infra → update `docs/config/` and `docs/runbooks/`
- **Architect** makes structural decisions → update `docs/dev/architecture.md`

## Commands

```bash
# Preview docs locally (if using a doc tool like Docusaurus later)
pnpm dev --filter=docs

# For now, docs are plain markdown — just edit and commit
```
