# Web Frontend — apps/web/

## Overview

Next.js 14 web app using the App Router. This is the primary web interface for PetForce.

## Tech

- **Framework:** Next.js 14 (App Router)
- **UI:** Tamagui components from `@petforce/ui`
- **Data fetching:** tRPC client via `@trpc/react-query`
- **State:** React Query (via tRPC) for server state
- **Types/validation:** Consumed from `@petforce/core`

## Commands

```bash
pnpm dev --filter=web   # Start dev server on :3000
pnpm build --filter=web # Production build
pnpm lint --filter=web  # Lint
```

## File Structure

```
src/
├── app/              # App Router pages and layouts
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── providers.tsx # Client-side providers (tRPC, React Query)
├── lib/
│   └── trpc.ts       # tRPC client setup
└── components/       # Web-specific components (not shared)
```

## Conventions

- **Pages** go in `src/app/` following Next.js App Router conventions
- **Shared components** come from `@petforce/ui` — don't duplicate them here
- **Web-only components** go in `src/components/`
- **Data fetching:** Use tRPC hooks (`trpc.household.list.useQuery()`)
- **Server Components** are the default; add `"use client"` only when needed
- **Styling:** Use Tamagui's styled() API for consistency with mobile

## tRPC Usage

```tsx
import { trpc } from "@/lib/trpc";

// In a client component:
const { data } = trpc.household.list.useQuery();
```

## Dependencies

- `@petforce/ui` — shared component library
- `@petforce/core` — shared types and validation
- API server must be running on :3001 for tRPC calls
