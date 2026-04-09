# Shared Config — packages/config/

## Overview

Shared TypeScript and ESLint configurations for the PetForce monorepo.

## Impact Scope

Changes here affect the build pipeline of ALL packages and apps. A broken config means nothing compiles.

## What's in Here

- `tsconfig.base.json` — Base TypeScript configuration extended by all packages
- ESLint configs — Shared linting rules for the monorepo
- Shared compiler options — Module resolution, target, strict mode settings

## Before Making Changes

1. Understand the blast radius — every package and app inherits from these configs
2. After any edit, run `pnpm build` from the monorepo root — verify zero regressions across all packages
3. Test that `pnpm lint` still passes across the monorepo

## Coordinate With

- **Architect** — for TypeScript target or module changes
- **DevOps** — for CI pipeline impact (build times, compatibility)
- **All agents** — config changes affect everyone's development experience

## Conventions

See root `CLAUDE.md` → Conventions section for monorepo-wide patterns.
