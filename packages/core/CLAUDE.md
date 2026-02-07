# Core/Shared — packages/core/

## Overview

Shared TypeScript types, Zod validation schemas, and business logic constants. This package is consumed by every other package and app in the monorepo.

## Tech

- **Validation:** Zod
- **Language:** TypeScript (strict mode)

## Commands

```bash
pnpm build --filter=@petforce/core
pnpm lint --filter=@petforce/core
```

## File Structure

```
src/
├── index.ts       # Public barrel export
├── types.ts       # TypeScript interfaces and type aliases
├── schemas.ts     # Zod validation schemas
└── constants.ts   # Shared constants, labels, defaults
```

## Conventions

- **Types** are plain TypeScript interfaces in `types.ts`
- **Schemas** are Zod objects in `schemas.ts` — used for both frontend validation and tRPC input
- **Constants** are readonly values in `constants.ts` (labels, defaults, enums-as-arrays)
- **No runtime dependencies** besides Zod — keep this package lightweight
- **Export everything** from `index.ts` — consumers import from `@petforce/core`

## Domain Types

- `Household` — the central organizing unit (name, theme, timestamps)
- `Member` — a user's membership in a household (role-based: owner/admin/member/sitter)
- `Pet` — a pet belonging to a household (species, breed, medical info)
- `Activity` — an action related to a pet (walk, feeding, vet visit, medication)

## Validation Schema Naming

- `create<Entity>Schema` — for creating new records
- `update<Entity>Schema` — for partial updates (`.partial()`)
- Field-level schemas use descriptive names

## Consumers

- `@petforce/api` — uses schemas for tRPC input validation
- `@petforce/web` — uses types for UI + schemas for form validation
- `@petforce/mobile` — uses types for UI + schemas for form validation
- `@petforce/db` — references types for schema alignment
