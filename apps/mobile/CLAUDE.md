# Mobile App — apps/mobile/

## Overview

Expo React Native app (iOS + Android) using Expo Router for file-based navigation.

## Tech

- **Framework:** Expo SDK 51+ (managed workflow)
- **Navigation:** Expo Router (file-based)
- **UI:** Tamagui components from `@petforce/ui`
- **Data fetching:** tRPC client via `@trpc/react-query`
- **Types/validation:** Consumed from `@petforce/core`

## Commands

```bash
pnpm dev --filter=mobile  # Start Expo dev server
```

Builds are handled via EAS (Expo Application Services).

## File Structure

```
src/
├── app/              # Expo Router screens
│   ├── _layout.tsx   # Root layout with navigation + TamaguiProvider
│   └── index.tsx     # Home screen
├── lib/              # Mobile-specific utilities
└── components/       # Mobile-specific components
```

## Conventions

- **Screens** go in `src/app/` following Expo Router conventions
- **Shared components** come from `@petforce/ui` — don't duplicate them here
- **Mobile-only components** go in `src/components/`
- **Navigation:** Use Expo Router's `<Stack>`, `<Tabs>`, and `<Link>`
- **Styling:** Use Tamagui — it renders to native views, not web divs
- **Push notifications:** Handle in this app, not in shared packages
- Always wrap the app in `<TamaguiProvider>` in the root layout

## Dependencies

- `@petforce/ui` — shared component library
- `@petforce/core` — shared types and validation
- API server must be running for tRPC calls (use device IP in development)
